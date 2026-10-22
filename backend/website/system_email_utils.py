import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import os
import logging

from dotenv import load_dotenv
from flask import after_this_request, has_request_context


_APP = None


def init_email_audit(app):
    """Remember the app so a mail audit row can be written from anywhere (a task that runs after the response has no app context)."""
    global _APP
    _APP = app


def mask_address(address):
    name, _, domain = (address or "").partition("@")
    return f"{name[:2]}***@{domain}"


def record_email(purpose, recipient, ok, info, subject, entity_type=None, entity_id=None, mask=True):
    """Write one audit log row for an email the app tried to send: who it went to, what for, and what the mail
    server answered. A success row carries the server's own reply and message id (the id cPanel's Track Delivery lists),
    the proof that it took the message; a failure row carries the reason. Always in its own app context, so it can
    never commit half-finished work of the request that sent the mail. A problem here is only logged."""
    try:
        from website.extensions import db
        from website.models import AuditAction, AuditLog
        shown = mask_address(recipient) if mask else recipient
        with _APP.app_context():
            db.session.add(AuditLog(
                action=AuditAction.CREATE,
                description=f"Emailed {purpose} to {shown}" + ("" if ok else " (failed)"),
                status="success" if ok else "failure",
                error_message=None if ok else str(info).replace(recipient, shown)[:300],  # the server's answer may repeat the address
                actor_id="system", actor_role="system",
                entity_type=entity_type or "Email", entity_id=entity_id,
                new_values={"to": shown, "subject": subject, **({"mail_server": str(info)[:200]} if ok and info else {})},
            ))
            db.session.commit()
    except Exception:
        logging.exception("Could not write the audit log for the %s email to %s", purpose, recipient)


def send_audited(recipient, subject, body, *, purpose, entity_type=None, entity_id=None, mask=True, **options):
    """Send an email AND leave its audit row. Every email the app sends goes through here (options as for send_email_smtp).
    Returns (ok, info) like send_email_smtp: on success info is the mail server's answer, otherwise the reason."""
    try:
        ok, info = send_email_smtp(recipient, subject, body, **options)
    except Exception as exc:  # the mail layer should not raise, but a bug there must not hide the attempt
        ok, info = False, f"{type(exc).__name__}: {exc}"
    record_email(purpose, recipient, ok, info, subject, entity_type, entity_id, mask)
    return ok, info


def run_after_response(task):
    """Run task once the answer has been sent, still inside the request that asked for it, so the caller never waits on
    the mail server. A plain background thread is not dependable on the live host: it only moved while some request was
    being served (an application notice took two minutes to leave and a password-reset email never left), so the work
    rides on the request itself. Outside a request it simply runs."""
    def _safe():
        try:
            task()
        except Exception:
            logging.exception("A task that runs after the response failed")

    if not has_request_context():
        _safe()
        return

    @after_this_request
    def _later(response):
        response.call_on_close(_safe)
        return response


def send_email_smtp(recipient, subject, body, isHrEmail=False, attachments=None, html=False):
    load_dotenv()
    sender_address = os.getenv("SENDER_ADDRESS")
    sender_password = os.getenv("SENDER_PASSWORD")

    msg = MIMEMultipart()
    msg['Subject'] = subject
    msg['From'] = sender_address
    msg['To'] = recipient

    msg.attach(MIMEText(body, 'html' if html else 'plain'))

    if attachments:
        for file_path in attachments:
            try:
                with open(file_path, 'rb') as f:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(f.read())

                encoders.encode_base64(part)

                filename = os.path.basename(file_path)
                part.add_header(
                    "Content-Disposition",
                    f'attachment; filename="{filename}"'
                )

                msg.attach(part)
            except Exception as e:
                return False, str(e)



    smtp_host = os.getenv("SMTP_HOST", "mail.leocapinvest.co.ke")
    smtp_port = int(os.getenv("SMTP_PORT", 465))

    if os.getenv("DEMO_MODE") == "True":
        logging.info(f"DEMO MODE ACTIVE: Bypassing actual email sending to {recipient}")
        return True, None

    try:
        # Use SMTP_SSL for port 465
        with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=20) as server:
            logging.debug(f"Attempting SMTP login with: {sender_address}")
            server.login(sender_address, sender_password)
            # Keep the mail server's answer to the message itself ("250 OK id=1vXyz-0004Ab-Cd"): that id is what
            # cPanel's Track Delivery lists, so it ties an audit row to the mail server's own record of the message.
            reply = {}
            data = getattr(server, "data", None)
            if data:
                def _data(body, _data=data):
                    reply["last"] = _data(body)
                    return reply["last"]
                server.data = _data
            refused = server.send_message(msg)
            logging.info(f"Email sent successfully from {sender_address}")
        if refused:  # some recipients were turned away
            return False, f"Refused by the mail server: {refused}"
        code, text = reply.get("last", (None, b""))
        return True, (f"{code} {text.decode(errors='replace')}".strip() if code else None)  # on success the second value is the server's answer
    except Exception as e:
        logging.error(f"Failed to send email from {sender_address}: {e}", exc_info=True)
        return False, str(e)


def send_email_background(recipient, subject, body, html=False, *, purpose="an email", entity_type=None, entity_id=None, mask=True):
    """Send an email (with its audit row) after the answer has been sent, so the caller does not wait for the mail server.
    A failure is logged and recorded, never raised."""
    def _send():
        try:
            ok, error = send_audited(recipient, subject, body, purpose=purpose, entity_type=entity_type, entity_id=entity_id, mask=mask, html=html)
            if not ok:
                logging.error("Email to %s failed: %s", recipient, error)
        except Exception:
            logging.exception("Email to %s failed", recipient)

    run_after_response(_send)
