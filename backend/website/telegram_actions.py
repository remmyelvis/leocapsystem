"""Receives the presses of the Decline and Delete buttons under the owner alert (owner_alert.py).

Telegram posts each press to /api/telegram/webhook. The address does nothing unless TELEGRAM_WEBHOOK_SECRET is set, refuses any
request that does not carry that secret, and acts only for the Telegram ids in TELEGRAM_ACTION_CHAT_ID, pressing in their own chat
with the bot. Every action takes two presses (the button, then "Yes"), nothing is stored between them (the application's id travels
in the button), and the rules are the admin screen's: a loan can be deleted only if it was never paid out, and declined only while
it is waiting for review.
"""
import hmac
import json
import logging
import os

from flask import Blueprint, jsonify, request

from website.application import delete_application_record, update_loan_status
from website.audit_logs import _record_audit_log
from website.extensions import db
from website.models import Applicant, Application, AuditAction
from website.owner_alert import action_chats, alert_keyboard, telegram_api

telegram_actions = Blueprint("telegram_actions", __name__, url_prefix="/api")

_ACTIONS = ("ask_dec", "ask_del", "do_dec", "do_del", "cancel")
_WAITING_FOR_REVIEW = ("pending_processing", "processing")
_NO_BUTTONS = {"inline_keyboard": []}


def _confirm_keyboard(verb, application_id):
    action = "do_dec" if verb == "decline" else "do_del"
    return {"inline_keyboard": [[{"text": f"Yes, {verb}", "callback_data": f"{action}:{application_id}"},
                                 {"text": "Cancel", "callback_data": f"cancel:{application_id}"}]]}


def _decline(app, who, person):
    """Decline a loan that is waiting for review: its status, the loan's own history and the system log in one commit."""
    if app.loan_status not in _WAITING_FOR_REVIEW:
        return f"Not declined: {who} is now '{app.loan_status}'. Open it in the portal."
    actor = f"owner via Telegram (chat {person})"
    _record_audit_log(
        AuditAction.UPDATE, f"Declined loan application {app.id[:8]} ({who}) from Telegram", entity_type="Application",
        entity_id=app.id, actor_id=f"telegram:{person}", actor_email=actor, actor_role="admin", new_values={"loan_status": "declined"})
    update_loan_status(app, "declined", actor, "admin", "Leocap Invest", notes="Declined from Telegram", commit=True)
    return f"✅ Declined: {who}."


def _handle(press):
    person = str((press.get("from") or {}).get("id", ""))
    message = press.get("message") or {}
    chat = str((message.get("chat") or {}).get("id", ""))
    action, _, application_id = (press.get("data") or "").partition(":")

    def answer(text, popup=False):
        telegram_api("answerCallbackQuery", callback_query_id=press.get("id", ""), text=text, show_alert="true" if popup else "false")

    def buttons(keyboard):
        telegram_api("editMessageReplyMarkup", chat_id=chat, message_id=message.get("message_id", ""), reply_markup=json.dumps(keyboard))

    if person not in action_chats() or chat != person:  # only an allowed person, in their own chat with the bot
        return answer("You are not allowed to do this.", popup=True)
    if action not in _ACTIONS or len(application_id) != 36:
        return answer("This button is not valid.")
    app = Application.query.get(application_id)
    if app is None:
        buttons(_NO_BUTTONS)
        return answer("That application no longer exists.", popup=True)
    borrower = Applicant.query.get(app.applicant_id)
    who = f"{borrower.name if borrower else 'the borrower'}, KES {float(app.amount_applied):,.0f}"

    if action == "cancel":
        buttons(alert_keyboard(application_id))
        return answer("Cancelled.")
    if action in ("ask_dec", "ask_del"):
        verb = "decline" if action == "ask_dec" else "delete"
        buttons(_confirm_keyboard(verb, application_id))
        return answer(f"{verb.capitalize()} {who}? Press Yes to confirm.")

    try:
        if action == "do_dec":
            result = _decline(app, who, person)
        else:
            body, status = delete_application_record(app, f"telegram:{person}", f"owner via Telegram (chat {person})", "admin")
            result = f"🗑 Deleted: {who}." if status == 200 else f"Not deleted: {body['error']}"
    except Exception:
        db.session.rollback()
        logging.exception("Telegram %s of application %s failed", action, application_id)
        buttons(alert_keyboard(application_id))
        return answer("Something went wrong. Check the application in the portal.", popup=True)
    buttons(_NO_BUTTONS)
    telegram_api("sendMessage", chat_id=chat, text=result, reply_to_message_id=message.get("message_id", ""))
    answer("Done.")


@telegram_actions.route("/telegram/webhook", methods=["POST"])
def webhook():
    secret = os.getenv("TELEGRAM_WEBHOOK_SECRET")
    if not secret:
        return jsonify({"error": "Not found"}), 404
    if not hmac.compare_digest(request.headers.get("X-Telegram-Bot-Api-Secret-Token", "").encode(), secret.encode()):
        return jsonify({"error": "Forbidden"}), 403
    press = (request.get_json(silent=True) or {}).get("callback_query")
    if press:
        try:
            _handle(press)
        except Exception:
            logging.exception("Could not handle a Telegram button press")
    return jsonify({}), 200  # always 200 for a genuine update, or Telegram would send it again
