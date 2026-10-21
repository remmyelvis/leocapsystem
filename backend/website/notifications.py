import logging
import os
import re
from datetime import datetime, timedelta

from website.models import Applicant, Company
from website.password_reset import frontend_url
from website.system_email_utils import send_email_background

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


def notify_hr_of_application(application, applicant):
    """Email HR about a new loan application. It runs after the application has been saved and can never get in its
    way: sending is in the background and any problem is only logged."""
    try:
        recipients = hr_recipients(application, applicant)
        if not recipients:
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
        for recipient in recipients:
            send_email_background(recipient, subject, body)
    except Exception:
        logging.exception("Could not notify HR about application %s", application.id)
