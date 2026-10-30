import json
import logging
import re
import os
from decimal import Decimal, InvalidOperation
from io import BytesIO
import math

from flask import Blueprint, request, jsonify, current_app, send_file, g
from werkzeug.utils import secure_filename
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from uuid import uuid4
from sqlalchemy import func, or_
from sqlalchemy.exc import SQLAlchemyError

from website.export_service import export_applicant, export_statement
from website.system_email_utils import send_email_smtp
from website.models import Application, Applicant, ApplicationDocument, HrEmail, Email, ApplicationAudit, User, StatementEntry, Company, ApplicantDocument
from website import agreements
from website import db, Config
from website.role_decorator import role_required, can_access_application
from website.upload_paths import upload_path
from website.notifications import notify_hr_of_application, notify_loans_repaid, notify_penalty
from flask import Response
from sqlalchemy.orm.attributes import get_history
from dateutil.relativedelta import relativedelta

from dotenv import load_dotenv

from datetime import datetime, date, timedelta, time
import calendar

from zipfile import ZipFile, ZIP_DEFLATED

load_dotenv()

application = Blueprint('application', __name__, url_prefix='/api')


def update_loan_status(
        application,
        new_status,
        changed_by_email,
        changed_by_role,
        changed_by_company,
        notes=None,
        commit=True
):
    hist = get_history(application, 'loan_status')
    old_status = hist.deleted[0] if hist.deleted else application.loan_status
    application.loan_status = new_status
    
    audit = ApplicationAudit(
        application_id=application.id,
        application_old_loan_amount=float(application.amount_applied) if application.amount_applied else 0.0,
        application_new_loan_amount=float(application.amount_applied) if application.amount_applied else 0.0,
        application_old_repayment_amount=float(application.repayment_amount) if application.repayment_amount else 0.0,
        application_new_repayment_amount=float(application.repayment_amount) if application.repayment_amount else 0.0,
        field_name="loan_status",
        old_status=old_status,
        new_status=new_status,
        changed_by_email=changed_by_email,
        changed_by_role=changed_by_role,
        changed_by_company=changed_by_company or "Leocap Invest",
        notes=notes
    )
    db.session.add(audit)
    if commit:
        db.session.commit()

    return True


def update_repayment_status(
        application,
        new_status,
        changed_by_email,
        changed_by_role,
        changed_by_company,
        notes=None,
        commit=True
):
    hist = get_history(application, 'repayment_status')
    old_status = hist.deleted[0] if hist.deleted else application.repayment_status
    application.repayment_status = new_status
    
    audit = ApplicationAudit(
        application_id=application.id,
        application_old_loan_amount=float(application.amount_applied) if application.amount_applied else 0.0,
        application_new_loan_amount=float(application.amount_applied) if application.amount_applied else 0.0,
        application_old_repayment_amount=float(application.repayment_amount) if application.repayment_amount else 0.0,
        application_new_repayment_amount=float(application.repayment_amount) if application.repayment_amount else 0.0,
        field_name="repayment_status",
        old_status=old_status,
        new_status=new_status,
        changed_by_email=changed_by_email,
        changed_by_role=changed_by_role,
        changed_by_company=changed_by_company or "Leocap Invest",
        notes=notes
    )
    db.session.add(audit)
    if commit:
        db.session.commit()
    return True



from dateutil.relativedelta import relativedelta
import calendar

def advance_due_date():
    now = datetime.now()
    last_day = calendar.monthrange(now.year, now.month)[1]
    return now.replace(day=last_day, hour=0, minute=0, second=0, microsecond=0)

def personal_due_date():
    return datetime.now() + relativedelta(months=1)

MAX_LOAN_AMOUNT = Decimal("1000000000")  # the amount columns hold at most 10 digits before the decimal point


def _actor():
    """(email, role, company) of the signed-in user for audit rows: their real email (not the id in the token) and the
    company they belong to (HR, finance and applicants have one; admins are Leocap Invest)."""
    uid = get_jwt_identity()
    user = User.query.get(uid) or Applicant.query.get(uid)
    company = getattr(user, "applicant_type", None) if isinstance(user, Applicant) else None
    return (user.email if user else "unknown"), get_jwt().get("role"), company or "Leocap Invest"


def _same_value(old, new):
    """True when two stored/received values mean the same thing (20000.00 and "20000" do)."""
    try:
        return Decimal(str(old)) == Decimal(str(new))
    except (InvalidOperation, ValueError):
        return str(old if old is not None else "") == str(new if new is not None else "")


def _starting_rate(applicant):
    """The interest rate a new application starts at, as a fraction: the company's standard rate (admins edit it on the
    Companies page) or 10%. The value the browser sends is never used; the admin sets the real terms afterwards."""
    company = Company.query.filter_by(code=applicant.applicant_type).first()
    percent = company.interest_rate if company and company.interest_rate is not None and company.interest_rate >= 0 else 10
    return Decimal(str(percent)) / 100

@application.route('/applications', methods=['POST'])
@jwt_required()
@role_required("applicant", "hr", "finance")
def create_application():
    data = request.form

    applicant_id = get_jwt_identity()

    role = get_jwt().get("role")

    applicant = Applicant.query.get(applicant_id)

    # An application that was declined was never paid out, but it keeps the starting repayment status "unpaid": it must
    # not count as a loan still to repay (a decline used to block every later application).
    unpaid_count = (
        Application.query
        .filter(
            Application.applicant_id == applicant_id,
            Application.repayment_status == "unpaid",
            Application.loan_status.notin_(["declined", "rejected", "rate_declined"]),
        )
        .count()
    )

    pending_count = (
        Application.query
        .filter(Application.applicant_id == applicant_id, Application.loan_status.in_(["pending_processing", "approved"]))
        .count()
    )

    if unpaid_count:
        return jsonify({
            "message": "You have unpaid loans. You cannot apply for a new loan."
        }), 400

    if pending_count > 0:
        return jsonify({
            "message": "You have pending loan applications. You cannot apply for a new loan."
        }), 400

    try:
        amount = Decimal(str(data.get("amount_applied")))
    except InvalidOperation:
        amount = None
    if amount is None or not amount.is_finite() or amount <= 0 or amount >= MAX_LOAN_AMOUNT:
        return jsonify({"message": "Please enter a valid loan amount."}), 400

    if applicant.loan_limit and amount > applicant.loan_limit:
        return jsonify({
            "message": f"Your loan limit is KES {applicant.loan_limit:,}. Please apply for that amount or less."
        }), 400

    # The agreement the borrower read must still be the one in force (an admin may have published a new one meanwhile)
    problem = agreements.version_problem(agreements.kind_for_loan_type(data.get("loan_type")), data)
    if problem:
        return jsonify({"message": problem}), 409

    application_id = str(uuid4())
    processing = round((amount * Decimal(0.03)), 2)
    access = 0

    rate = _starting_rate(applicant)
    rate_text = format(rate.normalize(), "f")
    requested_rate = data.get("interest_rate")
    try:
        rate_differs = Decimal(str(requested_rate)) != rate
    except InvalidOperation:
        rate_differs = True

    repayment = round((amount * (rate + 1)), 2)

    new_application = Application(
        id=application_id,
        employment_type=data.get('employment_type'),
        # The company is the one the applicant picked at sign-up. The form's company/employer text must not replace it.
        company=(applicant.applicant_type if applicant and applicant.applicant_type else data.get('company')),
        employer_name=(data.get('employer_name') or '').strip()[:150] or None,
        employment_nature=data.get('employment_nature'),
        payroll_number=data.get('payroll_number'),
        designation=data.get('designation'),
        is_first_time_applicant=data.get('is_first_time_applicant'),  # use lowercase
        month_one=data.get('month_one'),
        month_two=data.get('month_two'),
        month_three=data.get('month_three'),
        loan_type=data.get('loan_type'),
        loan_purpose=data.get('loan_purpose'),
        amount_applied=amount,
        processing_fees=str(processing),
        repayment_amount=str(repayment),
        outstanding_balance=str(repayment),
        interest_rate=rate_text,
        applicant_id=applicant_id,
        applicant_role=role
    )

    if data.get('loan_type') == "salary_advance":
        new_application.due_date = advance_due_date()
    else:
        new_application.due_date = personal_due_date()

    legal = "0"

    if new_application.loan_type == "salary_advance":
        access = round((amount * Decimal(0.02)), 2)
        new_application.access_fees = str(access)
    else:
        new_application.access_fees = str(float(access))

    if new_application.loan_type == "salary_advance":
        new_application.legal_fees = "500"
        legal = Decimal("500")
    else:
        new_application.legal_fees = "0"
        legal = Decimal("0")

    disbursement = round((amount - (processing + access + legal)), 2)
    new_application.disbursement_amount = str(disbursement)

    db.session.add(new_application)

    if rate_differs:
        # Keep what the request carried: the form always sends the standard rate, so anything else means a modified
        # request or an out-of-date page. The standard rate was used either way.
        db.session.add(ApplicationAudit(
            application_id=application_id,
            application_old_loan_amount=float(amount),
            application_new_loan_amount=float(amount),
            application_old_repayment_amount=float(repayment),
            application_new_repayment_amount=float(repayment),
            field_name="interest_rate",
            old_status=str(requested_rate)[:255],
            new_status=rate_text,
            changed_by_email=applicant.email,
            changed_by_role=role,
            changed_by_company=applicant.applicant_type or "Applicant",
            notes="The application request carried a different interest rate than the company's standard rate; the standard rate was used."
        ))
        logging.warning("Application %s: request carried interest_rate=%r, used %s", application_id, requested_rate, rate_text)

    amount_applied = amount
    interest_rate = rate
    interest_amount = amount_applied * interest_rate  # confirm rate is a fraction, not a whole-number percent

    statement_entry_one = StatementEntry(
        applicant_id=applicant_id,
        application_id=application_id,
        memo="New loan applied",
        debit=amount_applied,
        credit=Decimal(0),
        balance=amount_applied
    )
    db.session.add(statement_entry_one)

    statement_entry_interest = StatementEntry(
        applicant_id=applicant_id,
        application_id=application_id,
        memo=f"Interest charged ({float(interest_rate)*100}%)",
        debit=interest_amount,
        credit=Decimal(0),
        balance=amount_applied + interest_amount
    )
    db.session.add(statement_entry_interest)

    # Process document uploads
    from website.models import ApplicationDocument
    from website.config import Config
    from flask import current_app
    from werkzeug.utils import secure_filename
    
    files = request.files.items()
    if files:
        for field_name, file in files:
            valid, error = Config.validate_file(file)
            if not valid:
                continue
                
            filename = secure_filename(file.filename)
            try:
                folder, filepath = upload_path(current_app.config["APPLICATION_DOCUMENTS"], application_id, field_name, filename)
            except ValueError:
                continue
            os.makedirs(folder, exist_ok=True)
            file.save(filepath)
            
            doc = ApplicationDocument(
                application_id=application_id,
                filename=filename,
                filepath=filepath,
                document_passcode=request.form.get(f"{field_name}_passcode"),
                document_type=field_name,
                filetype=filename.rsplit(".", 1)[1] if "." in filename else "unknown"
            )
            db.session.add(doc)

    # What the borrower accepted: the exact agreement text, when, from where, sealed (agreements.py). Written in a savepoint so that a
    # problem with this table can never cost the borrower their application; it is logged loudly instead.
    try:
        with db.session.begin_nested():
            agreements.record(new_application, applicant, data, request)
    except Exception:
        logging.exception("Could not record the agreement acceptance for application %s", application_id)

    db.session.commit()

    notify_hr_of_application(new_application, applicant)

    return jsonify({
        'message': 'Application created successfully',
        'application': new_application.to_dict()
    }), 201

