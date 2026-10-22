import logging
import os
import re
from datetime import datetime, timedelta

from flask import current_app

from website.extensions import db
from website.models import Applicant, AuditAction, AuditLog, Company
from website.password_reset import frontend_url
from website import system_email_utils
from website.system_email_utils import run_after_response

_ADDRESS = re.compile(r"^[^@\s,;<>]+@[^@\s,;<>]+\.[^@\s,;<>]+$")
_LOAN_TYPES = {"salary_advance": "salary advance", "personal": "personal loan"}


def hr_recipients(application, applicant):
    """Who is told about a new application: the HR staff accounts of the applicant's company plus the HR address(es)
    on the company record, each address once. Personal applicants have no employer, so the shared HR mailbox from
    the server .env (HR_EMAIL) is told instead of the Personal company's own address (that one is the fallback when
    HR_EMAIL is not set). Suspended staff and the applicant themselves are left out."""
    found = {}

    def add(address):
        address = (address or "").strip()
        if _ADDRESS.match(address):
            found.setdefault(address.lower(), address)

    for staff in Applicant.query.filter_by(role="hr", applicant_type=application.company).all():
        if staff.applicant_status != "suspended":
            add(staff.email)

    company = Company.query.filter_by(code=application.company).first()
    addresses = company.hr_email if company and company.hr_email else ""
    if application.company == "personal" and (os.getenv("HR_EMAIL") or "").strip():
        addresses = os.getenv("HR_EMAIL")
    for address in re.split(r"[,;\s]+", addresses):
        add(address)

    found.pop((applicant.email or "").strip().lower(), None)
    return list(found.values())


def finance_recipients(application, applicant):
    """Finance reviews the loans of HR staff, so when an HR user applies the company's active finance staff are told
    too (never the applicant themselves)."""
    if applicant.role != "hr":
        return []
    own = (applicant.email or "").strip().lower()
    staff = Applicant.query.filter_by(role="finance", applicant_type=application.company).all()
    return [s.email.strip() for s in staff
            if s.applicant_status != "suspended" and _ADDRESS.match((s.email or "").strip()) and s.email.strip().lower() != own]


def team_recipients(applicant, already):
    """A company with no finance staff has nobody to review its HR users' loans, so Leocap's own team (the HR_EMAIL
    mailbox from the server .env, whose people use the admin portal) is told instead. Never the applicant, and no
    address that is already getting the HR notice."""
    if applicant.role != "hr":
        return []
    skip = {(applicant.email or "").strip().lower(), *(a.lower() for a in already)}
    found = {}
    for address in re.split(r"[,;\s]+", os.getenv("HR_EMAIL") or ""):
        if _ADDRESS.match(address) and address.lower() not in skip:
            found.setdefault(address.lower(), address)
    return list(found.values())


def _mask(address):
    name, _, domain = address.partition("@")
    return f"{name[:2]}***@{domain}"


def _record_email(kind, address, application_id, ok, error, subject, mask_address):
    """One audit log row per email the app tried to send, so a missing email can be traced to what happened to it."""
    shown = _mask(address) if mask_address else address
    db.session.add(AuditLog(
        action=AuditAction.CREATE,
        description=f"Emailed {kind} to {shown}" + ("" if ok else " (failed)"),
        status="success" if ok else "failure",
        error_message=None if ok else str(error)[:300],
        actor_id="system", actor_role="system",
        entity_type="Application", entity_id=application_id,
        new_values={"to": shown, "subject": subject},
    ))
    db.session.commit()


def _deliver(kind, messages, mask_address=False):
    """Send (address, subject, body, application_id[, kind]) messages one after another once the answer has been sent
    (the mail host limits how fast it takes mail) and write an audit log row for each. Nothing here can delay or fail
    the answer to the request that asked for it; a problem is only logged."""
    app = current_app._get_current_object()

    def _run():
        for address, subject, body, application_id, *own_kind in messages:
            what = own_kind[0] if own_kind else kind
            try:
                ok, error = system_email_utils.send_email_smtp(address, subject, body, False)
            except Exception as exc:  # the mail layer should not raise, but a bug there must not stop the others
                ok, error = False, f"{type(exc).__name__}: {exc}"
            if not ok:
                logging.error("%s email to %s failed: %s", what, address, error)
            try:
                with app.app_context():
                    _record_email(what, address, application_id, ok, error, subject, mask_address)
            except Exception:
                logging.exception("Could not write the audit log for the %s email to %s", what, address)

    run_after_response(_run)


