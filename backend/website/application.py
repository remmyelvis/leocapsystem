import os
from decimal import Decimal
from io import BytesIO
import math

import pandas as pd
from flask import Blueprint, request, jsonify, current_app, send_file
from werkzeug.utils import secure_filename
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from uuid import uuid4
from sqlalchemy.exc import SQLAlchemyError

from website.export_service import export_applicant, export_application, export_statement
from website.export_service import escalation_to_pdf
from website.system_email_utils import send_email_smtp
from website.models import Application, Applicant, ApplicationDocument, HrEmail, Email, ApplicationAudit, User, StatementEntry, Company, ApplicantDocument
from website import db, Config
from website.role_decorator import role_required
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

@application.route('/applications', methods=['POST'])
@jwt_required()
@role_required("applicant", "hr", "finance")
def create_application():
    data = request.form

    applicant_id = get_jwt_identity()

    role = get_jwt().get("role")

    applicant = Applicant.query.get(applicant_id)

    unpaid_count = (
        Application.query
        .filter_by(applicant_id=applicant_id, repayment_status="unpaid")
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

    application_id = str(uuid4())
    am = data.get("amount_applied")

    amount = Decimal(am)
    processing = round((amount * Decimal(0.03)), 2)
    access = 0

    repayment = round((amount * (Decimal(data.get('interest_rate')) + 1)), 2)

    new_application = Application(
        id=application_id,
        employment_type=data.get('employment_type'),
        company=data.get('company'),
        employment_nature=data.get('employment_nature'),
        payroll_number=data.get('payroll_number'),
        designation=data.get('designation'),
        is_first_time_applicant=data.get('is_first_time_applicant'),  # use lowercase
        month_one=data.get('month_one'),
        month_two=data.get('month_two'),
        month_three=data.get('month_three'),
        loan_type=data.get('loan_type'),
        loan_purpose=data.get('loan_purpose'),
        amount_applied=data.get('amount_applied'),
        processing_fees=str(processing),
        repayment_amount=str(repayment),
        outstanding_balance=str(repayment),
        interest_rate=data.get('interest_rate'),
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

    amount_applied = Decimal(str(data.get("amount_applied")))
    interest_rate = Decimal(str(data.get("interest_rate")))
    interest_amount = amount_applied * interest_rate  # confirm rate is a fraction, not a whole-number percent

    statement_entry_one = StatementEntry(
        applicant_id=applicant_id,
        application_id=application_id,
        memo="New loan applied",
        debit=amount_applied,
        credit=Decimal(0),
        balance=amount_applied,
        company=applicant.company
    )
    db.session.add(statement_entry_one)

    statement_entry_interest = StatementEntry(
        applicant_id=applicant_id,
        application_id=application_id,
        memo=f"Interest charged ({float(interest_rate)*100}%)",
        debit=interest_amount,
        credit=Decimal(0),
        balance=amount_applied + interest_amount,
        company=applicant.company
    )
    db.session.add(statement_entry_interest)

    db.session.commit()

    return jsonify({
        'message': 'Application created successfully',
        'application': new_application.to_dict()
    }), 201

@application.route('/applications/paid/<string:application_id>', methods=['PATCH'])
@jwt_required()
@role_required("admin")
def mark_as_paid(application_id):
    from flask_jwt_extended import get_jwt_identity
    email = get_jwt_identity()
    role = get_jwt().get("role")
    
    app = db.session.query(Application).with_for_update().filter_by(id=application_id).first()
    if not app:
        db.session.rollback()
        return jsonify({'error': 'Application not found'}), 404
        
    if app.repayment_status == 'paid':
        db.session.rollback()
        return jsonify({'message': 'Already paid'}), 200
        
    old_status = app.repayment_status
    app.repayment_status = 'paid'
    
    from decimal import Decimal
    stmt = StatementEntry(
        applicant_id=app.applicant_id,
        application_id=app.id,
        memo="Loan paid",
        debit=Decimal(0),
        credit=Decimal(app.outstanding_balance) if app.outstanding_balance and float(app.outstanding_balance) > 0 else Decimal(app.repayment_amount),
        balance=Decimal(0),
        company=app.company
    )
    db.session.add(stmt)
    
    app.outstanding_balance = "0"
    app.repayment_amount = "0"
    
    audit = AuditTrail(
        application_id=app.id,
        old_status=old_status,
        new_status="paid",
        application_old_loan_amount=float(app.amount_applied or 0),
        application_new_loan_amount=float(app.amount_applied or 0),
        application_old_repayment_amount=float(app.repayment_amount or 0),
        application_new_repayment_amount=0.0,
        changed_by_email=email,
        changed_by_role=role,
        changed_by_company="Leocap",
        notes="Loan paid in full"
    )
    db.session.add(audit)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Application marked as paid',
        'application': app.to_dict()
    }), 200


@application.route('/applications/nakama/paid', methods=['PATCH'])
@jwt_required()
@role_required("admin")
def mark_nakama_as_paid():
    updated = (
        Application.query
        .filter(
            Application.loan_type == "salary_advance",
            Application.loan_status == "disbursed",
            Application.company == "nakama"
        )
        .update(
            {"repayment_status": "paid"},
            synchronize_session=False
        )
    )

    db.session.commit()

    return jsonify({
        'message': 'Applications marked as paid successfully'
    }), 200