@application.route('/applications/paid/<string:application_id>', methods=['PATCH'])
@jwt_required()
@role_required("admin")
def mark_as_paid(application_id):
    role = get_jwt().get("role")
    
    app = db.session.query(Application).with_for_update().filter_by(id=application_id).first()
    if not app:
        db.session.rollback()
        return jsonify({'error': 'Application not found'}), 404
        
    if app.repayment_status == 'paid':
        db.session.rollback()
        return jsonify({'message': 'Already paid'}), 200
        
    # The ledger credit is what was still owed: the tracked balance, or the repayment amount on older loans without one.
    # repayment_amount is kept (the loan's total) so interest income and reports still see the loan.
    balance_due = Decimal(app.outstanding_balance) if app.outstanding_balance and Decimal(app.outstanding_balance) > 0 else Decimal(app.repayment_amount)
    db.session.add(StatementEntry(
        applicant_id=app.applicant_id,
        application_id=app.id,
        memo="Loan paid",
        debit=Decimal(0),
        credit=balance_due,
        balance=Decimal(0)
    ))
    app.outstanding_balance = "0"

    user = User.query.get(get_jwt_identity())
    update_repayment_status(
        app, "paid", user.email if user else "unknown", role, "Leocap Invest",
        notes="Loan paid in full", commit=False
    )

    db.session.commit()

    notify_loans_repaid([app])

    return jsonify({
        'message': 'Application marked as paid',
        'application': app.to_dict()
    }), 200


def _balance_due(app):
    """What is still owed on a loan: the tracked balance, or the repayment amount on older loans without one."""
    outstanding = Decimal(str(app.outstanding_balance)) if app.outstanding_balance else Decimal(0)
    return outstanding if outstanding > 0 else Decimal(str(app.repayment_amount))


def clear_company_month(company_code, company_name, month, dry_run=False):
    """Mark one company's unpaid, disbursed loans of one repayment month as paid: the loans on that month's repayment
    report. Each loan is cleared the way the single Mark as Paid does it (ledger credit for what was owed, balance 0,
    audit entry) and its borrower is emailed. With dry_run nothing is changed: it only says what would be.
    Returns (response, status code)."""
    month = (month or datetime.now().strftime("%B")).strip().capitalize()
    if month not in calendar.month_name:
        return jsonify({"message": "Please choose a month."}), 400

    loans = (
        Application.query
        .filter(
            Application.company == company_code,
            Application.repayment_status == "unpaid",
            Application.loan_status == "disbursed",
            Application.month == month
        )
        .all()
    )
    if not loans:
        return jsonify({"message": f"No unpaid disbursed applications found for {company_name} in {month}."}), 404

    total = sum((_balance_due(app) for app in loans), Decimal(0))
    summary = {"company": company_name, "month": month, "count": len(loans), "total": float(total)}
    if dry_run:
        return jsonify({**summary, "dry_run": True, "message": f"{len(loans)} loans would be marked as paid."}), 200

    admin_id = get_jwt_identity()
    user = User.query.get(admin_id) or Applicant.query.get(admin_id)
    email = user.email if user else "unknown"
    role = get_jwt().get("role")
    for app in loans:
        db.session.add(StatementEntry(
            applicant_id=app.applicant_id,
            application_id=app.id,
            memo="Loan paid",
            debit=Decimal(0),
            credit=_balance_due(app),
            balance=Decimal(0)
        ))
        app.outstanding_balance = "0"
        update_repayment_status(
            app, "paid", email, role, "Leocap Invest",
            notes=f"Marked as paid with the {company_name} {month} repayment", commit=False
        )

    db.session.commit()

    notify_loans_repaid(loans)

    return jsonify({**summary, "dry_run": False, "success": True,
                    "message": f"Successfully marked {len(loans)} {company_name} loans as paid for {month}."}), 200


def _company_paid_request(company_code):
    """The Mark Nakama Paid / Mark Ideon Paid buttons: ?month=October (default this month) and ?dry_run=1 to preview."""
    company = Company.query.filter_by(code=company_code).first()
    return clear_company_month(
        company_code,
        company.name if company else company_code,
        request.args.get("month"),
        dry_run=request.args.get("dry_run") in ("1", "true")
    )


@application.route('/applications/nakama/paid', methods=['PATCH'])
@jwt_required()
@role_required("admin")
def mark_nakama_as_paid():
    return _company_paid_request("nakama")


@application.route('/applications/ideon/paid', methods=['PATCH'])
@jwt_required()
@role_required("admin")
def mark_ideon_as_paid():
    return _company_paid_request("ideon")

@application.route('/applications/bulk/paid', methods=['PATCH'])
@jwt_required()
@role_required("admin")
def mark_bulk_as_paid():
    admin_id = get_jwt_identity()
    user = User.query.get(admin_id) or Applicant.query.get(admin_id)
    email = user.email if user else "Unknown"
    role = user.role if user else "Unknown"

    data = request.get_json()
    application_ids = data.get("application_ids", [])
    
    apps = Application.query.filter(Application.id.in_(application_ids)).all()
    count = 0
    paid_now = []
    for app in apps:
        if app.repayment_status == 'paid':
            continue
            
        old_status = app.repayment_status
        app.repayment_status = 'paid'
        
        # 1. Statement Entry
        from decimal import Decimal
        stmt = StatementEntry(
            applicant_id=app.applicant_id,
            application_id=app.id,
            memo="Bulk Loan paid",
            debit=Decimal(0),
            credit=Decimal(app.repayment_amount) if app.repayment_amount else Decimal(0),
            balance=Decimal(0)
        )
        db.session.add(stmt)
        
        # 2. Audit Trail
        audit = ApplicationAudit(
            application_id=app.id,
            application_old_loan_amount=float(app.amount_applied) if app.amount_applied else 0.0,
            application_new_loan_amount=float(app.amount_applied) if app.amount_applied else 0.0,
            application_old_repayment_amount=float(app.repayment_amount) if app.repayment_amount else 0.0,
            application_new_repayment_amount=float(app.repayment_amount) if app.repayment_amount else 0.0,
            field_name="repayment_status",
            old_status=old_status,
            new_status="paid",
            changed_by_email=email,
            changed_by_role=role,
            changed_by_company="Leocap Invest",
            notes="Marked as paid via bulk action"
        )
        db.session.add(audit)
        paid_now.append(app)
        count += 1

    db.session.commit()

    notify_loans_repaid(paid_now)

    return jsonify({
        'message': f'{count} applications marked as paid successfully'
    }), 200


@application.route('/applications/partially-paid/<string:application_id>', methods=['PATCH'])
@jwt_required()
@role_required("admin")
def mark_as_partially_paid(application_id):
    admin_id = get_jwt_identity()

    app = db.session.query(Application).filter_by(id=application_id).with_for_update().first()

    if not app:
        return jsonify({'error': 'Application not found'}), 404

    data = request.get_json()

    # F-001: Idempotency & Duplicate Check
    external_ref = data.get('external_reference')
    if external_ref:
        existing_txn = StatementEntry.query.filter_by(external_reference=external_ref).first()
        if existing_txn:
            db.session.rollback()
            return jsonify({'error': 'Duplicate transaction: External reference already exists'}), 409

    idempotency_key = data.get('idempotency_key')
    if idempotency_key:
        existing_txn = StatementEntry.query.filter_by(external_reference=idempotency_key).first()
        if existing_txn:
            db.session.rollback()
            return jsonify({'error': 'Duplicate transaction: Idempotency key already processed'}), 409
            
    # F-004: Overpayment Logic - Allow negative outstanding balance (wallet credit)
    amount_paid = float(data.get('amount', 0))
    current_outstanding = float(app.outstanding_balance) if app.outstanding_balance else float(app.repayment_amount)


    # ---------------------------
    # AUDIT: capture old values
    # ---------------------------
    old_repayment_status = app.repayment_status
    old_repayment_amount = float(app.repayment_amount)

    # ---------------------------
    # EXISTING LOGIC (UNCHANGED)
    # ---------------------------
    
    # ---------------------------
    # FINANCIAL PATCH: Use outstanding_balance & Prevents Overpayment
    # ---------------------------
    payment_amount = Decimal(data.get("amount", 0))
    current_balance = Decimal(app.outstanding_balance) if app.outstanding_balance else Decimal(app.repayment_amount)
    
    if payment_amount > current_balance:
        return jsonify({'error': 'Overpayment not allowed'}), 400
        
    balance = current_balance - payment_amount
    new_balance = round(balance, 2)
    app.outstanding_balance = str(new_balance)
    status = app.repayment_status.lower()

    app.memo = f"Partially paid {data.get('amount')}"
    app.partially_paid_date = datetime.now()

    allowed_statuses = ["unpaid", "partially_paid", "delinquent", "defaulted", "escalated"]

    if status not in allowed_statuses:
        return jsonify({'error': 'Application cannot be marked as partially paid'}), 403

    # A delinquent loan stays delinquent while it is paid down. The daily reminder job only looks at unpaid and
    # part-paid loans, so turning it back into partially_paid would make the job add the late-payment charge again.
    new_status = "delinquent" if status == "delinquent" else "partially_paid"
    app.repayment_status = new_status
    app.partially_paid_count += 1
    
    date_str = data.get("date")
    if date_str:
        try:
            parsed_date = datetime.strptime(date_str, "%Y-%m-%dT%H:%M").date()
            date = datetime.combine(parsed_date, datetime.now().time())
            if date < app.created_at or date > datetime.now():
                db.session.rollback()
                return jsonify({'error': 'Date must be between application creation and now'}), 400
        except ValueError:
            db.session.rollback()
            return jsonify({'error': 'Invalid date format'}), 400
    else:
        date = datetime.now()

    statement_entry_two = StatementEntry(
        applicant_id=app.applicant_id,
        application_id=app.id,
        memo=app.memo,
        debit=Decimal(0),
        credit=Decimal(data.get("amount")),
        balance=Decimal(new_balance),
        date = date
    )
    db.session.add(statement_entry_two)

    # ---------------------------
    # AUDIT: actor resolution
    # ---------------------------
    user = User.query.filter_by(id=admin_id).first()

    changed_by_email = user.email if user else "unknown"
    changed_by_role = user.role if user else "admin"

    # ---------------------------
    # AUDIT: repayment status change
    # ---------------------------
    update_repayment_status(
        application=app,
        new_status=new_status,
        changed_by_email=changed_by_email,
        changed_by_role=changed_by_role,
        changed_by_company="Leocap Invest",
        notes=f"Partial repayment of KES {payment_amount:,.2f} recorded; balance now KES {new_balance:,.2f}.",
        commit=False
    )

    db.session.commit()

    return jsonify({
        'message': 'Application successfully marked as partially paid',
        'application': app.to_dict()
    }), 200


@application.route('/applications/charge-interest/<string:application_id>', methods=['PATCH'])
@jwt_required()
@role_required("admin")
def charge_interest(application_id):
    app = db.session.query(Application).filter_by(id=application_id).with_for_update().first()

    if not app:
        return jsonify({'error': 'Application not found'}), 404

    data = request.get_json()

    # F-001: Idempotency & Duplicate Check
    external_ref = data.get('external_reference')
    if external_ref:
        existing_txn = StatementEntry.query.filter_by(external_reference=external_ref).first()
        if existing_txn:
            db.session.rollback()
            return jsonify({'error': 'Duplicate transaction: External reference already exists'}), 409

    idempotency_key = data.get('idempotency_key')
    if idempotency_key:
        existing_txn = StatementEntry.query.filter_by(external_reference=idempotency_key).first()
        if existing_txn:
            db.session.rollback()
            return jsonify({'error': 'Duplicate transaction: Idempotency key already processed'}), 409
            
    # F-004: Overpayment Logic - Allow negative outstanding balance (wallet credit)
    amount_paid = float(data.get('amount', 0))
    current_outstanding = float(app.outstanding_balance) if app.outstanding_balance else float(app.repayment_amount)


    # Interest is charged on the OUTSTANDING balance (what is still owed), not on the original repayment amount.
    # Payments are applied against outstanding_balance, so the interest is added to both it and repayment_amount.
    outstanding = Decimal(app.outstanding_balance) if app.outstanding_balance else Decimal(app.repayment_amount)
    interest_rate = Decimal(data.get("interest_rate")) / 100
    interest_amount = round(outstanding * interest_rate, 2)
    new_outstanding = round(outstanding + interest_amount, 2)
    app.repayment_amount = str(round(Decimal(app.repayment_amount) + interest_amount, 2))
    app.outstanding_balance = str(new_outstanding)

    app.memo = f"Interest charged {data.get('interest_rate')}%"
    app.interest_charged_date = datetime.now()

    status = app.repayment_status.lower()

    allowed_statuses = ["unpaid", "partially_paid", "disbursed", "defaulted", "escalated"]

    if status not in allowed_statuses:
        return jsonify({'error': 'Interest cannot be charged'}), 403

    current_end = new_due_date()

    if app.due_date == current_end:
        next_end = current_end + relativedelta(months=1, day=31)
        app.due_date = next_end
        app.month = next_end.strftime("%B")
    elif app.due_date < new_due_date():
        app.due_date = current_end
        app.month = current_end.strftime("%B")

    app.interest_charged_count += 1
    
    date_str = data.get("date")
    if date_str:
        try:
            parsed_date = datetime.strptime(date_str, "%Y-%m-%dT%H:%M").date()
            date = datetime.combine(parsed_date, datetime.now().time())
            if date < app.created_at or date > datetime.now():
                db.session.rollback()
                return jsonify({'error': 'Date must be between application creation and now'}), 400
        except ValueError:
            db.session.rollback()
            return jsonify({'error': 'Invalid date format'}), 400
    else:
        date = datetime.now()

    statement_entry_two = StatementEntry(
        applicant_id=app.applicant_id,
        application_id=app.id,
        memo=app.memo,
        debit=interest_amount,
        credit=Decimal(0),
        balance=new_outstanding,
        date = date
    )

    db.session.add(statement_entry_two)

    db.session.commit()

    return jsonify({
        'message': 'Interest successfully charged on application',
        'application': app.to_dict()
    }), 200