def notify_hr_of_application(application, applicant):
    """Email HR about a new loan application. It runs after the application has been saved and can never get in its
    way: sending happens after the answer has been sent and any problem is only logged."""
    try:
        recipients = hr_recipients(application, applicant)
        finance = finance_recipients(application, applicant)
        team = [] if finance else team_recipients(applicant, recipients)
        if not recipients and not finance and not team:
            # Not an error, but worth a trace: nobody was told (for example the only HR address is the applicant's own).
            db.session.add(AuditLog(
                action=AuditAction.CREATE,
                description="No HR notice sent for a new application: nobody to notify",
                status="failure",
                error_message="No HR address for this company (or the only one is the applicant's own).",
                actor_id="system", actor_role="system",
                entity_type="Application", entity_id=application.id,
                new_values={"company": application.company},
            ))
            db.session.commit()
            return

        company = Company.query.filter_by(code=application.company).first()
        company_name = company.name if company else application.company
        loan_type = _LOAN_TYPES.get(application.loan_type, "loan")
        applied_at = (application.created_at or datetime.utcnow()) + timedelta(hours=3)  # East Africa Time
        subject = f"New loan application: {applicant.name} ({company_name})"
        body = (
            "Hello,\n\n"
            f"{applicant.name} from {company_name} has applied for a {loan_type}.\n\n"
            f"Amount applied: KES {float(application.amount_applied):,.2f}\n"
            f"Applied on: {applied_at.strftime('%d %b %Y, %H:%M')} EAT\n\n"
            "Open the application in the HR portal to review it:\n"
            f"{frontend_url()}/hr/applications/pending/{application.id}\n\n"
            "Leocap Invest"
        )
        messages = [(r, subject, body, application.id) for r in recipients]
        if finance:
            finance_body = body.replace("in the HR portal", "in the finance portal").replace(
                f"/hr/applications/pending/{application.id}", f"/finance/hr-loans/pending/{application.id}")
            messages += [(r, subject, finance_body, application.id, "finance about an HR loan application") for r in finance]
        if team:
            team_body = body.replace("in the HR portal", "in the admin portal").replace(
                f"/hr/applications/pending/{application.id}", f"/admin/applications/{application.id}").replace(
                "has applied for", "(an HR user, and the company has no finance staff to review it) has applied for")
            messages += [(r, subject, team_body, application.id, "Leocap about an HR loan application") for r in team]
        _deliver("HR about a new application", messages)
    except Exception:
        logging.exception("Could not notify HR about application %s", application.id)


def _repaid_message(application):
    """(address, subject, body) telling the borrower their loan is fully repaid, or None if they have no usable address."""
    applicant = Applicant.query.get(application.applicant_id)
    address = ((applicant.email if applicant else "") or "").strip()
    if not _ADDRESS.match(address):
        return None
    loan_type = _LOAN_TYPES.get(application.loan_type, "loan")
    paid_at = datetime.utcnow() + timedelta(hours=3)  # East Africa Time
    body = (
        f"Dear {applicant.name},\n\n"
        f"Your {loan_type} of KES {float(application.amount_applied):,.2f} with Leocap Invest has been fully repaid. "
        "Thank you.\n\n"
        f"Loan reference: {application.id[:8].upper()}\n"
        f"Total repaid: KES {float(application.repayment_amount):,.2f}\n"
        f"Marked as paid: {paid_at.strftime('%d %b %Y, %H:%M')} EAT\n\n"
        f"You can sign in to see your account, or apply again, at {frontend_url()}\n\n"
        "Leocap Invest"
    )
    return address, "Your loan has been fully repaid", body, application.id


def notify_loans_repaid(applications):
    """Email each borrower that their loan is fully repaid. Call it after the paid status has been saved, with only the
    loans that were marked paid by this action. The messages are written here and sent one after another by a single
    background thread (a whole company can be marked paid at once, and the mail host limits how fast it takes mail), so
    a mail problem never blocks or fails the action; it is only logged."""
    try:
        messages = []
        for application in applications:
            try:
                message = _repaid_message(application)
                if message:
                    messages.append(message)
            except Exception:
                logging.exception("Could not write the repaid email for application %s", application.id)
        if not messages:
            return

        _deliver("a borrower: loan fully repaid", messages, mask_address=True)
    except Exception:
        logging.exception("Could not send the repaid emails")