@application.route('/applications/ideon/paid', methods=['PATCH'])
@jwt_required()
@role_required("admin")
def mark_ideon_as_paid():
    updated = (
        Application.query
        .filter(
            Application.loan_type == "salary_advance",
            Application.loan_status == "disbursed",
            Application.company == "ideon"
        )
        .update(
            {"repayment_status": "paid"},
            synchronize_session=False
        )
    )

    db.session.commit()

    return jsonify({
        'message': 'Applications marked as paid successfully'
    }), 200
    
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
        try:
            from website.system_email_utils import send_email_smtp
            applicant_obj = Applicant.query.get(app.applicant_id)
            if applicant_obj:
                subject = "Loan Fully Repaid - Congratulations"
                body = f"Dear {applicant_obj.name},<br/><br/>Your loan (ID: {app.id}) has been fully repaid. Thank you for using Leocap."
                send_email_smtp(applicant_obj.email, subject, body)
        except Exception as e:
            pass
            
        count += 1

    db.session.commit()

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
            
    # F-004: Overpayment Guard Rails
    amount_paid = float(data.get('amount', 0))
    current_outstanding = float(app.outstanding_balance) if app.outstanding_balance and float(app.outstanding_balance) > 0 else float(app.repayment_amount)
    if amount_paid > current_outstanding:
        amount_paid = current_outstanding  # Cap payment at outstanding balance (or handle overpayment to wallet)
        data['amount'] = amount_paid # Update data so the rest of the function uses the capped amount


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

    allowed_statuses = ["unpaid", "partially_paid", "defaulted", "escalated"]

    if status not in allowed_statuses:
        return jsonify({'error': 'Application cannot be marked as partially paid'}), 403

    app.repayment_status = "partially_paid"
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
        new_status="partially_paid",
        changed_by_email=changed_by_email,
        changed_by_role=changed_by_role,
        changed_by_company="Leocap Invest",
        notes="Partial repayment recorded.",
        commit=False
    )

    # ---------------------------
    # AUDIT: financial impact snapshot
    # ---------------------------
    audit = ApplicationAudit(
        application_id=app.id,

        application_old_loan_amount=float(app.amount_applied),
        application_new_loan_amount=float(app.amount_applied),

        application_old_repayment_amount=old_repayment_amount,
        application_new_repayment_amount=float(app.repayment_amount),

        field_name="partial_payment_adjustment",

        old_status=old_repayment_status,
        new_status=app.repayment_status,

        changed_by_email=changed_by_email,
        changed_by_role=changed_by_role,

        notes="Partial payment processed and repayment balance recalculated."
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
            
    # F-004: Overpayment Guard Rails
    amount_paid = float(data.get('amount', 0))
    current_outstanding = float(app.outstanding_balance) if app.outstanding_balance and float(app.outstanding_balance) > 0 else float(app.repayment_amount)
    if amount_paid > current_outstanding:
        amount_paid = current_outstanding  # Cap payment at outstanding balance (or handle overpayment to wallet)
        data['amount'] = amount_paid # Update data so the rest of the function uses the capped amount


    balance = Decimal(app.repayment_amount)
    interest_rate = Decimal(data.get("interest_rate")) / 100
    new_balance = round((balance * (interest_rate + 1)), 2)
    app.repayment_amount = str(new_balance)

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
        debit=Decimal(interest_rate*balance),
        credit=Decimal(0),
        balance=Decimal(new_balance),
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


@application.route('/applications/escalate/<string:application_id>', methods=['GET'])
@jwt_required()
@role_required("admin")
def escalate(application_id):
    from flask import Response
    from website.export_service import generate_debt_dossier_pdf

    app = db.session.query(Application).filter_by(id=application_id).with_for_update().first()

    if not app:
        return jsonify({'error': 'Application not found'}), 404
        
    data = request.get_json() or {}
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
        return jsonify({'error': 'You can only escalate defaulted loans'}), 403

    app.repayment_status = "escalated"
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


@application.route('/applications/audit-trails', methods=['GET'])
@jwt_required()
@role_required("admin")
def get_audit_trails():
    admin_id = get_jwt_identity()
    admin = User.query.filter_by(id=admin_id).first()

    if not admin:
        return jsonify({"error": "User not found"}), 404

    # ---------------------------
    # Pagination params
    # ---------------------------
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    application_id = request.args.get('application_id', None)

    # ---------------------------
    # Base query
    # ---------------------------
    query = ApplicationAudit.query

    if application_id:
        query = query.filter_by(application_id=application_id)

    # Order newest first
    query = query.order_by(ApplicationAudit.changed_at.desc())

    # ---------------------------
    # Pagination
    # ---------------------------
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    audits = [audit.to_dict() for audit in paginated.items]

    return jsonify({
        "message": "Audit trails retrieved successfully",
        "data": audits,
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
    admin_id = get_jwt_identity()
    admin = User.query.filter_by(id=admin_id).first()

    if not admin:
        return jsonify({"error": "User not found"}), 404

    audit = ApplicationAudit.query.filter_by(id=audit_id).first()

    if not audit:
        return jsonify({"error": "Audit trail not found"}), 404

    return jsonify({
        "message": "Audit trail retrieved successfully",
        "data": audit.to_dict()
    }), 200

@application.route('/applicant/statement/<string:applicant_id>', methods=['GET'])
@jwt_required()
@role_required("admin","applicant")
def get_statement(applicant_id):
    from flask_jwt_extended import get_jwt_identity, get_jwt
    user_id = get_jwt_identity()
    role = get_jwt().get('role')
    if role == 'applicant' and user_id != applicant_id:
        return jsonify({"error": "Unauthorized"}), 403

    if not applicant_id:
        return jsonify({"error": "Please enter an id"}), 404

    app_id = request.args.get("application_id")
    
    query = StatementEntry.query.filter_by(applicant_id=applicant_id)
    if app_id:
        query = query.filter_by(application_id=app_id)
        
    statements = query.order_by(StatementEntry.date.asc()).all()
    
    # Dynamically compute running balances for UI display (matching PDF engine)
    running_balance = 0.0
    results = []
    for s in statements:
        deb = float(s.debit) if s.debit else 0.0
        cred = float(s.credit) if s.credit else 0.0
        running_balance += deb
        running_balance -= cred
        
        # Build dict resembling to_statement but with dynamic balance
        results.append({
            "date": s.date.isoformat() if s.date else None,
            "memo": s.memo,
            "debit": str(deb),
            "credit": str(cred),
            "balance": str(running_balance)
        })

    return jsonify({
        "message": "Here is the users statement",
        "data": results
    }), 200

@application.route('/applicant/statement/download/<string:applicant_id>', methods=['GET'])
@jwt_required()
@role_required("admin", "hr", "finance")
def download_statement(applicant_id):
    
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

    # BASE SCORE
    score = 500
    details = []

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
    result = []
    for app in apps:
        applicant = Applicant.query.get(app.applicant_id)
        if applicant:
            result.append({
                "application": app.to_dict(),
                "bio_data": applicant.to_dict()
            })
    return jsonify(result), 200

@application.route('/applications/get-one/<string:application_id>', methods=['GET'])
@jwt_required()
def get_one_application(application_id):
    app = Application.query.filter_by(id=application_id).first()
    if not app:
        return jsonify({"error": "Application not found"}), 404
    applicant = Applicant.query.get(app.applicant_id)
    return jsonify({
        "application": app.to_dict(),
        "bio_data": applicant.to_dict() if applicant else {}
    }), 200

@application.route('/applications/amend/<string:application_id>', methods=['PATCH'])
@jwt_required()
def amend_application(application_id):
    app = Application.query.filter_by(id=application_id).first()
    if not app:
        return jsonify({"error": "Not found"}), 404
    data = request.get_json()
    
    if "loan_status" in data:
        update_loan_status(app, data["loan_status"], get_jwt_identity(), get_jwt().get("role"), "Leocap", commit=False)
    if "repayment_status" in data:
        update_repayment_status(app, data["repayment_status"], get_jwt_identity(), get_jwt().get("role"), "Leocap", commit=False)
        
    for k, v in data.items():
        if hasattr(app, k):
            setattr(app, k, v)
    db.session.commit()
    return jsonify({"message": "Amended", "application": app.to_dict()}), 200

@application.route('/applications/approve/<string:application_id>', methods=['PATCH'])
@jwt_required()
def approve_application(application_id):
    app = Application.query.filter_by(id=application_id).first()
    if not app:
        return jsonify({"error": "Not found"}), 404
    update_loan_status(app, "approved", get_jwt_identity(), get_jwt().get("role"), "Leocap", commit=True)
    return jsonify({"message": "Approved", "application": app.to_dict()}), 200

@application.route('/applications/reject/<string:application_id>', methods=['PATCH'])
@jwt_required()
def reject_application(application_id):
    app = Application.query.filter_by(id=application_id).first()
    if not app:
        return jsonify({"error": "Not found"}), 404
    data = request.get_json() or {}
    msg = data.get("message", "Rejected")
    update_loan_status(app, "declined", get_jwt_identity(), get_jwt().get("role"), "Leocap", notes=msg, commit=True)
    return jsonify({"message": "Rejected", "application": app.to_dict()}), 200

@application.route('/applications/disbursed/<string:application_id>', methods=['PATCH'])
@jwt_required()
def disburse_application(application_id):
    app = Application.query.filter_by(id=application_id).first()
    if not app:
        return jsonify({"error": "Not found"}), 404
    update_loan_status(app, "disbursed", get_jwt_identity(), get_jwt().get("role"), "Leocap", commit=True)
    return jsonify({"message": "Disbursed", "application": app.to_dict()}), 200

@application.route('/applications/delete/<string:application_id>', methods=['DELETE'])
@jwt_required()
def delete_application(application_id):
    app = Application.query.filter_by(id=application_id).first()
    if not app:
        return jsonify({"error": "Not found"}), 404
    db.session.delete(app)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200