def new_due_date():
    return datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) + relativedelta(days=30)


COLLECTION_FEE_MEMO = "Delinquency Collection Fee"  # the statement line the demand notice and the reports read
COLLECTION_FEE_RATE = Decimal("0.15")


@application.route('/applications/escalate/<string:application_id>', methods=['GET', 'POST'])
@jwt_required()
@role_required("admin")
def escalate(application_id):
    """Issue the demand notice for a defaulted loan. The 15% collection fee follows the demand notice, so it is charged HERE (once, on the
    balance owed at that moment) and no longer by the daily job on day 8. POST escalates: the loan becomes "escalated", the fee is
    charged and the notice PDF comes back. The fee is never charged twice: not when the notice is downloaded again, and not for a loan
    that already has the fee line (charged by the daily job before this rule changed). A loan that was already escalated is not
    charged afterwards either. GET with ?dry_run=1 says what escalating would do (nothing changes); a GET without it only downloads
    the notice of a loan that is already escalated, because a GET must never change a balance."""
    from flask import Response
    from website.export_service import generate_debt_dossier_pdf

    dry_run = request.args.get("dry_run") in ("1", "true")
    if dry_run:
        g.audit_recorded = True  # a preview changes nothing, so the audit hook must not log it as an escalation

    app = db.session.query(Application).filter_by(id=application_id).with_for_update().first()

    if not app:
        db.session.rollback()
        return jsonify({'error': 'Application not found'}), 404

    data = request.get_json(silent=True) or {}
    external_ref = data.get('external_reference')
    if external_ref:
        existing_txn = StatementEntry.query.filter_by(external_reference=external_ref).first()
        if existing_txn:
            db.session.rollback()
            return jsonify({'error': 'Duplicate transaction: External reference already exists'}), 409

    idempotency_key = data.get('idempotency_key')
    if idempotency_key:
        existing_txn = StatementEntry.query.filter_by(external_reference=idempotency_key).first()
        if existing_txn:
            db.session.rollback()
            return jsonify({'error': 'Duplicate transaction: Idempotency key already processed'}), 409

    allowed_statuses = ["defaulted", "escalated"]

    if app.repayment_status not in allowed_statuses:
        db.session.rollback()
        return jsonify({'error': 'You can only escalate defaulted loans'}), 403

    first_time = app.repayment_status == "defaulted"
    fee_already = StatementEntry.query.filter_by(application_id=app.id, memo=COLLECTION_FEE_MEMO).first() is not None
    before = _balance_owed(app)
    fee = (before * COLLECTION_FEE_RATE).quantize(Decimal("0.01")) if (first_time and not fee_already) else Decimal("0")

    if dry_run:
        db.session.rollback()
        return jsonify({
            "dry_run": True, "status": app.repayment_status, "fee": float(fee), "fee_rate": float(COLLECTION_FEE_RATE),
            "fee_already_charged": fee_already, "balance_before": float(before), "balance_after": float(before + fee),
        }), 200

    if request.method == "GET" and first_time:
        db.session.rollback()
        return jsonify({'error': 'Escalating charges the collection fee. Use the Escalate button on the loan page.'}), 405

    if first_time:
        email, role, company = _actor()
        app.repayment_status = "escalated"
        if fee > 0:
            after = before + fee
            db.session.add(StatementEntry(
                applicant_id=app.applicant_id, application_id=app.id, memo=COLLECTION_FEE_MEMO,
                debit=fee, credit=Decimal(0), balance=after, date=datetime.now(),
            ))
            app.outstanding_balance = after  # the repayment amount stays the contract total, like the daily job's late-payment charge
            db.session.add(ApplicationAudit(
                application_id=app.id,
                application_old_loan_amount=float(app.amount_applied or 0),
                application_new_loan_amount=float(app.amount_applied or 0),
                application_old_repayment_amount=float(app.repayment_amount or 0),
                application_new_repayment_amount=float(app.repayment_amount or 0),
                field_name="outstanding_balance",
                old_status=str(before),
                new_status=str(after),
                changed_by_email=email,
                changed_by_role=role,
                changed_by_company=company,
                notes=f"Escalated (demand notice issued): the 15% collection fee of KES {fee:,.2f} was charged on the balance owed of KES {before:,.2f}.",
            ))
        db.session.commit()

    applicant = Applicant.query.get(app.applicant_id)

    statements = StatementEntry.query.filter_by(
        application_id=app.id
    ).order_by(StatementEntry.date.asc()).all()
    
    docs = applicant.documents

    pdf_bytes = generate_debt_dossier_pdf(app, applicant, statements, docs, include_demand=True)

    safe_name = applicant.name.replace(' ', '_') if applicant.name else 'Applicant'
    return Response(
        pdf_bytes,
        mimetype="application/pdf",
        headers={"Content-disposition": f"attachment; filename=Escalated_Demand_Notice_{safe_name}_{app.id[:8]}.pdf"}
    )


_UUID_TEXT = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)


def _audit_with_borrower(row):
    """An audit row plus who the loan belongs to, so the screens can say more than a loan id. Rows written before the
    actor's email was recorded properly hold the user's id instead: it is looked up so the screens show an email."""
    audit, borrower_name, company, loan_type = row
    item = {**audit.to_dict(), "applicant_name": borrower_name, "company": company, "loan_type": loan_type}
    who = audit.changed_by_email or ""
    if _UUID_TEXT.match(who):
        person = User.query.get(who) or Applicant.query.get(who)
        if person:
            item["changed_by_email"] = person.email
    return item


def _audit_query():
    return (
        db.session.query(ApplicationAudit, Applicant.name, Application.company, Application.loan_type)
        .join(Application, Application.id == ApplicationAudit.application_id)
        .outerjoin(Applicant, Applicant.id == Application.applicant_id)
    )


@application.route('/applications/audit-trails', methods=['GET'])
@jwt_required()
@role_required("admin")
def get_audit_trails():
    """Loan changes (who changed what, when). Filters: application_id, period (today/7d/30d), field (what changed),
    user (part of the changer's email), q (free text over email, borrower, company, notes, field, loan id),
    order (asc/desc by date, default newest first)."""
    admin = User.query.filter_by(id=get_jwt_identity()).first()
    if not admin:
        return jsonify({"error": "User not found"}), 404

    page = max(request.args.get('page', 1, type=int), 1)
    per_page = min(max(request.args.get('per_page', 20, type=int), 1), 100)

    query = _audit_query()

    application_id = request.args.get('application_id')
    if application_id:
        query = query.filter(ApplicationAudit.application_id == application_id)

    period_days = {"today": 1, "7d": 7, "30d": 30}.get(request.args.get("period"))
    if period_days:
        query = query.filter(ApplicationAudit.changed_at >= datetime.utcnow() - timedelta(days=period_days))

    field = (request.args.get("field") or "").strip()
    if field:
        query = query.filter(ApplicationAudit.field_name == field)

    user = (request.args.get("user") or "").strip()
    if user:
        query = query.filter(ApplicationAudit.changed_by_email.ilike(f"%{user}%"))

    search = (request.args.get("q") or "").strip()
    if search:
        like = f"%{search}%"
        query = query.filter(or_(
            ApplicationAudit.changed_by_email.ilike(like), ApplicationAudit.notes.ilike(like),
            ApplicationAudit.field_name.ilike(like), ApplicationAudit.application_id.ilike(like),
            ApplicationAudit.old_status.ilike(like), ApplicationAudit.new_status.ilike(like),
            Applicant.name.ilike(like), Application.company.ilike(like),
        ))

    newest_first = request.args.get("order", "desc") != "asc"
    query = query.order_by(ApplicationAudit.changed_at.desc() if newest_first else ApplicationAudit.changed_at.asc())

    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    fields = [f for (f,) in db.session.query(ApplicationAudit.field_name).distinct().order_by(ApplicationAudit.field_name).all()]

    return jsonify({
        "message": "Audit trails retrieved successfully",
        "data": [_audit_with_borrower(row) for row in paginated.items],
        "fields": fields,
        "pagination": {
            "page": paginated.page,
            "per_page": paginated.per_page,
            "total_pages": paginated.pages,
            "total_items": paginated.total,
            "has_next": paginated.has_next,
            "has_prev": paginated.has_prev
        }
    }), 200


@application.route('/applications/audit-trails/<string:audit_id>', methods=['GET'])
@jwt_required()
@role_required("admin")
def get_audit_trail_by_id(audit_id):
    admin = User.query.filter_by(id=get_jwt_identity()).first()
    if not admin:
        return jsonify({"error": "User not found"}), 404

    row = _audit_query().filter(ApplicationAudit.id == audit_id).first()
    if not row:
        return jsonify({"error": "Audit trail not found"}), 404

    return jsonify({
        "message": "Audit trail retrieved successfully",
        "data": _audit_with_borrower(row)
    }), 200

@application.route('/applicant/statement/<string:applicant_id>', methods=['GET'])
@jwt_required()
@role_required("admin","hr","finance","applicant")
def get_statement(applicant_id):
    from flask_jwt_extended import get_jwt_identity, get_jwt
    user_id = get_jwt_identity()
    role = get_jwt().get('role')
    if role == 'applicant' and user_id != applicant_id:
        return jsonify({"error": "Unauthorized"}), 403

    if not applicant_id:
        return jsonify({"error": "Please enter an id"}), 404

    app_id = request.args.get("application_id")
    start_str = request.args.get("start_date")
    end_str = request.args.get("end_date")

    query = StatementEntry.query.filter_by(applicant_id=applicant_id)
    if app_id:
        query = query.filter_by(application_id=app_id)

    # Same date handling as the PDF download: both dates or none.
    if start_str and end_str:
        try:
            start_date = datetime.combine(datetime.strptime(start_str, "%Y-%m-%d").date(), time.min)
            end_date = datetime.combine(datetime.strptime(end_str, "%Y-%m-%d").date(), time.max)
        except ValueError:
            return jsonify({"error": "Invalid date format, use YYYY-MM-DD"}), 400
        if start_date > end_date:
            return jsonify({"error": "start_date cannot be after end_date"}), 400
        query = query.filter(StatementEntry.date.between(start_date, end_date))

    statements = query.order_by(StatementEntry.date.asc()).all()

    # Show each row's own stored balance (per loan), as the applicant PDF does. Summing debits and credits
    # across every loan the applicant ever had gave a meaningless running total.
    loans = {a.id: a for a in Application.query.filter(Application.id.in_({s.application_id for s in statements if s.application_id})).all()}
    results = []
    for s in statements:
        results.append({
            "id": s.id,
            "application_id": s.application_id,
            "kind": ledger_kind(s.memo, s.credit),
            "locked": ledger_delete_block(s, loans.get(s.application_id)),  # why it cannot be deleted, or null
            "date": s.date.isoformat() if s.date else None,
            "memo": s.memo,
            "debit": str(float(s.debit) if s.debit else 0.0),
            "credit": str(float(s.credit) if s.credit else 0.0),
            "balance": str(float(s.balance) if s.balance is not None else 0.0)
        })

    return jsonify({
        "message": "Here is the users statement",
        "data": results
    }), 200

