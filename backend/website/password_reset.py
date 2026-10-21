import hashlib
import hmac
import logging
import os
import threading
import time

from flask import current_app
from itsdangerous import BadSignature, URLSafeTimedSerializer

from website.models import Applicant
from website.system_email_utils import send_email_smtp

RESET_LINK_MINUTES = 60
EMAIL_COOLDOWN_SECONDS = 60        # one reset email per address per minute
GLOBAL_EMAILS_PER_HOUR = 100       # keeps the mail account from being flooded
DEFAULT_FRONTEND_URL = "https://app.leocapinvest.co.ke"

# Best-effort limits kept in memory, so each server process counts on its own.
_lock = threading.Lock()
_last_sent = {}
_sent_times = []


def _serializer():
    return URLSafeTimedSerializer(current_app.config["JWT_SECRET_KEY"], salt="applicant-password-reset")


def _fingerprint(applicant):
    """Changes whenever the password changes, so a reset link stops working once it has been used."""
    return hashlib.sha256(applicant.password.encode()).hexdigest()[:16]


def make_reset_token(applicant):
    return _serializer().dumps({"id": applicant.id, "pw": _fingerprint(applicant)})


def applicant_from_reset_token(token):
    """The applicant a valid, unexpired and still unused reset token was issued to, otherwise None."""
    try:
        data = _serializer().loads(token, max_age=RESET_LINK_MINUTES * 60)
    except BadSignature:  # tampered, malformed or expired
        return None
    applicant = Applicant.query.get(data.get("id")) if isinstance(data, dict) else None
    if not applicant or not hmac.compare_digest(str(data.get("pw")), _fingerprint(applicant)):
        return None
    return applicant


def may_send(email):
    """True when a reset email may go out now to this address (and counts it)."""
    now = time.time()
    with _lock:
        _sent_times[:] = [t for t in _sent_times if now - t < 3600]
        if len(_sent_times) >= GLOBAL_EMAILS_PER_HOUR or now - _last_sent.get(email, 0) < EMAIL_COOLDOWN_SECONDS:
            return False
        if len(_last_sent) > 1000:
            _last_sent.clear()
        _last_sent[email] = now
        _sent_times.append(now)
        return True


def frontend_url():
    """Where the web app lives: a server setting, never taken from the request."""
    return os.getenv("FRONTEND_URL", DEFAULT_FRONTEND_URL).rstrip("/")


def send_reset_email(applicant):
    """Email the reset link in the background, so the answer to the request takes the same time whether or not an
    account exists. The link base is a server setting, never taken from the request."""
    link = f"{frontend_url()}/reset-password?token={make_reset_token(applicant)}"
    body = (
        f"Hello {applicant.name},\n\n"
        "We received a request to reset the password of your Leocap Invest account.\n"
        f"Open this link to choose a new password. It works once and expires in {RESET_LINK_MINUTES} minutes:\n\n"
        f"{link}\n\n"
        "If you did not ask for this, ignore this email: your password stays the same.\n\n"
        "Leocap Invest"
    )
    recipient = applicant.email

    def _send():
        try:
            ok, error = send_email_smtp(recipient, "Reset your Leocap Invest password", body, False)
            if not ok:
                logging.error("Password reset email to %s failed: %s", recipient, error)
        except Exception:
            logging.exception("Password reset email to %s failed", recipient)

    threading.Thread(target=_send, daemon=True).start()
