"""The loan agreement a borrower accepts when applying, and the record of that acceptance.

Two agreements can be edited under Site content: the Salary Advance one (HR and finance staff accept the same text for their own loans) and
the Personal Loan one. Until an admin publishes a text, the built-in one in agreement_defaults.py is used (version 0).

When an application is made, the exact text that was shown is stored with it, with the time, the address and device it came from, a random
reference code and a SEAL. The seal is an HMAC-SHA256 over the whole record, made with a key only the server has, so a later change to any
of it (the text, the time, the address, the reference) no longer matches its seal and is detected. A random code on its own could not do
that. The code is how a record is quoted and looked up; the seal is what proves it was not altered. The key is derived from SECRET_KEY:
changing SECRET_KEY makes older seals impossible to verify, so keep it.
"""
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
from datetime import datetime
from uuid import uuid4

from flask import current_app

from website import agreement_defaults
from website.extensions import db
from website.models import AgreementAcceptance, SiteContent

KEYS = {"salary": "agreement_salary", "personal": "agreement_personal"}
SEAL_VERSION = 1
EMPLOYER = re.compile(r"\{\{\s*employer\s*\}\}")
CHANGED = "The loan agreement was updated while you were applying. Please read it again and accept it again."
_REFERENCE_LETTERS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"  # no 0/O, 1/I/L: a code read out over the phone cannot be misheard


def kind_for_loan_type(loan_type):
    """Salary Advance (and HR / finance staff loans, which are salary advances) use the first agreement, personal loans the second."""
    return "personal" if (loan_type or "").lower() == "personal" else "salary"


def built_in(key):
    """The text that came with the site, as the editor and the forms use it: bodies are strings (lines joined)."""
    source = agreement_defaults.PERSONAL_LOAN if key == KEYS["personal"] else agreement_defaults.SALARY_ADVANCE
    return {"title": source["title"], "intro": source["intro"], "items": [{"title": s["title"], "body": "\n".join(s["body"])} for s in source["items"]]}


def published(key):
    """(version, text, is_built_in): what a borrower applying now is shown."""
    row = SiteContent.query.get(key)
    if row is not None and row.published is not None:
        return row.version or 0, row.published, False
    return 0, built_in(key), True


def fill(data, employer):
    """The text with the borrower's employer put in where it says {{employer}}."""
    name = (employer or "").strip() or "the Employer"
    sub = lambda text: EMPLOYER.sub(name, text or "")
    return {"title": sub(data["title"]), "intro": sub(data.get("intro", "")), "items": [{"title": sub(s["title"]), "body": sub(s["body"])} for s in data["items"]]}


def render_text(data):
    """The agreement as plain text (title, opening paragraph, then each section's title and lines)."""
    parts = [data["title"], ""] + ([data["intro"], ""] if data.get("intro") else [])
    for s in data["items"]:
        parts += [s["title"], s["body"], ""]
    return "\n".join(parts).rstrip("\n")