@application.route('/applicant/statement/download/<string:applicant_id>', methods=['GET'])
@jwt_required()
@role_required("admin", "hr", "finance")
def download_statement(applicant_id):
    import pandas as pd
    
    date_str = request.args.get("start_date")
    date_stp = request.args.get("end_date") 
    req_date_str = request.args.get("request_date")
    app_id_filter = request.args.get("application_id")

    if date_str and date_stp:
        start_date = datetime.combine(datetime.strptime(date_str, "%Y-%m-%d").date(), time.min)
        end_date = datetime.combine(datetime.strptime(date_stp, "%Y-%m-%d").date(), time.max)
    else:
        start_date = datetime(2000, 1, 1)
        end_date = datetime(2100, 1, 1)
    print(start_date)
    print(end_date)
    
    if start_date > end_date:
        return jsonify({
            "error": "start_date cannot be after end_date"
        }), 400


    query = StatementEntry.query.filter(
        StatementEntry.applicant_id == applicant_id,
        StatementEntry.date.between(start_date, end_date)
    )
    if app_id_filter:
        query = query.filter(StatementEntry.application_id == app_id_filter)
    statements = query.order_by(StatementEntry.date.asc()).all()
    
    if len(statements) == 0:
        return jsonify({
            "error": f"There are no statement entries between {date_str} and {date_stp}"
        }), 400

    applicant = Applicant.query.get(applicant_id)

    apps = Application.query.filter_by(applicant_id=applicant.id).order_by(Application.created_at.desc()).all()


    records = [
        statement.to_statement()
        for statement in statements
    ]

    df_pdf = pd.DataFrame(records)

    pdf_sheet = export_statement(
        applicant,
        apps,
        df_pdf,
        req_date_str
    )

    response = Response(
        pdf_sheet,
        mimetype="application/pdf"
    )
    response.headers["Content-Disposition"] = (
        f"attachment; filename=applicant_statement.pdf"
    )
    return response, 200

@application.route('/applications/<string:application_id>/dossier', methods=['GET'])
@jwt_required()
@role_required("admin", "hr", "finance")
def download_debt_dossier(application_id):
    from website.export_service import generate_debt_dossier_pdf
    app = Application.query.get_or_404(application_id)
    applicant = Applicant.query.get(app.applicant_id)
    statements = StatementEntry.query.filter_by(application_id=app.id).order_by(StatementEntry.date.asc()).all()
    docs = ApplicantDocument.query.filter_by(applicant_id=applicant.id).all()
    
    pdf_bytes = generate_debt_dossier_pdf(app, applicant, statements, docs)
    
    return Response(
        pdf_bytes,
        mimetype="application/pdf",
        headers={"Content-disposition": f"attachment; filename=Debt_Collection_Profile_{applicant.name}_{app.id[:8]}.pdf"}
    )


@application.route('/applicants/<string:applicant_id>/dossier', methods=['GET'])
@jwt_required()
@role_required("admin", "hr", "finance")
def download_applicant_dossier(applicant_id):
    """Download a debt collection dossier for an applicant's most recent active loan."""
    from website.export_service import generate_debt_dossier_pdf
    from flask import Response
    
    applicant = Applicant.query.get_or_404(applicant_id)
    
    # Get the most recent disbursed/active application for this applicant
    app = Application.query.filter_by(applicant_id=applicant_id).filter(
        Application.loan_status.in_(['disbursed', 'default', 'paid'])
    ).order_by(Application.created_at.desc()).first()
    
    if not app:
        # Fallback: get any latest application
        app = Application.query.filter_by(applicant_id=applicant_id).order_by(Application.created_at.desc()).first()
    
    if not app:
        return jsonify({"error": "No loan application found for this applicant"}), 404
    
    statements = StatementEntry.query.filter_by(application_id=app.id).order_by(StatementEntry.date.asc()).all()
    docs = ApplicantDocument.query.filter_by(applicant_id=applicant.id).all()
    
    pdf_bytes = generate_debt_dossier_pdf(app, applicant, statements, docs)
    
    safe_name = applicant.name.replace(' ', '_') if applicant.name else 'Applicant'
    return Response(
        pdf_bytes,
        mimetype="application/pdf",
        headers={"Content-disposition": f"attachment; filename=Debt_Collection_Profile_{safe_name}_{app.id[:8]}.pdf"}
    )

@application.route('/applicants/<string:applicant_id>/risk-profile', methods=['GET'])
@jwt_required()
@role_required("admin", "hr", "finance", "super_admin")
def get_applicant_risk_profile(applicant_id):
    from website.models import Applicant, Application, ApplicantDocument
    
    applicant = Applicant.query.get(applicant_id)
    if not applicant:
        return jsonify({'error': 'Applicant not found'}), 404

        # BASE SCORE (Out of 600 limit)
    score = 300
    details = []

    # NEW: FINANCIAL FLOW SCORE (M-Pesa / Bank Statements) - Out of 400
    try:
        from website.financial_engine.credit_analyzer import generate_credit_analysis
        credit_data = generate_credit_analysis(applicant_id)
        stmt_score = credit_data.get('score', 0)
        
        if stmt_score > 0:
            score += stmt_score
            details.append({"factor": "Statement Analysis Score", "impact": f"+{stmt_score}", "type": "positive"})
            
            for d in credit_data.get('scoring_details', []):
                details.append({"factor": f"Statement: {d['factor']}", "impact": str(d['impact']), "type": "neutral"})
                
    except Exception as e:
        pass # Graceful failure if no parsed statements exist yet

    # 1. Profile Completeness (max +120)
    if getattr(applicant, 'kra_pin', None):
        score += 40
        details.append({"factor": "KRA PIN provided", "impact": "+40", "type": "positive"})
    else:
        details.append({"factor": "Missing KRA PIN", "impact": "0", "type": "neutral"})

    if getattr(applicant, 'phone_number', None) and getattr(applicant, 'email', None):
        score += 40
        details.append({"factor": "Contact info complete", "impact": "+40", "type": "positive"})
    
    if getattr(applicant, 'payroll_number', None) or getattr(applicant, 'id_number', None):
        score += 40
        details.append({"factor": "Bio-data and Identifiers complete", "impact": "+40", "type": "positive"})
    else:
        details.append({"factor": "Missing core Bio-data", "impact": "0", "type": "negative"})

    docs = applicant.documents
    if len(docs) >= 3:
        score += 60
        details.append({"factor": "Strong document completeness", "impact": "+60", "type": "positive"})
    elif len(docs) > 0:
        score += 30
        details.append({"factor": "Partial document completeness", "impact": "+30", "type": "positive"})
    else:
        score -= 20
        details.append({"factor": "No documents uploaded", "impact": "-20", "type": "negative"})

    # 2. Earnings Stability
    apps = Application.query.filter_by(applicant_id=applicant_id).all()
    latest_app = Application.query.filter_by(applicant_id=applicant_id).order_by(Application.created_at.desc()).first()
    
    if latest_app:
        try:
            m1 = float(latest_app.month_one.replace(',','') if latest_app.month_one else 0)
            m2 = float(latest_app.month_two.replace(',','') if latest_app.month_two else 0)
            m3 = float(latest_app.month_three.replace(',','') if latest_app.month_three else 0)
            
            if m1 > 0 and m2 > 0 and m3 > 0:
                mean = (m1 + m2 + m3) / 3
                diff = max(m1, m2, m3) - min(m1, m2, m3)
                if diff / mean > 0.3:
                    score -= 50
                    details.append({"factor": "Erratic earnings history", "impact": "-50", "type": "negative"})
                else:
                    score += 50
                    details.append({"factor": "Stable earnings history", "impact": "+50", "type": "positive"})
            else:
                details.append({"factor": "Insufficient earnings data", "impact": "0", "type": "neutral"})
        except:
            pass

    # 3. Repayment History (Up to +300 / Uncapped negative)
    if not apps:
        details.append({"factor": "No loan history", "impact": "0", "type": "neutral"})
    else:
        paid_count = sum(1 for a in apps if a.repayment_status == 'paid' and not (float(a.late_payment_fee or 0) > 0))
        rejected_count = sum(1 for a in apps if a.loan_status == 'rejected')
        
        # A loan was defaulted if late_payment_fee > 0 OR repayment_status is defaulted/escalated
        defaulted_count = sum(1 for a in apps if float(a.late_payment_fee or 0) > 0 or a.repayment_status in ['defaulted', 'escalated'])
        
        # 7+ days in default (Collection fee levied)
        seven_days_default_count = sum(1 for a in apps if float(a.collection_fee or 0) > 0 or a.repayment_status == 'escalated')

        if paid_count > 0:
            pts = min(paid_count * 50, 200)
            score += pts
            details.append({"factor": f"{paid_count} fully paid loan(s) on time", "impact": f"+{pts}", "type": "positive"})
        
        if rejected_count > 0:
            pts = rejected_count * 50
            score -= pts
            details.append({"factor": f"{rejected_count} rejected loan(s)", "impact": f"-{pts}", "type": "negative"})

        if defaulted_count > 0:
            pts = defaulted_count * 100
            score -= pts
            details.append({"factor": f"{defaulted_count} loan(s) previously defaulted", "impact": f"-{pts}", "type": "negative"})
            
        if seven_days_default_count > 0:
            pts = seven_days_default_count * 100
            score -= pts
            details.append({"factor": f"{seven_days_default_count} loan(s) 7+ days in default", "impact": f"-{pts}", "type": "negative"})

        # Multiple loans indicating repeat trusted borrower
        if len(apps) >= 2 and defaulted_count == 0:
            score += 50
            details.append({"factor": "Consistent repeat borrower (No defaults)", "impact": "+50", "type": "positive"})

    # Cap Score
    if score > 1000: score = 1000
    if score < 0: score = 0
    
    # Determine Tier
    if score >= 800:
        tier = "Excellent"
        risk_level = "Low Risk"
        color = "emerald"
    elif score >= 600:
        tier = "Good"
        risk_level = "Moderate Risk"
        color = "blue"
    elif score >= 400:
        tier = "Fair"
        risk_level = "Elevated Risk"
        color = "orange"
    else:
        tier = "Poor"
        risk_level = "High Risk"
        color = "red"

    risk_data = {
        "score": score,
        "max_score": 1000,
        "tier": tier,
        "risk_level": risk_level,
        "color": color,
        "factors": details
    }
    
    # NEW: Fetch M-Pesa AI Analysis to combine into the PDF
    try:
        from website.models import ParsedTransaction
        from website.financial_engine.credit_analyzer import generate_credit_analysis
        from website.financial_engine.mpesa_analyzer import analyze_mpesa
        from website.financial_engine.gemini_agent import generate_statement_narrative
        
        txns = ParsedTransaction.query.filter_by(applicant_id=applicant_id).order_by(ParsedTransaction.date.desc()).all()
        if txns:
            cr_analysis = generate_credit_analysis(applicant_id)
            mp_metrics = analyze_mpesa(applicant_id)
            narrative = generate_statement_narrative(applicant_id, txns, mp_metrics, cr_analysis)
            
            risk_data['ai_narrative'] = narrative
            risk_data['credit_analysis'] = cr_analysis
            risk_data['mpesa_metrics'] = mp_metrics
    except Exception as e:
        print("Could not attach statement AI analysis:", str(e))
        pass
    
    from flask import request, Response
    if request.args.get('format') == 'pdf':
        from website.export_service import generate_crb_report_pdf
        pdf_bytes = generate_crb_report_pdf(applicant, risk_data)
        safe_name = applicant.name.replace(' ', '_') if getattr(applicant, 'name', None) else 'Applicant'
        return Response(
            pdf_bytes,
            mimetype="application/pdf",
            headers={"Content-disposition": f"attachment; filename=CRB_Grade_Report_{safe_name}.pdf"}
        )

    return jsonify(risk_data), 200



