"""Records what people do in the system, for the System Audit Logs tab.

One hook sees every request after the route has answered and writes an AuditLog row for:
  * anything that changes data (POST / PUT / PATCH / DELETE) by a signed-in user (or the daily cron job),
  * sign-ins, including failed ones (with the email that was tried, never the password),
  * downloads of sensitive documents (statements, dossiers, reports, exports).
It never changes the answer the route gave, and a problem while logging is only logged to the server log.
Loan-level changes (status, amounts, rates) are also kept in the Application Changes tab (ApplicationAudit).
"""
import logging
import re

from flask import g, request

from website import db
from website.models import AuditAction, AuditLog, Applicant, User

_UUID = re.compile(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")

# Not worth a row: the audit log's own pages (deleting logs writes its own row), and the public calculator.
_SKIP_PREFIXES = ("/api/audit-logs", "/api/loans/")

# A GET on one of these hands over sensitive records, so it is logged as an export.
_EXPORT_HINTS = ("/download", "/dossier", "/statement", "/risk-profile", "/pdf", "/excel", "/template", "/escalate", "/mou")

# Request values that are safe to keep (everything else is recorded by name only, never by value).
_SAFE_VALUES = {
    "loan_limit", "interest_rate", "amount", "amount_applied", "month", "dry_run", "role", "applicant_status",
    "applicant_type", "company", "loan_status", "repayment_status", "status", "name", "email",
}

# (method, path pattern, what happened). The first match wins; anything else is described by its method and path.
_DESCRIPTIONS = [
    ("POST", r"/auth/users/login", "Admin sign-in"),
    ("POST", r"/auth/applicant/login", "Sign-in"),
    ("POST", r"/auth/applicant/register", "Created an account"),
    ("PUT", r"/auth/applicant/forgot-password", "Asked for a password reset"),
    ("POST", r"/auth/applicant/reset-password", "Reset a password"),
    ("POST", r"/auth/applicant/bulk-upload", "Bulk-uploaded applicants"),
    ("PATCH", r"/auth/applicant/loan-limit/", "Changed an applicant's loan limit"),
    ("PATCH", r"/auth/applicant/interest-rate/", "Changed an applicant's interest rate"),
    ("PATCH", r"/auth/applicant/(suspend|activate|status)", "Changed an applicant's account status"),
    ("PATCH", r"/auth/applicant/update/", "Updated an applicant's profile"),
    ("DELETE", r"/auth/applicant/", "Deleted an applicant"),
    ("POST", r"/auth/users/register", "Created a staff account"),
    ("PATCH", r"/auth/users/update/", "Updated a staff account"),
    ("DELETE", r"/auth/users/delete/", "Deleted a staff account"),
    ("POST", r"/applications$", "Submitted a loan application"),
    ("PATCH", r"/applications/approve/", "Approved a loan application"),
    ("PATCH", r"/applications/reject/", "Rejected a loan application"),
    ("PATCH", r"/applications/disbursed/", "Disbursed a loan"),
    ("DELETE", r"/applications/delete/", "Deleted a loan application"),
    ("PATCH", r"/applications/(hr|finance)/amend/", "Amended a loan amount"),
    ("PATCH", r"/applications/amend/", "Edited a loan's terms"),
    ("PATCH", r"/applications/bulk/paid", "Marked selected loans as paid"),
    ("PATCH", r"/applications/(nakama|ideon)/paid", "Marked a company's month of loans as paid"),
    ("PATCH", r"/companies/[^/]+/paid", "Marked a company's month of loans as paid"),
    ("PATCH", r"/applications/paid/", "Marked a loan as paid"),
    ("PATCH", r"/applications/partially-paid/", "Recorded a partial payment"),
    ("PATCH", r"/applications/charge-interest/", "Charged interest on a loan"),
    ("POST", r"/applications/penalty/", "Charged a penalty on a loan"),
    ("PATCH", r"/applications/default/", "Marked a loan as defaulted"),
    ("PATCH", r"/applications/rate-confirmed/", "Confirmed the interest rate"),
    ("PATCH", r"/applications/rate-declined/", "Declined the interest rate"),
    ("POST", r"/applications/write-off/", "Wrote off a loan"),
    ("POST", r"/applications/reverse-transaction/", "Reversed a transaction"),
    ("GET", r"/applications/escalate/", "Escalated a loan (demand notice)"),
    ("GET", r"/reports/applications/get-all/repayment/(?:company/)?([^/]+)/(pdf|excel)", r"Downloaded the \1 repayment report (\2)"),
    ("GET", r"/applicant/statement/download/", "Downloaded an applicant's statement"),
    ("GET", r"/applicant/statement/", "Viewed an applicant's statement"),
    ("DELETE", r"/applications/statement-entry/", "Deleted a statement entry"),
    ("PATCH", r"/applications/statement-entry/", "Amended a statement entry"),
    ("PATCH", r"/applications/disbursement-date/", "Set a loan's disbursement date"),
    ("GET", r"/dossier", "Downloaded a debt collection dossier"),
    ("GET", r"/risk-profile", "Downloaded an applicant's risk profile"),
    ("GET", r"/documents/download/", "Downloaded a document"),
    ("GET", r"/bulk-upload/template", "Downloaded the bulk upload template"),
    ("GET", r"/reports/", "Downloaded a report"),
    ("PUT", r"/auth/(applicant|users)/change-password", "Changed a password"),
    ("DELETE", r"/applicant/documents/delete/", "Deleted an applicant document"),
    ("PUT", r"/applicant/documents/update-doc/", "Replaced an applicant document"),
    ("DELETE", r"/application/emails/confirmation-document/delete/", "Deleted an email attachment"),
    ("GET", r"/application/emails/confirmation-document/download/", "Downloaded an email attachment"),
    ("DELETE", r"/application/emails/delete-email/", "Deleted a saved email"),
    ("PATCH", r"/application/emails/edit-email/", "Edited a saved email"),
    ("POST", r"/application/send-email/", "Sent a saved email"),
    ("GET", r"/applicants/[^/]+/statement/pdf", "Downloaded an applicant's statement"),
    ("GET", r"/statements/my-statement/pdf", "Downloaded their own statement"),
    ("GET", r"/statements/analysis/", "Viewed a statement analysis"),
    ("GET", r"/statements/list/", "Viewed an applicant's uploaded statements"),
    ("GET", r"/statements/export_report/", "Downloaded a credit risk report"),
    ("DELETE", r"/statements/", "Deleted an uploaded statement"),
    ("POST", r"/statements/upload", "Uploaded a statement"),
    ("POST", r"/statements/analyze/", "Ran a statement analysis"),
    ("POST", r"/statements/chat/", "Asked a question about a statement"),
    ("POST", r"/statements/learn", "Taught the statement reader a keyword"),
    ("GET", r"/company/[^/]+/mou", "Downloaded a company MoU"),
    ("POST", r"/reports/custom/excel", "Downloaded a custom report (Excel)"),
    ("POST", r"/cron/reminders", "Ran the daily reminder job"),
    ("POST", r"/companies", "Created a company"),
    ("PATCH", r"/companies/", "Updated a company"),
    ("DELETE", r"/companies/", "Deleted a company"),
    ("POST", r"/companies/onboard/", "Sent a company onboarding email"),
    ("POST", r"/application/documents", "Uploaded a loan document"),
    ("PUT", r"/application/documents", "Replaced a loan document"),
    ("DELETE", r"/application/documents", "Deleted a loan document"),
    ("POST", r"/applicant/documents|/documents/upload", "Uploaded an applicant document"),
    ("PATCH", r"/documents/.*(approve|reject)", "Reviewed an applicant document"),
    ("POST", r"/emails", "Sent an email"),
]

_ENTITY_TYPES = [
    ("/applications", "Application"), ("/application/", "Application"), ("/auth/applicant", "Applicant"),
    ("/applicants", "Applicant"), ("/auth/users", "User"), ("/documents", "Document"), ("/companies", "Company"),
    ("/company", "Company"), ("/emails", "Email"), ("/cron", "System"),
]


def _describe(method, path):
    short = path[4:] if path.startswith("/api") else path
    for m, pattern, text in _DESCRIPTIONS:
        found = re.search(pattern, short) if m == method else None
        if found:
            return found.expand(text)
    return f"{method} {path}"


def _entity(path):
    short = path[4:] if path.startswith("/api") else path
    found = _UUID.findall(path)
    kind = next((name for needle, name in _ENTITY_TYPES if needle in short), "System")
    return kind, (found[-1] if found else None)


def _ip():
    forwarded = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
    return forwarded or request.remote_addr


def _actor_from_token():
    """(id, email, role) of the signed-in user, or (None, None, None)."""
    try:
        from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if not identity:
            return None, None, None
        role = (get_jwt() or {}).get("role")
        person = User.query.get(identity) or Applicant.query.get(identity)
        return identity, (person.email if person else None), role or (person.role if person else None)
    except Exception:
        return None, None, None


def _values(body):
    """What to keep of a JSON body: the names of the fields, and the values of the harmless ones only."""
    if not isinstance(body, dict):
        return {}
    kept = {"fields": sorted(str(k) for k in body)}
    safe = {k: body[k] for k in body if k in _SAFE_VALUES and isinstance(body[k], (str, int, float, bool, type(None)))}
    if safe:
        kept["values"] = safe
    return kept


def _record(response):
    method, path = request.method, request.path
    if method == "OPTIONS" or request.url_rule is None or path.startswith(_SKIP_PREFIXES):
        return
    if getattr(g, "audit_recorded", False):  # the route already wrote a more detailed entry
        return

    is_login = method == "POST" and path.endswith("/login") and "/auth/" in path
    is_export = method == "GET" and response.status_code == 200 and any(h in path for h in _EXPORT_HINTS)
    if method == "GET" and not is_export:
        return

    body = request.get_json(silent=True) if request.is_json else None
    actor_id, actor_email, actor_role = _actor_from_token()
    new_values = {"http_status": response.status_code, "ip": _ip(), **_values(body)}
    if request.args.get("month"):
        new_values.setdefault("values", {})["month"] = request.args.get("month")

    if is_login:
        # Nobody is signed in yet: the actor is whoever the response says signed in, or the email that was tried.
        sent = (body or {}).get("email") if isinstance(body, dict) else None
        answer = response.get_json(silent=True) if response.is_json else None
        person = (answer or {}).get("user") or (answer or {}).get("applicant") or {}
        actor_id, actor_email = person.get("id") or "anonymous", person.get("email") or sent
        actor_role = person.get("role")
        new_values["fields"] = ["email"]
        new_values.pop("values", None)
        action = AuditAction.LOGIN
    elif is_export:
        action = AuditAction.UPDATE if "/escalate" in path else AuditAction.EXPORT  # escalating also changes the loan
    else:
        if not actor_id and "/cron/" not in path and "/register" not in path and "/forgot-password" not in path and "/reset-password" not in path:
            return  # anonymous noise (scanners, expired sessions) is not worth a row
        action = {"POST": AuditAction.CREATE, "PUT": AuditAction.UPDATE, "PATCH": AuditAction.UPDATE, "DELETE": AuditAction.DELETE}.get(method, AuditAction.UPDATE)

    failed = response.status_code >= 400
    error = None
    if failed:
        answer = response.get_json(silent=True) if response.is_json else None
        error = str((answer or {}).get("message") or (answer or {}).get("error") or response.status)[:300]
    kind, entity_id = _entity(path)
    description = _describe(method, path)
    if is_export and description.startswith(method):
        description = "Downloaded " + path.replace("/api/", "", 1)

    # Roll back first: if the route answered an error with changes still pending, they must stay discarded
    # (they were never committed); committing the log row must not commit them by accident.
    db.session.rollback()
    db.session.add(AuditLog(
        action=action,
        description=description + (" (failed)" if failed else ""),
        endpoint=path,
        http_method=method,
        status="failure" if failed else "success",
        error_message=error,
        actor_id=actor_id or "anonymous",
        actor_email=actor_email,
        actor_role=actor_role,
        entity_type=kind,
        entity_id=entity_id,
        new_values=new_values,
    ))
    db.session.commit()


def register_audit_hook(app):
    @app.after_request
    def audit_requests(response):
        try:
            _record(response)
        except Exception:
            db.session.rollback()
            logging.exception("Could not write the audit log entry")
        return response