def text_hash(snapshot):
    return hashlib.sha256(json.dumps(snapshot, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()


def version_problem(kind, form):
    """The message to answer with when the version the form showed is no longer the one in force, else None. A form that sends no version
    (a page opened before versions existed) is accepted only while the built-in text is what is live, because that is what it showed."""
    version, _, _ = published(KEYS[kind])
    sent = (form.get("agreement_version") or "").strip()
    if sent == "":
        return None if version == 0 else CHANGED
    try:
        return None if int(sent) == version else CHANGED
    except ValueError:
        return CHANGED


def device_summary(user_agent):
    """A short reading of a browser's user agent for people ("Chrome 128 on Android 14"). The raw text is stored too."""
    ua = user_agent or ""
    if not ua:
        return "Unknown device"
    if m := re.search(r"Android[ /]([\d.]+)", ua):
        system = f"Android {m.group(1).split('.')[0]}"
    elif m := re.search(r"(?:iPhone|iPad|iPod).*? OS (\d+)", ua):
        system = f"iOS {m.group(1)}"
    elif "Windows" in ua:
        system = "Windows"
    elif "Mac OS X" in ua or "Macintosh" in ua:
        system = "macOS"
    elif "Linux" in ua or "X11" in ua:
        system = "Linux"
    else:
        system = None
    for name, pattern in (("Edge", r"Edg(?:e|A|iOS)?/(\d+)"), ("Opera", r"OPR/(\d+)"), ("Samsung Browser", r"SamsungBrowser/(\d+)"), ("Firefox", r"(?:Firefox|FxiOS)/(\d+)"),
                          ("Chrome", r"(?:Chrome|CriOS)/(\d+)"), ("Safari", r"Version/(\d+)[\d.]* .*Safari")):
        if m := re.search(pattern, ua):
            browser = f"{name} {m.group(1)}"
            break
    else:
        browser = "Browser"
    return f"{browser} on {system}"[:80] if system else browser[:80]


def new_reference():
    """A random, unguessable code for one acceptance: LA-XXXX-XXXX-XXXX."""
    groups = ["".join(secrets.choice(_REFERENCE_LETTERS) for _ in range(4)) for _ in range(3)]
    return "LA-" + "-".join(groups)


def _seal_key():
    secret = current_app.config.get("SECRET_KEY") or current_app.config.get("JWT_SECRET_KEY") or os.environ.get("SECRET_KEY", "")
    return hmac.new(str(secret).encode(), b"leocap agreement seal v1", hashlib.sha256).digest()


def seal_of(acc):
    """The seal for a record's current contents (the same function makes it and checks it)."""
    fields = [acc.id, acc.application_id, acc.applicant_id, acc.agreement_key, int(acc.version), acc.employer or "", acc.text_hash,
              acc.accepted_at.replace(microsecond=0).isoformat(), acc.ip_address or "", acc.user_agent or "", acc.device or "", acc.reference, int(acc.seal_version or SEAL_VERSION)]
    return hmac.new(_seal_key(), json.dumps(fields, separators=(",", ":"), ensure_ascii=False).encode(), hashlib.sha256).hexdigest()


def verify(acc):
    """True only if the record still matches its seal AND the stored text still matches its hash."""
    try:
        return hmac.compare_digest(seal_of(acc), acc.seal) and text_hash(acc.snapshot) == acc.text_hash
    except Exception:
        return False


def record(app, applicant, form, req):
    """Store what this borrower accepted with the application being made (added to the session; the caller commits)."""
    kind = kind_for_loan_type(app.loan_type)
    key = KEYS[kind]
    version, data, _ = published(key)
    employer = " ".join((form.get("agreement_employer") or "").split())[:150] or None
    snapshot = fill(data, employer)
    ua = (req.headers.get("User-Agent") or "")[:300]
    forwarded = req.headers.get("X-Forwarded-For", "").split(",")[0].strip()
    acc = AgreementAcceptance(
        id=str(uuid4()), application_id=app.id, applicant_id=applicant.id, agreement_key=key, version=version, employer=employer,
        snapshot=snapshot, text_hash=text_hash(snapshot), accepted_at=datetime.utcnow().replace(microsecond=0),
        ip_address=(forwarded or req.remote_addr or "")[:64] or None, user_agent=ua or None, device=device_summary(ua),
        reference=new_reference(), seal="", seal_version=SEAL_VERSION,
    )
    acc.seal = seal_of(acc)
    db.session.add(acc)
    return acc


def for_application(application_id):
    """The record of an application, or None. A problem with the table itself (it could not be created on this database) must never take the
    loan page or the dossier down with it: it is logged and the application is treated as having no record."""
    try:
        return AgreementAcceptance.query.filter_by(application_id=application_id).first()
    except Exception:
        db.session.rollback()
        logging.exception("Could not read the agreement acceptance of application %s", application_id)
        return None


def delete_for(application_id):
    """Remove the record with a loan that is being deleted (a loan that was never paid out). Never blocks the delete."""
    try:
        with db.session.begin_nested():
            AgreementAcceptance.query.filter_by(application_id=application_id).delete(synchronize_session=False)
    except Exception:
        logging.exception("Could not delete the agreement acceptance of application %s", application_id)


def summary(application_id):
    """What the admin's loan page shows about the acceptance, or None for an application made before records were kept."""
    acc = for_application(application_id)
    if acc is None:
        return None
    return {"reference": acc.reference, "key": acc.agreement_key, "version": acc.version, "title": acc.snapshot.get("title") if isinstance(acc.snapshot, dict) else None,
            "accepted_at": acc.accepted_at.isoformat() + "Z", "ip_address": acc.ip_address, "device": acc.device, "verified": verify(acc)}


_LATE_CLAUSE = re.compile(r"^([a-z])\. A late-payment charge of 10%")


def legacy(app, employer):
    """The text for an application made before acceptances were recorded: the built-in text of the right kind. Loans applied for before the
    10% late-payment charge existed (cron.LATE_CHARGE_FROM) accepted a text without that clause, so it is left out for them and the
    clauses after it move up a letter (this is what the debt dossier always did)."""
    from website.cron import LATE_CHARGE_FROM

    data = fill(built_in(KEYS[kind_for_loan_type(app.loan_type)]), employer)
    if app.created_at and app.created_at >= LATE_CHARGE_FROM:
        return data
    for section in data["items"]:
        lines = section["body"].split("\n")
        at = next((i for i, ln in enumerate(lines) if _LATE_CLAUSE.match(ln)), None)
        if at is None:
            continue
        del lines[at]
        for i in range(at, len(lines)):
            m = re.match(r"^([a-z])\. ", lines[i])
            if m:
                lines[i] = chr(ord(m.group(1)) - 1) + lines[i][1:]
        section["body"] = "\n".join(lines)
    return data