def ledger_kind(memo, credit):
    """What a statement row is: loan (the amount lent), interest, payment, writeoff, or charge (any other fee)."""
    text = (memo or "").lower()
    if text == "new loan applied":
        return "loan"
    if text.startswith("loan written off"):
        return "writeoff"
    if text.startswith("interest charged"):
        return "interest"
    return "payment" if credit and Decimal(str(credit)) > 0 else "charge"


def ledger_delete_block(row, app):
    """Why a statement row may not be deleted, or None. The two rows written when the loan is applied ARE the loan:
    its amount and rate are changed on the loan, which rewrites them (sync_terms_to_ledger). A written-off loan's
    statement is closed."""
    kind = ledger_kind(row.memo, row.credit)
    if kind == "loan" or (kind == "interest" and (row.memo or "").startswith("Interest charged (")):
        return "This row is the loan itself. To change its amount or rate, edit the loan's terms instead."
    if kind == "writeoff" or (app is not None and app.loan_status == "written_off"):
        return "This loan was written off, so its statement is closed."
    return None


def _balance_owed(app):
    """What is owed on an open loan right now. The tracked balance; a zero there means either "never tracked" or "paid
    down to nothing" (a last payment equal to the balance leaves 0 on an unpaid loan), so then the statement itself
    says which: what it charged less what it was paid (the stored running balances are not trusted: older rows have
    a wrong one)."""
    tracked = Decimal(str(app.outstanding_balance)) if app.outstanding_balance else Decimal(0)
    if tracked > 0:
        return tracked
    charged, paid = db.session.query(
        func.coalesce(func.sum(StatementEntry.debit), 0), func.coalesce(func.sum(StatementEntry.credit), 0)
    ).filter(StatementEntry.application_id == app.id).one()
    if charged or paid:
        return max(Decimal(str(charged)) - Decimal(str(paid)), Decimal(0))
    return _balance_due(app)


def _read_amount(raw, what="amount"):
    """(amount, error message): a money amount above zero, to 2 decimals, within what the columns hold."""
    try:
        amount = Decimal(str(raw)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError, TypeError):
        return None, f"Enter the {what}."
    if not amount.is_finite() or amount <= 0:
        return None, f"The {what} must be more than zero."
    if amount > MAX_LOAN_AMOUNT:
        return None, f"That {what} is too large."
    return amount, None


def _read_when(raw, what="date"):
    """(date and time, error message) from what the browser sends, kept exactly as typed. A day of slack on 'now', because
    the browser's clock can be a few hours ahead of the server's."""
    try:
        when = datetime.fromisoformat(str(raw)).replace(tzinfo=None)
    except ValueError:
        return None, "That date and time is not valid."
    if when > datetime.now() + relativedelta(days=1):
        return None, f"The {what} cannot be in the future."
    return when, None


def _statement_net(app):
    """What the loan's statement charged less what it was paid (negative when it holds more payments than charges)."""
    charged, paid = db.session.query(
        func.coalesce(func.sum(StatementEntry.debit), 0), func.coalesce(func.sum(StatementEntry.credit), 0)
    ).filter(StatementEntry.application_id == app.id).one()
    return Decimal(str(charged)) - Decimal(str(paid))


def _ledger_plan(app, row, new_debit, new_credit, row_stays):
    """What changing a statement row to new_debit / new_credit does to its loan (new amounts 0 and row_stays False means
    deleting it): the balance owed before and after, and whether the loan becomes paid or open again. Delete and amend
    both use it, so a preview and the real change can never disagree."""
    old_debit, old_credit = Decimal(str(row.debit or 0)), Decimal(str(row.credit or 0))
    status_before = app.repayment_status
    paid = status_before == "paid"
    before = Decimal(0) if paid else _balance_owed(app)
    # A paid loan owes nothing, but its statement can hold more payments than charges (an interest line lowered after the
    # loan was marked paid). That credit is still there: the next change starts from it, so lowering the payment to match
    # the lowered interest leaves the loan paid instead of reopening it. Older loans with rows missing (more charged than
    # paid) start from zero, as before.
    start = min(_statement_net(app), Decimal(0)) if paid else before
    after = (start + (new_debit - old_debit) - (new_credit - old_credit)).quantize(Decimal("0.01"))
    status_after = status_before
    if after <= 0 and not paid:
        status_after = "paid"  # nothing is owed any more; a zero balance on an open loan would read as "not tracked yet"
    elif after > 0 and paid:
        other_payment = StatementEntry.query.filter(
            StatementEntry.application_id == app.id, StatementEntry.id != row.id, StatementEntry.credit > 0
        ).first() is not None
        status_after = "partially_paid" if (other_payment or (row_stays and new_credit > 0)) else "unpaid"
    return before, after, status_before, status_after


PENALTY_STATUSES = ("unpaid", "partially_paid", "delinquent", "defaulted", "escalated")


@application.route('/applications/penalty/<string:application_id>', methods=['POST'])
@jwt_required()
@role_required("admin")
def add_penalty(application_id):
    """Charge a penalty on an open (disbursed, not yet paid) loan: a debit on its statement, "Penalty: <description>",
    that raises the balance owed. Like the daily job's collection fee it leaves the loan's repayment amount alone
    (that is the contract total) and never touches late_payment_fee (a value there marks the loan as defaulted in the
    credit statistics). The date and time are kept as typed; a backdated penalty re-balances the rows after it.
    The borrower is emailed about it unless the request says notify: false."""
    data = request.get_json(silent=True) or {}

    amount, problem = _read_amount(data.get("amount"), "penalty amount")
    if problem:
        return jsonify({"error": problem}), 400

    description = " ".join(str(data.get("description") or "").split())
    if len(description) < 3:
        return jsonify({"error": "Describe the penalty (at least 3 characters)."}), 400
    if len(description) > 120:
        return jsonify({"error": "Keep the penalty description to 120 characters or fewer."}), 400

    when = datetime.now()
    if data.get("date"):
        when, problem = _read_when(data["date"], "penalty")
        if problem:
            return jsonify({"error": problem.replace("cannot be in the future", "cannot be dated in the future")}), 400

    app = db.session.query(Application).with_for_update().filter_by(id=application_id).first()
    if not app:
        db.session.rollback()
        return jsonify({"error": "Application not found"}), 404
    if app.created_at and when.date() < app.created_at.date():
        db.session.rollback()
        return jsonify({"error": "The penalty cannot be dated before the loan was applied for."}), 400
    if app.loan_status != "disbursed":
        db.session.rollback()
        return jsonify({"error": "A penalty can only be added to a disbursed loan."}), 409
    if app.repayment_status not in PENALTY_STATUSES:
        db.session.rollback()
        return jsonify({"error": f"This loan is already {app.repayment_status.replace('_', ' ')}, so a penalty cannot be added."}), 409

    memo = f"Penalty: {description}"
    if StatementEntry.query.filter_by(application_id=app.id, memo=memo, debit=amount, date=when).first():
        db.session.rollback()
        return jsonify({"error": "This penalty is already on the statement."}), 409

    before = _balance_owed(app)
    after = (before + amount).quantize(Decimal("0.01"))
    if after > Decimal("9999999999.99"):
        db.session.rollback()
        return jsonify({"error": "That penalty would make the balance too large to store."}), 400

    # a backdated penalty sits before some rows: they carried a balance without it
    later = StatementEntry.query.filter(StatementEntry.application_id == app.id, StatementEntry.date > when)
    if later.count():
        previous = StatementEntry.query.filter(
            StatementEntry.application_id == app.id, StatementEntry.date <= when
        ).order_by(StatementEntry.date.desc()).first()
        row_balance = (Decimal(str(previous.balance)) if previous else Decimal(0)) + amount
        for row in later.all():
            row.balance = Decimal(str(row.balance)) + amount
    else:
        row_balance = after

    entry = StatementEntry(
        applicant_id=app.applicant_id, application_id=app.id, memo=memo,
        debit=amount, credit=Decimal(0), balance=row_balance, date=when,
    )
    db.session.add(entry)
    app.outstanding_balance = after

    email, role, company = _actor()
    db.session.add(ApplicationAudit(
        application_id=app.id,
        application_old_loan_amount=float(app.amount_applied or 0),
        application_new_loan_amount=float(app.amount_applied or 0),
        application_old_repayment_amount=float(app.repayment_amount or 0),
        application_new_repayment_amount=float(app.repayment_amount or 0),
        field_name="outstanding_balance",
        old_status=str(before),
        new_status=str(after),
        changed_by_email=email,
        changed_by_role=role,
        changed_by_company=company,
        notes=f'Penalty of KES {amount:,.2f} charged: "{description}" (dated {when.strftime("%d %b %Y %H:%M")}).'
    ))
    db.session.commit()

    # the borrower is told unless the admin switched that off (entering old penalties from records, say)
    emailed = notify_penalty(app, amount, description, when, after) if data.get("notify") is not False else False
    return jsonify({
        "message": "Penalty added",
        "balance_owed": float(after),
        "borrower_emailed": emailed,
        "entry": {"id": entry.id, "memo": memo, "debit": float(amount), "date": when.isoformat()},
    }), 201


@application.route('/applications/statement-entry/<string:entry_id>', methods=['DELETE'])
@jwt_required()
@role_required("admin")
def delete_statement_entry(entry_id):
    """Delete a statement row that was recorded in error (a payment, rollover interest or a fee) and put its loan back
    as if the row had never been recorded: the loan's balance, the running balance on every later row, the payment and
    interest counters, and (when the balance says so) paid / unpaid. Written to the loan's change history with the reason.
    With ?dry_run=1 nothing changes: the answer says what would happen, for the confirmation dialog."""
    dry_run = request.args.get("dry_run") in ("1", "true")
    if dry_run:
        g.audit_recorded = True  # a preview changes nothing, whatever it answers, so the audit hook must not log it
    row = db.session.query(StatementEntry).with_for_update().filter_by(id=entry_id).first()
    if not row:
        db.session.rollback()
        return jsonify({"error": "This entry no longer exists. Refresh the statement."}), 404
    app = db.session.query(Application).with_for_update().filter_by(id=row.application_id).first() if row.application_id else None
    blocked = ledger_delete_block(row, app)
    if blocked:
        db.session.rollback()
        return jsonify({"error": blocked}), 409

    debit, credit = Decimal(str(row.debit or 0)), Decimal(str(row.credit or 0))
    kind = ledger_kind(row.memo, credit)
    answer = {"entry": {"id": row.id, "memo": row.memo, "kind": kind, "debit": float(debit), "credit": float(credit),
                        "date": row.date.isoformat() if row.date else None}}

    if app:
        before, after, status_before, status_after = _ledger_plan(app, row, Decimal(0), Decimal(0), False)
        later_rows = StatementEntry.query.filter(
            StatementEntry.application_id == app.id, StatementEntry.id != row.id, StatementEntry.date > row.date
        ) if row.date is not None else None
        answer["loan"] = {
            "balance_before": float(before), "balance_after": float(max(after, Decimal(0))),
            "status_before": status_before, "status_after": status_after,
            "in_credit": float(-after) if after < 0 else 0.0,
            "later_rows": later_rows.count() if later_rows is not None else 0,
        }

    if dry_run:
        db.session.rollback()
        return jsonify({**answer, "dry_run": True}), 200

    reason = ((request.get_json(silent=True) or {}).get("reason") or "").strip()[:200] or "Recorded in error"
    if app:
        old_repayment = float(app.repayment_amount or 0)
        if later_rows is not None:
            # every later row of this loan carried the removed amount in its running balance
            for later in later_rows.all():
                later.balance = Decimal(str(later.balance)) - (debit - credit)
        app.outstanding_balance = max(after, Decimal(0))
        if kind == "interest":  # rollover interest was added to the repayment amount as well
            app.repayment_amount = Decimal(str(app.repayment_amount)) - debit
            app.interest_charged_count = max(0, (app.interest_charged_count or 0) - 1)
        if (row.memo or "").startswith("Partially paid"):
            app.partially_paid_count = max(0, (app.partially_paid_count or 0) - 1)

        email, role, company = _actor()
        what = f"payment of KES {credit:,.2f}" if credit > 0 else f"charge of KES {debit:,.2f}"
        db.session.add(ApplicationAudit(
            application_id=app.id,
            application_old_loan_amount=float(app.amount_applied or 0),
            application_new_loan_amount=float(app.amount_applied or 0),
            application_old_repayment_amount=old_repayment,
            application_new_repayment_amount=float(app.repayment_amount or 0),
            field_name="outstanding_balance",
            old_status=str(before),
            new_status=str(max(after, Decimal(0))),
            changed_by_email=email,
            changed_by_role=role,
            changed_by_company=company,
            notes=f'Deleted the statement entry "{row.memo}" ({what}, dated {row.date.strftime("%d %b %Y") if row.date else "no date"}). Reason: {reason}.'
        ))
        if status_after != status_before:
            update_repayment_status(app, status_after, email, role, company,
                                    notes=f'Changed because the statement entry "{row.memo}" was deleted', commit=False)

    db.session.delete(row)
    db.session.commit()
    return jsonify({**answer, "dry_run": False, "message": "Entry deleted"}), 200


def _plain_number(value):
    """3000.00 -> "3000", 2500.50 -> "2500.5" (the way a payment's description writes its amount)."""
    return format(Decimal(value).normalize(), "f")


@application.route('/applications/statement-entry/<string:entry_id>', methods=['PATCH'])
@jwt_required()
@role_required("admin")
def amend_statement_entry(entry_id):
    """Correct a statement row (a payment, rollover interest, a penalty or a fee): its amount, its date and time, its
    description. The row keeps its kind (a payment stays a payment). The loan follows: its balance (rollover interest
    also its repayment amount), paid / unpaid when the balance says so, and the running balance of every other row,
    which moves by the row's effect on the rows that now come after it instead of before it. Written to the loan's
    change history with the reason. With ?dry_run=1 nothing changes: the answer says what would happen."""
    dry_run = request.args.get("dry_run") in ("1", "true")
    if dry_run:
        g.audit_recorded = True  # a preview changes nothing, whatever it answers, so the audit hook must not log it
    data = request.get_json(silent=True) or {}
    row = db.session.query(StatementEntry).with_for_update().filter_by(id=entry_id).first()
    if not row:
        db.session.rollback()
        return jsonify({"error": "This entry no longer exists. Refresh the statement."}), 404
    app = db.session.query(Application).with_for_update().filter_by(id=row.application_id).first() if row.application_id else None
    blocked = ledger_delete_block(row, app)
    if blocked:
        db.session.rollback()
        return jsonify({"error": blocked}), 409

    def refuse(message, status=400):
        db.session.rollback()
        return jsonify({"error": message}), status

    old_debit, old_credit = Decimal(str(row.debit or 0)), Decimal(str(row.credit or 0))
    is_payment = old_credit > 0
    kind = ledger_kind(row.memo, old_credit)
    old_amount = old_credit if is_payment else old_debit
    old_date, old_memo = row.date, row.memo

    # ---- what the admin asked for (anything left out stays as it is)
    new_amount = old_amount
    if data.get("amount") not in (None, ""):
        new_amount, problem = _read_amount(data["amount"])
        if problem:
            return refuse(problem)
    new_date = old_date
    if data.get("date"):
        new_date, problem = _read_when(data["date"], "date")
        if problem:
            return refuse(problem)
        if old_date is not None and new_date.replace(second=0, microsecond=0) == old_date.replace(second=0, microsecond=0):
            new_date = old_date  # the browser sends minutes only: the same minute is not a change
        if app and app.created_at and new_date.date() < app.created_at.date():
            return refuse("The date cannot be before the loan was applied for.")
    new_memo = old_memo
    if "description" in data:
        new_memo = " ".join(str(data.get("description") or "").split())
        if len(new_memo) < 3:
            return refuse("Describe the entry (at least 3 characters).")
        if len(new_memo) > 200:
            return refuse("Keep the description to 200 characters or fewer.")
    if new_memo == old_memo and new_amount != old_amount and old_memo.startswith("Partially paid ") and old_memo[len("Partially paid "):].replace(".", "").replace(",", "").isdigit():
        new_memo = f"Partially paid {_plain_number(new_amount)}"  # a payment's description carries its amount: keep them together
    if new_memo != old_memo:
        low = new_memo.lower()
        if low == "new loan applied" or low.startswith("loan written off") or new_memo.startswith("Interest charged ("):
            return refuse("That description is kept for the loan's own lines. Choose another.")
        if ledger_kind(new_memo, old_credit) != kind:
            return refuse("That description would turn this line into a different kind of entry. Keep its wording (for example a payment's or an interest charge's).")

    new_debit, new_credit = (Decimal(0), new_amount) if is_payment else (new_amount, Decimal(0))
    changes = [name for name, differs in (("amount", new_amount != old_amount), ("date", new_date != old_date), ("description", new_memo != old_memo)) if differs]
    answer = {
        "entry": {"id": row.id, "memo": old_memo, "kind": kind, "amount": float(old_amount), "date": old_date.isoformat() if old_date else None},
        "new": {"memo": new_memo, "amount": float(new_amount), "date": new_date.isoformat() if new_date else None},
        "changes": changes,
    }
    if not changes:
        if dry_run:
            db.session.rollback()
            return jsonify({**answer, "unchanged": True, "dry_run": True}), 200
        return refuse("Nothing was changed.")

    e_old, e_new = old_debit - old_credit, new_debit - new_credit
    others = StatementEntry.query.filter(StatementEntry.application_id == app.id, StatementEntry.id != row.id).all() if app else []

    def shift_of(other):
        """How much this change moves another row's running balance: it now carries the row if the row comes before it
        (new date), and no longer carries it if it used to (old date)."""
        if other.date is None:
            return Decimal(0)
        return (e_new if (new_date is not None and other.date > new_date) else Decimal(0)) - (e_old if (old_date is not None and other.date > old_date) else Decimal(0))

    if app:
        before, after, status_before, status_after = _ledger_plan(app, row, new_debit, new_credit, True)
        if is_payment and after < 0:
            return refuse(f"That is KES {-after:,.2f} more than the borrower owes. A payment cannot be more than the balance owed.")
        answer["loan"] = {
            "balance_before": float(before), "balance_after": float(max(after, Decimal(0))),
            "status_before": status_before, "status_after": status_after,
            "in_credit": float(-after) if after < 0 else 0.0,
            "rows_rebalanced": sum(1 for o in others if shift_of(o) != 0),
        }
        if kind == "interest":
            answer["loan"]["repayment_before"] = float(Decimal(str(app.repayment_amount)))
            answer["loan"]["repayment_after"] = float(Decimal(str(app.repayment_amount)) + (new_debit - old_debit))

    if dry_run:
        db.session.rollback()
        return jsonify({**answer, "dry_run": True}), 200

    reason = (str(data.get("reason") or "")).strip()[:200] or "Corrected"
    if app:
        old_repayment = float(app.repayment_amount or 0)
        for other in others:
            shift = shift_of(other)
            if shift != 0:
                other.balance = Decimal(str(other.balance)) + shift
        row.memo, row.debit, row.credit, row.date = new_memo, new_debit, new_credit, new_date
        previous = [o for o in others if o.date is not None and new_date is not None and o.date <= new_date]
        if any(o.date is not None and new_date is not None and o.date > new_date for o in others):
            last_before = max(previous, key=lambda o: o.date) if previous else None
            row.balance = (Decimal(str(last_before.balance)) if last_before else Decimal(0)) + e_new
        else:
            row.balance = after  # the latest row of the loan: its balance is what the loan owes
        app.outstanding_balance = max(after, Decimal(0))
        if kind == "interest":  # rollover interest is part of the repayment amount as well
            app.repayment_amount = Decimal(str(app.repayment_amount)) + (new_debit - old_debit)

        email, role, company = _actor()
        stamp = lambda d, fmt: d.strftime(fmt) if d else "no date"
        said = []
        if "amount" in changes:
            said.append(f"amount KES {old_amount:,.2f} to KES {new_amount:,.2f}")
        if "date" in changes:
            said.append(f'date {stamp(old_date, "%d %b %Y %H:%M")} to {stamp(new_date, "%d %b %Y %H:%M")}')
        if "description" in changes:
            said.append(f'description "{old_memo}" to "{new_memo}"')
        notes = f'Amended the statement entry "{old_memo}": {"; ".join(said)}. Reason: {reason}.'
        balance_changed = before != max(after, Decimal(0))
        db.session.add(ApplicationAudit(
            application_id=app.id,
            application_old_loan_amount=float(app.amount_applied or 0),
            application_new_loan_amount=float(app.amount_applied or 0),
            application_old_repayment_amount=old_repayment,
            application_new_repayment_amount=float(app.repayment_amount or 0),
            field_name="outstanding_balance" if balance_changed else "statement_entry",
            old_status=str(before) if balance_changed else f'{old_memo} | {stamp(old_date, "%d %b %Y")}',
            new_status=str(max(after, Decimal(0))) if balance_changed else f'{new_memo} | {stamp(new_date, "%d %b %Y")}',
            changed_by_email=email, changed_by_role=role, changed_by_company=company,
            notes=notes,
        ))
        if status_after != status_before:
            update_repayment_status(app, status_after, email, role, company,
                                    notes=f'Changed because the statement entry "{old_memo}" was amended', commit=False)
    else:
        row.memo, row.debit, row.credit, row.date = new_memo, new_debit, new_credit, new_date

    db.session.commit()
    return jsonify({**answer, "dry_run": False, "message": "Entry amended"}), 200


@application.route('/applications/disbursement-date/<string:application_id>', methods=['PATCH'])
@jwt_required()
@role_required("admin")
def set_disbursement_date(application_id):
    """Enter (or correct) the date a loan was disbursed, for loans whose change history does not have it (disbursed
    before the history existed) or has it wrong. {"date": "YYYY-MM-DD", "reason": "..."}; {"date": null} removes a date
    entered by hand again (the history, if any, shows through). Written to the loan's change history."""
    data = request.get_json(silent=True) or {}
    app = db.session.query(Application).with_for_update().filter_by(id=application_id).first()
    if not app:
        db.session.rollback()
        return jsonify({"error": "Application not found"}), 404

    def refuse(message, status=400):
        db.session.rollback()
        return jsonify({"error": message}), status

    if app.loan_status not in ("disbursed", "written_off"):
        return refuse("Only a loan that has been disbursed has a disbursement date.", 409)

    raw = data.get("date")
    new_value = None
    if raw not in (None, ""):
        try:
            day = datetime.strptime(str(raw), "%Y-%m-%d")
        except ValueError:
            return refuse("Enter a valid date.")
        if day.date() > (datetime.now() + relativedelta(days=1)).date():
            return refuse("The disbursement date cannot be in the future.")
        if day.year < 2000:
            return refuse("That date is too far back. Check the year.")
        new_value = day.replace(hour=12)  # noon UTC: every time zone shows the same calendar day
    elif app.disbursement_date is None:
        return refuse("No date was entered by hand for this loan, so there is nothing to remove.")
    if new_value == app.disbursement_date:
        return refuse("That is already the disbursement date.")

    def shown(entry):  # East Africa Time, like the other notices
        return (entry[0] + timedelta(hours=3)).strftime("%d %b %Y") if entry else "not recorded"

    before = _disbursement_by_app([app]).get(app.id)
    app.disbursement_date = new_value
    db.session.flush()
    after = _disbursement_by_app([app]).get(app.id)
    reason = (str(data.get("reason") or "")).strip()[:200]
    email, role, company = _actor()
    action = "Removed the date entered by hand" if new_value is None else ("Corrected the disbursement date" if before else "Entered the disbursement date")
    db.session.add(ApplicationAudit(
        application_id=app.id,
        application_old_loan_amount=float(app.amount_applied or 0), application_new_loan_amount=float(app.amount_applied or 0),
        application_old_repayment_amount=float(app.repayment_amount or 0), application_new_repayment_amount=float(app.repayment_amount or 0),
        field_name="disbursement_date",
        old_status=shown(before), new_status=shown(after),
        changed_by_email=email, changed_by_role=role, changed_by_company=company,
        notes=f"{action}." + (f" Reason: {reason}." if reason else ""),
    ))
    db.session.commit()
    return jsonify({
        "message": "Disbursement date saved",
        "disbursed_at": after[0] if after else None,
        "disbursed_at_source": after[1] if after else None,
    }), 200


@application.route('/applications/reverse-transaction/<string:txn_id>', methods=['POST'])
@jwt_required()
@role_required("admin")
def reverse_transaction(txn_id):
    from website.models import StatementEntry, AuditTrail
    from decimal import Decimal
    from flask_jwt_extended import get_jwt_identity
    from website.models import User
    
    admin_id = get_jwt_identity()
    admin_user = User.query.get(admin_id)
    
    # Use with_for_update for StatementEntry and Application
    txn = db.session.query(StatementEntry).with_for_update().filter_by(id=txn_id).first()
    if not txn:
        return jsonify({'error': 'Transaction not found'}), 404
        
    if txn.is_reversed:
        db.session.rollback()
        return jsonify({'error': 'Transaction is already reversed'}), 409
        
    app = db.session.query(Application).with_for_update().filter_by(id=txn.application_id).first()
    if not app:
        db.session.rollback()
        return jsonify({'error': 'Application not found for transaction'}), 404
        
    # Reversal Logic
    reversal_credit = txn.debit
    reversal_debit = txn.credit
    
    current_balance = Decimal(app.outstanding_balance) if app.outstanding_balance else Decimal(app.repayment_amount)
    new_balance = current_balance + reversal_debit - reversal_credit
    app.outstanding_balance = str(new_balance)
    
    if new_balance > 0 and app.repayment_status == 'paid':
        app.repayment_status = 'unpaid'
        
    txn.is_reversed = True
        
    reversal_stmt = StatementEntry(
        applicant_id=txn.applicant_id,
        application_id=txn.application_id,
        memo=f"Reversal of txn {txn_id}",
        debit=reversal_debit,
        credit=reversal_credit,
        balance=new_balance,
        company=app.company
    )
    
    audit = AuditTrail(
        application_id=app.id,
        old_status=app.repayment_status,
        new_status="unpaid" if new_balance > 0 else "paid",
        application_old_loan_amount=float(app.amount_applied or 0),
        application_new_loan_amount=float(app.amount_applied or 0),
        application_old_repayment_amount=float(current_balance),
        application_new_repayment_amount=float(new_balance),
        changed_by_email=admin_user.email if admin_user else "admin",
        changed_by_role="admin",
        changed_by_company="LeoCap",
        notes=f"Reversed transaction {txn_id}"
    )
    
    db.session.add(reversal_stmt)
    db.session.add(audit)
    db.session.commit()
    return jsonify({'message': 'Transaction reversed successfully'}), 200


@application.route('/applications/write-off/<string:application_id>', methods=['POST'])
@jwt_required()
@role_required("admin")
def write_off_loan(application_id):
    from website.models import StatementEntry
    from decimal import Decimal
    
    app = Application.query.get(application_id)
    if not app:
        return jsonify({'error': 'Application not found'}), 404
        
    current_balance = Decimal(app.outstanding_balance) if app.outstanding_balance else Decimal(app.repayment_amount)
    if current_balance <= 0:
        return jsonify({'error': 'Balance is already 0 or less'}), 400
        
    app.outstanding_balance = "0"
    app.repayment_amount = "0"
    app.repayment_status = "paid"
    app.loan_status = "written_off"
    
    writeoff_stmt = StatementEntry(
        applicant_id=app.applicant_id,
        application_id=app.id,
        memo="Loan written off",
        debit=Decimal(0),
        credit=current_balance,
        balance=Decimal(0)
    )
    
    db.session.add(writeoff_stmt)
    db.session.commit()
    return jsonify({'message': 'Loan written off successfully'}), 200





def _amount_paid_by_app(app_ids):
    """{application id: what the borrower has paid so far} = the credits on that loan's ledger rows.
    A write-off is a credit in the ledger but not a payment, so it is left out."""
    if not app_ids:
        return {}
    rows = (
        db.session.query(StatementEntry.application_id, func.sum(StatementEntry.credit))
        .filter(StatementEntry.application_id.in_(app_ids), StatementEntry.memo != "Loan written off")
        .group_by(StatementEntry.application_id)
        .all()
    )
    return {app_id: float(total or 0) for app_id, total in rows}


def _disbursement_by_app(apps):
    """{application id: (when, where it came from)}. A date entered by hand (applications.disbursement_date) wins. Otherwise
    the loan's change history has it: the latest change INTO "disbursed" (saving a loan that is already disbursed does
    not count, so the date does not move). Loans disbursed before the history existed, and with no date entered, are absent."""
    found = {a.id: (a.disbursement_date, "entered") for a in apps if a.disbursement_date}
    rest = [a.id for a in apps if a.id not in found]
    if rest:
        rows = db.session.query(ApplicationAudit.application_id, func.max(ApplicationAudit.changed_at)).filter(
            ApplicationAudit.application_id.in_(rest),
            ApplicationAudit.field_name == "loan_status",
            func.lower(ApplicationAudit.new_status) == "disbursed",
            or_(ApplicationAudit.old_status.is_(None), func.lower(ApplicationAudit.old_status) != "disbursed"),
        ).group_by(ApplicationAudit.application_id).all()
        found.update({application_id: (changed_at, "history") for application_id, changed_at in rows})
    return found


def _applications_with_bio_data(apps):
    """Loans as the list pages show them: the loan plus the applicant's details."""
    paid = _amount_paid_by_app([a.id for a in apps])
    disbursed = _disbursement_by_app(apps)
    result = []
    for app in apps:
        applicant = Applicant.query.get(app.applicant_id)
        if applicant:
            result.append({
                "application": {**app.to_dict(), "amount_paid": paid.get(app.id, 0.0),
                                 "disbursed_at": (disbursed.get(app.id) or (None, None))[0], "disbursed_at_source": (disbursed.get(app.id) or (None, None))[1]},
                "bio_data": applicant.to_dict()
            })
    return result


def _staff_applications(staff_role):
    """Loans of staff with this role ("hr" or "finance"), newest first. The staff themselves only get their own.
    HR and finance only ever get their own company's loans (the tenant filter in models.py)."""
    query = Application.query.join(Applicant, Applicant.id == Application.applicant_id).filter(Applicant.role == staff_role)
    if get_jwt().get("role") == staff_role:
        query = query.filter(Application.applicant_id == get_jwt_identity())
    return query.order_by(Application.created_at.desc()).all()


@application.route('/applications/get-all', methods=['GET'])
@jwt_required()
def get_all_applications():
    from flask_jwt_extended import get_jwt_identity, get_jwt
    user_id = get_jwt_identity()
    role = get_jwt().get('role')
    
    if role == 'applicant':
        apps = Application.query.filter_by(applicant_id=user_id).all()
    else:
        apps = Application.query.all()
    # In models.py we have a do_orm_execute hook, so Application.query.all() will ONLY return the tenant's apps!
    return jsonify(_applications_with_bio_data(apps)), 200


@application.route('/applications/get-hr-all', methods=['GET'])
@jwt_required()
@role_required("admin", "super_admin", "hr", "finance")
def get_hr_applications():
    """Loans applied for by HR staff: an HR user sees their own, finance (and admins) see all of them."""
    return jsonify(_applications_with_bio_data(_staff_applications("hr"))), 200


@application.route('/applications/get-finance-all', methods=['GET'])
@jwt_required()
@role_required("admin", "super_admin", "hr", "finance")
def get_finance_applications():
    """Loans applied for by finance staff: a finance user sees their own, HR (and admins) see all of them."""
    return jsonify(_applications_with_bio_data(_staff_applications("finance"))), 200

@application.route('/applications/get-one/<string:application_id>', methods=['GET'])
@jwt_required()
def get_one_application(application_id):
    app = Application.query.filter_by(id=application_id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404
    if get_jwt().get("role") == "applicant" and app.applicant_id != get_jwt_identity():
        return jsonify({"error": "Application not found"}), 404
    applicant = Applicant.query.get(app.applicant_id)
    open_loan = app.loan_status == "disbursed" and app.repayment_status != "paid"
    detail = {
        **app.to_dict(),
        "amount_paid": _amount_paid_by_app([app.id]).get(app.id, 0.0),
        "disbursed_at": (_disbursement_by_app([app]).get(app.id) or (None, None))[0],
        "disbursed_at_source": (_disbursement_by_app([app]).get(app.id) or (None, None))[1],
        "balance_owed": float(_balance_owed(app)) if open_loan else 0.0,
    }
    if get_jwt().get("role") in ("admin", "super_admin"):
        # A part-paid, late or defaulted loan does not stop the borrower applying again (only "unpaid" does), so the admin deciding on
        # this application is told about it. A defaulted loan's loan status is "defaulted"; a late or escalated one stays "disbursed".
        detail["owing_elsewhere"] = [
            {"id": other.id, "balance_owed": float(_balance_owed(other)), "repayment_status": other.repayment_status,
             "due_date": other.due_date.isoformat() if other.due_date else None}
            for other in Application.query.filter(
                Application.applicant_id == app.applicant_id, Application.id != app.id,
                Application.loan_status.in_(["disbursed", "defaulted"]),
                Application.repayment_status.in_(["partially_paid", "delinquent", "escalated", "defaulted"]),
            ).order_by(Application.created_at).all()
        ]
        detail["agreement"] = agreements.summary(app.id)  # None for an application made before acceptances were recorded
    return jsonify({"application": detail, "bio_data": applicant.to_dict() if applicant else {}}), 200

def sync_terms_to_ledger(app):
    """Rewrite the ledger rows created when the loan was applied so they follow the current amount and rate.
    Rollover rows ("Interest charged 15%") and payments are left alone."""
    amount = Decimal(str(app.amount_applied))
    rate = Decimal(str(app.interest_rate))
    if rate > 1:  # tolerate a whole-number percent
        rate = rate / 100
    interest = round(amount * rate, 2)

    applied = StatementEntry.query.filter_by(application_id=app.id, memo="New loan applied").first()
    if applied:
        applied.debit = amount
        applied.balance = amount
    interest_row = StatementEntry.query.filter(
        StatementEntry.application_id == app.id, StatementEntry.memo.like("Interest charged (%")
    ).first()
    if interest_row:
        interest_row.debit = interest
        interest_row.balance = amount + interest
        interest_row.memo = f"Interest charged ({float(rate) * 100}%)"


def _review_refusal(app, own_action):
    """(message, status) when the signed-in HR or finance user must not act on this loan, otherwise None.

    The one rule behind Amend Amount, Approve and Reject: nobody decides on their own application, and a role never reviews
    its own role's loans. HR handles applicants' and finance staff's loans, finance handles applicants' and HR staff's.
    Admins and super admins are not held to it, so a loan can never get stuck. `own_action` completes "You cannot ..."."""
    role = get_jwt().get("role")
    if role not in ("hr", "finance"):
        return None
    owner = Applicant.query.get(app.applicant_id)
    if owner is None:
        return "Application not found", 404
    if owner.id == get_jwt_identity():
        return f"You cannot {own_action} your own application.", 403
    if owner.role == role:
        who = "HR staff are reviewed by finance" if role == "hr" else "finance staff are reviewed by HR"
        return f"Loans of {who}.", 403
    return None


@application.route('/applications/amend/<string:application_id>', methods=['PATCH'])
@jwt_required()
@role_required("admin", "hr", "finance", "super_admin")  # amend can overwrite any column, so staff only
def amend_application(application_id):
    app = Application.query.filter_by(id=application_id).first()
    if not app:
        return jsonify({"error": "Not found"}), 404
    refusal = _review_refusal(app, "amend")  # this route can set loan_status, so it must not be a way round the rule
    if refusal:
        return jsonify({"message": refusal[0]}), refusal[1]
    data = request.get_json()
    actor_email, actor_role, actor_company = _actor()

    # What is about to change, for the audit trail (the two statuses are audited by their own helpers below).
    old_loan, old_repay = float(app.amount_applied or 0), float(app.repayment_amount or 0)
    changes = [
        (k, getattr(app, k), v) for k, v in data.items()
        if hasattr(app, k) and k not in ("id", "loan_status", "repayment_status") and not _same_value(getattr(app, k), v)
    ]
    if data.get("total_repayment_amount") is not None and not _same_value(app.repayment_amount, data["total_repayment_amount"]):
        changes.append(("repayment_amount", app.repayment_amount, data["total_repayment_amount"]))

    if "loan_status" in data:
        update_loan_status(app, data["loan_status"], actor_email, actor_role, actor_company, commit=False)
    if "repayment_status" in data:
        update_repayment_status(app, data["repayment_status"], actor_email, actor_role, actor_company, commit=False)
        
    # The admin terms form sends the new repayment as "total_repayment_amount", which is not a column.
    # Save it as repayment_amount and move outstanding_balance by the same difference, so payments already made are kept.
    if data.get("total_repayment_amount") is not None:
        new_repayment = Decimal(str(data["total_repayment_amount"]))
        old_repayment = Decimal(str(app.repayment_amount))
        outstanding = Decimal(str(app.outstanding_balance)) if app.outstanding_balance else old_repayment
        app.repayment_amount = new_repayment
        app.outstanding_balance = round(outstanding + (new_repayment - old_repayment), 2)

    for k, v in data.items():
        if hasattr(app, k):
            setattr(app, k, v)

    for field, old, new in changes:
        db.session.add(ApplicationAudit(
            application_id=app.id,
            application_old_loan_amount=old_loan,
            application_new_loan_amount=float(app.amount_applied or 0),
            application_old_repayment_amount=old_repay,
            application_new_repayment_amount=float(app.repayment_amount or 0),
            field_name=field,
            old_status=str(old)[:255] if old is not None else None,
            new_status=str(new)[:255],
            changed_by_email=actor_email,
            changed_by_role=actor_role,
            changed_by_company=actor_company,
            notes=f"{field.replace('_', ' ').capitalize()} changed from {old if old is not None else 'empty'} to {new}"[:1000]
        ))

    # A rate or amount change must also show in the ledger, not only on the application.
    if any(k in data for k in ("interest_rate", "amount_applied", "total_repayment_amount")):
        sync_terms_to_ledger(app)
    db.session.commit()
    return jsonify({"message": "Amended", "application": app.to_dict()}), 200

def _amend_amount(application_id):
    """HR's and finance's "Amend Amount": change the amount of a loan that is waiting for review.
    A role never reviews its own role's loans: HR handles applicants' and finance staff's, finance handles applicants' and
    HR staff's. Fees and repayment are worked out from the new amount the way they are at application time, the
    status becomes "amended" and the change is written to the audit trail and the ledger."""
    role = get_jwt().get("role")
    me = Applicant.query.get(get_jwt_identity())
    app = Application.query.filter_by(id=application_id).first()
    if not app or not can_access_application(app):
        return jsonify({"message": "Application not found"}), 404
    refusal = _review_refusal(app, "change the amount of")
    if refusal:
        return jsonify({"message": refusal[0]}), refusal[1]
    owner = Applicant.query.get(app.applicant_id)
    if app.loan_status not in ("pending_processing", "amended"):
        return jsonify({"message": "Only an application that is waiting for review can be amended."}), 400

    data = request.get_json(silent=True) or {}
    try:
        amount = Decimal(str(data.get("amount_applied"))).quantize(Decimal("0.01"))
    except InvalidOperation:
        amount = None
    if amount is None or not amount.is_finite() or amount <= 0 or amount >= MAX_LOAN_AMOUNT:
        return jsonify({"message": "Please enter a valid loan amount."}), 400
    if owner.loan_limit and amount > owner.loan_limit:
        return jsonify({"message": f"This applicant's loan limit is KES {owner.loan_limit:,}."}), 400
    old_amount = Decimal(str(app.amount_applied))
    if amount == old_amount:
        return jsonify({"message": f"The application is already for KES {old_amount:,.2f}."}), 400

    rate = Decimal(str(app.interest_rate or 0))
    if rate > 1:  # tolerate a whole-number percent, as the ledger sync does
        rate = rate / 100
    processing = round(amount * Decimal("0.03"), 2)
    access = round(amount * Decimal("0.02"), 2) if app.loan_type == "salary_advance" else Decimal(0)
    legal = Decimal(str(app.legal_fees or 0))
    disbursement = round(amount - (processing + access + legal), 2)
    if disbursement <= 0:
        return jsonify({"message": "That amount is too small to cover the fees."}), 400
    repayment = round(amount * (rate + 1), 2)
    old_repayment = Decimal(str(app.repayment_amount))
    outstanding = Decimal(str(app.outstanding_balance)) if app.outstanding_balance else old_repayment

    actor_email = me.email if me else "Unknown"
    actor_company = (me.applicant_type if me else None) or "Leocap Invest"
    db.session.add(ApplicationAudit(
        application_id=app.id,
        application_old_loan_amount=float(old_amount),
        application_new_loan_amount=float(amount),
        application_old_repayment_amount=float(old_repayment),
        application_new_repayment_amount=float(repayment),
        field_name="amount_applied",
        old_status=str(old_amount),
        new_status=str(amount),
        changed_by_email=actor_email,
        changed_by_role=role,
        changed_by_company=actor_company,
        notes=f"Amount amended by {role}"
    ))
    app.amount_applied = amount
    app.processing_fees = str(processing)
    app.access_fees = str(access)
    app.disbursement_amount = str(disbursement)
    app.repayment_amount = str(repayment)
    app.outstanding_balance = str(round(outstanding + (repayment - old_repayment), 2))
    if app.loan_status != "amended":
        update_loan_status(app, "amended", actor_email, role, actor_company, commit=False)
    sync_terms_to_ledger(app)
    db.session.commit()
    return jsonify({"message": "Application amended", "application": app.to_dict()}), 200


@application.route('/applications/hr/amend/<string:application_id>', methods=['PATCH'])
@jwt_required()
@role_required("hr")
def hr_amend_application(application_id):
    return _amend_amount(application_id)


@application.route('/applications/finance/amend/<string:application_id>', methods=['PATCH'])
@jwt_required()
@role_required("finance")
def finance_amend_application(application_id):
    return _amend_amount(application_id)


@application.route('/applications/approve/<string:application_id>', methods=['PATCH'])
@jwt_required()
@role_required("admin", "super_admin", "hr", "finance")
def approve_application(application_id):
    app = Application.query.filter_by(id=application_id).first()
    if not app:
        return jsonify({"error": "Not found"}), 404
    refusal = _review_refusal(app, "approve or reject")
    if refusal:
        return jsonify({"message": refusal[0]}), refusal[1]
    update_loan_status(app, "approved", *_actor(), commit=True)
    return jsonify({"message": "Approved", "application": app.to_dict()}), 200

@application.route('/applications/reject/<string:application_id>', methods=['PATCH'])
@jwt_required()
@role_required("admin", "super_admin", "hr", "finance")
def reject_application(application_id):
    app = Application.query.filter_by(id=application_id).first()
    if not app:
        return jsonify({"error": "Not found"}), 404
    refusal = _review_refusal(app, "approve or reject")
    if refusal:
        return jsonify({"message": refusal[0]}), refusal[1]
    data = request.get_json(silent=True) or {}
    msg = data.get("message") or data.get("reason") or "Rejected"  # the admin screen sends "message", the HR and finance screens "reason"
    update_loan_status(app, "declined", *_actor(), notes=msg, commit=True)
    return jsonify({"message": "Rejected", "application": app.to_dict()}), 200

@application.route('/applications/disbursed/<string:application_id>', methods=['PATCH'])
@jwt_required()
@role_required("admin", "super_admin")
def disburse_application(application_id):
    app = Application.query.filter_by(id=application_id).first()
    if not app:
        return jsonify({"error": "Not found"}), 404
    update_loan_status(app, "disbursed", *_actor(), commit=True)
    return jsonify({"message": "Disbursed", "application": app.to_dict()}), 200

# A loan in one of these states was never paid out, so deleting it cannot erase money that moved. Anything else (disbursed,
# defaulted, written off, paid, and any state added later) must stay on the borrower's statement. The frontend repeats this list
# in lib/loanStatus.ts (canDeleteApplication).
NEVER_PAID_OUT = {"pending", "pending_processing", "processing", "amended", "rate_set", "rate_confirmed", "confirmed", "rate_declined", "approved", "declined", "rejected"}


@application.route('/applications/delete/<string:application_id>', methods=['DELETE'])
@jwt_required()
@role_required("admin", "super_admin")
def delete_application(application_id):
    app = Application.query.filter_by(id=application_id).first()
    if not app:
        return jsonify({"error": "Not found"}), 404
    ledger = StatementEntry.query.filter_by(application_id=app.id)
    if app.loan_status not in NEVER_PAID_OUT or app.disbursement_date is not None or ledger.filter(StatementEntry.credit > 0).first():
        return jsonify({"error": "This loan was paid out, so it cannot be deleted: its history must stay on the borrower's statement."}), 409
    # A loan's own audit rows and ledger rows are deleted with it, so what it was and its history are kept in the system log first.
    from website.audit_logs import _record_audit_log
    from website.models import AuditAction
    email, role, _ = _actor()
    borrower = Applicant.query.get(app.applicant_id)
    snapshot = json.loads(json.dumps({
        "application": app.to_dict(),
        "borrower": {"name": borrower.name, "email": borrower.email} if borrower else None,
        "history": [a.to_dict() for a in ApplicationAudit.query.filter_by(application_id=app.id).order_by(ApplicationAudit.changed_at).limit(200)],
        "ledger": [e.to_dict() for e in ledger.order_by(StatementEntry.date).limit(200)],
        "agreement": agreements.summary(app.id),
    }, default=str))
    _record_audit_log(
        action=AuditAction.DELETE,
        description=f"Deleted loan application {app.id[:8]} ({borrower.name if borrower else 'unknown borrower'}, KES {float(app.amount_applied):,.2f}, {app.loan_status})",
        entity_type="Application", entity_id=app.id, actor_id=get_jwt_identity(), actor_email=email, actor_role=role,
        old_values=snapshot,
    )
    try:
        # The database will not delete a loan while rows still point at it: the ledger rows go with it, the borrower's profile
        # documents only lose their link to it (they stay on the profile).
        ledger.delete(synchronize_session=False)
        agreements.delete_for(app.id)
        ApplicantDocument.query.filter_by(application_id=app.id).update({"application_id": None}, synchronize_session=False)
        db.session.delete(app)
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        logging.exception("Could not delete application %s", application_id)
        return jsonify({"error": "The loan could not be deleted. Nothing was changed."}), 500
    return jsonify({"message": "Deleted"}), 200



@application.route('/applications/rate-confirmed/<string:application_id>', methods=['PATCH'])
@jwt_required()
@role_required("applicant")
def confirm_rate(application_id):
    app = Application.query.filter_by(id=application_id, applicant_id=get_jwt_identity()).first()
    if not app:
        return jsonify({"error": "Not found"}), 404
        
    update_loan_status(app, "confirmed", *_actor(), commit=True)
    return jsonify({"message": "Rate confirmed", "application": app.to_dict()}), 200

@application.route('/applications/rate-declined/<string:application_id>', methods=['PATCH'])
@jwt_required()
@role_required("applicant")
def decline_rate(application_id):
    app = Application.query.filter_by(id=application_id, applicant_id=get_jwt_identity()).first()
    if not app:
        return jsonify({"error": "Not found"}), 404
        
    update_loan_status(app, "declined", *_actor(), commit=True)
    return jsonify({"message": "Rate declined", "application": app.to_dict()}), 200


@application.route('/applications/default/<string:application_id>', methods=['PATCH'])
@jwt_required()
@role_required("admin")
def mark_as_default(application_id):
    email, role, company = _actor()
    
    app = db.session.query(Application).with_for_update().filter_by(id=application_id).first()
    if not app:
        db.session.rollback()
        return jsonify({'error': 'Application not found'}), 404
        
    allowed_statuses = ["unpaid", "partially_paid", "delinquent"]
    if app.repayment_status not in allowed_statuses:
        db.session.rollback()
        return jsonify({'error': 'Application cannot be marked as defaulted'}), 403
        
    old_status = app.repayment_status
    app.repayment_status = 'defaulted'
    
    update_loan_status(app, "defaulted", email, role, company, notes="Marked as defaulted", commit=False)
    db.session.commit()
    
    return jsonify({'message': 'Application marked as defaulted'}), 200
