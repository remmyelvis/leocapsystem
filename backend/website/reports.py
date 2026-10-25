import os
from io import BytesIO

import pandas as pd
from flask import Blueprint, request, jsonify, current_app, send_file
from sqlalchemy import select, or_, and_, case, func
from werkzeug.utils import secure_filename
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from uuid import uuid4

from website.export_service import dataframe_to_excel
from website.system_email_utils import send_email_smtp
from website.models import Application, Applicant, ApplicationDocument, HrEmail, Email, Company
from website import db, Config, export_service
from website.role_decorator import role_required
from flask import Response, abort, make_response

from dotenv import load_dotenv

from datetime import datetime, date
import calendar
import math
from decimal import Decimal

from zipfile import ZipFile, ZIP_DEFLATED

load_dotenv()

reports = Blueprint('reports',__name__, url_prefix='/api/reports')

FILTERABLE_FIELDS = {
    "company": Application.company,
    "employment_type": Application.employment_type,
    "loan_status": Application.loan_status,
    "repayment_status": Application.repayment_status,
    "hr_status": Application.hr_status,
    "loan_type": Application.loan_type,
    "created_at": Application.created_at,
    "month":Application.month
}


def _balance_due(app):
    """What is still owed on a loan: the tracked outstanding balance, or the repayment amount on older loans
    that never had one (their balance is 0.00)."""
    outstanding = float(app.outstanding_balance or 0)
    return outstanding if outstanding > 0 else float(app.repayment_amount or 0)


def _date_range_args():
    """(start, end) datetimes from ?start_date / ?end_date (YYYY-MM-DD, either may be omitted); end covers its whole day.
    Answers 400 for a malformed or reversed range."""
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d") if start_date else None
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59) if end_date else None
    except ValueError:
        abort(make_response(jsonify({"error": "Dates must be in YYYY-MM-DD format."}), 400))
    if start and end and start > end:
        abort(make_response(jsonify({"error": "Start date must not be after end date."}), 400))
    return start, end


# ?sort= keys of the loans table in Reports (the column the admin clicked) -> what to order by.
_SORT_COLUMNS = {
    "created_at": Application.created_at,
    "applied": Application.amount_applied,
    "disbursed": Application.disbursement_amount,
    "repay": Application.repayment_amount,
    "due": Application.due_date,
}


def _sort_clause():
    """ORDER BY list for ?sort=<column>&order=asc|desc (default: newest application first).
    Computed columns match what the table shows: borrower = the applicant's name (ignoring case and stray spaces), status = the loan
    status (or the repayment status once disbursed), owed = what is still owed on an open loan (loans that are not open have
    none and always come last). Blank values always come last; ties fall back to newest first so pages never shuffle."""
    sort = request.args.get("sort", "created_at")
    order = request.args.get("order", "desc")
    if order not in ("asc", "desc"):
        abort(make_response(jsonify({"error": "order must be asc or desc."}), 400))
    is_open = and_(Application.loan_status == "disbursed", Application.repayment_status != "paid")
    computed = {
        "borrower": func.lower(func.trim(Applicant.name)),
        "status": case((Application.loan_status == "disbursed", Application.repayment_status), else_=Application.loan_status),
        "owed": case((is_open, case((Application.outstanding_balance > 0, Application.outstanding_balance), else_=Application.repayment_amount)), else_=None),
    }
    column = _SORT_COLUMNS.get(sort)
    if column is None:
        column = computed.get(sort)
    if column is None:
        abort(make_response(jsonify({"error": "Unknown sort column."}), 400))
    direction = column.asc() if order == "asc" else column.desc()
    clauses = [column.is_(None), direction]  # blanks last either way
    if sort != "created_at":
        clauses.append(Application.created_at.desc())
    clauses.append(Application.id)
    return sort, clauses


@reports.route('/applications/get-all', methods=['GET'])
@jwt_required()
@role_required("admin","hr","finance")
def get_applications_report():
    # Pagination
    page = request.args.get("page", default=1, type=int)
    page_size = request.args.get("page_size", default=10, type=int)

    # Prevent abuse
    page_size = min(max(page_size, 1), 100)

    query = select(Application)

    # Dynamic filtering
    for query_param, model_column in FILTERABLE_FIELDS.items():

        value = request.args.get(query_param)

        if value:
            query = query.where(model_column == value)

    start_dt, end_dt = _date_range_args()
    if start_dt:
        query = query.where(Application.created_at >= start_dt)
    if end_dt:
        query = query.where(Application.created_at <= end_dt)

    search = (request.args.get("search") or "").strip()
    if search:
        like = f"%{search}%"
        matching_applicants = select(Applicant.id).where(or_(
            Applicant.name.ilike(like), Applicant.email.ilike(like), Applicant.phone_number.ilike(like)
        ))
        query = query.where(or_(Application.payroll_number.ilike(like), Application.applicant_id.in_(matching_applicants)))

    sort, order_by = _sort_clause()
    if sort == "borrower":
        query = query.outerjoin(Applicant, Applicant.id == Application.applicant_id)
    query = query.order_by(*order_by)
    
    apps = db.session.execute(query).scalars().all() 
    
    
    total_repayment = 0
    total_applied = 0
    total_disbursed = 0

    today = date.today()
    first_day = today.replace(day=1)
    last_day = today.replace(day=calendar.monthrange(today.year, today.month)[1])

    for app in apps:
        if app.loan_type == "salary_advance":
            total_repayment += Decimal(app.repayment_amount)
            total_applied += Decimal(app.amount_applied)
            total_disbursed += Decimal(app.disbursement_amount)
                

    total_repayment_d = 0
    total_applied_d = 0
    total_disbursed_d = 0

    for app in apps:
        if app.loan_type != "salary_advance":
            total_repayment_d += Decimal(app.repayment_amount)
            total_applied_d += Decimal(app.amount_applied)
            total_disbursed_d += Decimal(app.disbursement_amount)
                

    pagination = db.paginate(
        query,
        page=page,
        per_page=page_size,
        error_out=False
    )

    return jsonify({
        "advance_data":{
            "total_repayment": total_repayment,
            "total_applied": total_applied,
            "total_disbursed": total_disbursed,
        },
        "personal_data": {
            "total_repayment": total_repayment_d,
            "total_applied": total_applied_d,
            "total_disbursed": total_disbursed_d,
        },
        "data": [
            {
                "created_at": application.created_at,
                "applicant_id": Applicant.query.get(application.applicant_id).name,
                "applicant_name": Applicant.query.get(application.applicant_id).name,
                "company": application.company,
                "loan_type": application.loan_type,
                "amount_applied": application.amount_applied,
                "disbursement_amount": application.disbursement_amount,
                "loan_status": application.loan_status,
                "id": application.id,
                "repayment_amount": application.repayment_amount,
                "outstanding_balance": application.outstanding_balance,
                "due_date": application.due_date.isoformat() if application.due_date else None,
                "repayment_status": application.repayment_status
            }
            for application in pagination.items
        ],
        "pagination": {
            "page": pagination.page,
            "page_size": pagination.per_page,
            "total_pages": pagination.pages,
            "total_records": pagination.total,
            "has_next": pagination.has_next,
            "has_prev": pagination.has_prev
        }
    }), 200
    
    
@reports.route('/applications/get-all/repayment/nakama/amount', methods=['GET'])
@jwt_required()
@role_required("admin","hr","finance")
def get_all_repayment_nakama_amount():
    month = request.args.get("month")
    
    apps = (
        Application.query
        .filter_by(repayment_status="unpaid", company="nakama", month=month)
        .all()
    )

    total_repayment = 0.0
    total_applied = 0.0
    total_disbursed = 0.0

    for app in apps:
        total_repayment += Decimal(app.repayment_amount)
        total_applied += Decimal(app.amount_applied)
        total_disbursed += Decimal(app.disbursement_amount)

    return jsonify({
        "data": {
            "total_repayment": round(total_repayment,2),
            "total_applied": round(total_applied,2),
            "total_disbursed": round(total_disbursed,2),
        }
    }), 200


@reports.route('/applications/get-all/repayment/ideon/amount', methods=['GET'])
@jwt_required()
@role_required("admin", "hr", "finance")
def get_all_repayment_ideon_amount():
    month = request.args.get("month")
    
    apps = (
        Application.query
        .filter_by(repayment_status="unpaid", company="ideon",month=month)
        .all()
    )
    
    if len(apps) == 0:
        return jsonify({"message":"list empty"}), 200

    total_repayment = 0.0
    total_applied = 0.0
    total_disbursed = 0.0

    for app in apps:
        total_repayment += Decimal(app.repayment_amount)
        total_applied += Decimal(app.amount_applied)
        total_disbursed += Decimal(app.disbursement_amount)

    return jsonify({
        "data": {
            "total_repayment": round(total_repayment,2),
            "total_applied": round(total_applied,2),
            "total_disbursed": round(total_disbursed,2),
        }
    }), 200   

@reports.route('/applications/get-all/repayment/nakama/excel', methods=['GET'])
@jwt_required()
@role_required("admin","hr","finance")
def get_all_repayment_nakama_excel():
    return _repayment_excel_response("nakama", **NAKAMA_ACCOUNT)


@reports.route('/applications/get-all/repayment/ideon/excel', methods=['GET'])
@jwt_required()
@role_required("admin","hr","finance")
def get_all_repayment_ideon_excel():
    return _repayment_excel_response("ideon")

@reports.route('/applications/get-all/repayment/nakama/pdf', methods=['GET'])
@jwt_required()
@role_required("admin","hr","finance")
def get_all_repayment_nakama_pdf():
    # Same report as the admin one; Nakama's payment instructions name Nakama's own account.
    return _repayment_pdf_response("nakama", **NAKAMA_ACCOUNT)


@reports.route('/applications/get-all/repayment/ideon/pdf', methods=['GET'])
@jwt_required()
@role_required("admin","hr","finance")
def get_all_repayment_ideon_pdf():
    return _repayment_pdf_response("ideon")


@reports.route('/applications/get-all/repayment/company/<identifier>/amount', methods=['GET'])
@jwt_required()
@role_required("admin", "hr", "finance")
def get_company_repayment_amount(identifier):
    """Retrieve aggregate repayment amounts for any company."""
    company = Company.query.filter(
        (Company.id == identifier) | (Company.code == identifier.lower())
    ).first()

    comp_code = company.code if company else identifier.lower()
    month = request.args.get("month", datetime.now().strftime("%B"))

    apps_query = Application.query.filter_by(repayment_status="unpaid", company=comp_code, month=month)

    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    if start_date and end_date:
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
            apps_query = apps_query.filter(Application.created_at >= start_dt, Application.created_at <= end_dt)
        except ValueError:
            pass

    apps = apps_query.all()

    total_repayment = sum(Decimal(str(app.repayment_amount or 0)) for app in apps)
    total_applied = sum(Decimal(str(app.amount_applied or 0)) for app in apps)
    total_disbursed = sum(Decimal(str(app.disbursement_amount or 0)) for app in apps)

    return jsonify({
        "success": True,
        "company": company.name if company else identifier,
        "company_code": comp_code,
        "month": month,
        "count": len(apps),
        "data": {
            "total_repayment": round(float(total_repayment), 2),
            "total_applied": round(float(total_applied), 2),
            "total_disbursed": round(float(total_disbursed), 2),
            "applications": [app.to_rep_exp() for app in apps]
        }
    }), 200


def _repayment_report_apps(identifier):
    """Unpaid, disbursed loans of one company (every company when identifier is 'all') for the requested date range, else the month."""
    query = Application.query.filter_by(repayment_status="unpaid", loan_status="disbursed")
    if identifier.lower() == "all":
        comp_code, comp_name = "all", "All Companies"
    else:
        company = Company.query.filter(
            (Company.id == identifier) | (Company.code == identifier.lower())
        ).first()
        comp_code = company.code if company else identifier.lower()
        comp_name = company.name if company else identifier
        query = query.filter_by(company=comp_code)

    period = request.args.get("month", datetime.now().strftime("%B"))
    start_dt, end_dt = _date_range_args()
    if start_dt or end_dt:
        if start_dt:
            query = query.filter(Application.created_at >= start_dt)
        if end_dt:
            query = query.filter(Application.created_at <= end_dt)
        period = f"{request.args.get('start_date') or 'start'}_to_{request.args.get('end_date') or 'latest'}"
    else:
        query = query.filter_by(month=period)
    return comp_code, comp_name, period, query.all()


# Nakama's repayment reports (PDF and Excel) name Nakama's own account; every other company's name the Leocap account.
NAKAMA_ACCOUNT = {"account_name": "ELVIS KAREMI NYAGA", "account_number": "8460950033"}


def _repayment_excel_response(identifier, account_name="LEOCAP INVEST", account_number="9710240013"):
    """The repayment report as Excel: the same loans, month and payment instructions as the PDF."""
    comp_code, comp_name, month, apps = _repayment_report_apps(identifier)

    if not apps:
        return jsonify({"message": f"No unpaid disbursed applications found for {comp_name} in {month}."}), 404

    total_amount = sum(Decimal(str(app.repayment_amount or 0)) for app in apps)
    df = pd.DataFrame([app.to_rep_exp() for app in apps])

    bank_details = f"""
1. Account Details:
Account Name: {account_name}
NCBA BANK KENYA PLC
Account Number: {account_number}
Branch Name: PRESTIGE
Swift Code: CBAFKENX
Paybill Number: 880100 (Deposit reference: {comp_code.upper()})
"""

    excel_sheet = dataframe_to_excel(
        df,
        title=f"{comp_name}: Repayment Report ({month})",
        total_amount=total_amount,
        payment_details=bank_details
    )

    response = Response(excel_sheet.getvalue(), mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    response.headers["Content-Disposition"] = f"attachment; filename=repayment_{comp_code}_{month}.xlsx"
    return response, 200


def _repayment_pdf_response(identifier, **account):
    """The repayment report PDF, one format for admin and HR/finance. `account` overrides the account named in the
    payment instructions (account_name, account_number)."""
    comp_code, comp_name, month, apps = _repayment_report_apps(identifier)

    if not apps:
        return jsonify({"message": f"No unpaid disbursed applications found for {comp_name} in {month}."}), 404

    total_amount = sum(Decimal(str(app.repayment_amount or 0)) for app in apps)
    df_apps = [app.to_rep_exp() for app in apps]

    from website.report_service import CompanyReportPDFGenerator

    pdf_buffer = CompanyReportPDFGenerator.generate_repayment_report(
        company_name=comp_name,
        company_code=comp_code,
        month=month,
        apps=df_apps,
        total_amount=total_amount,
        **account
    )

    # Return bytes, not send_file(BytesIO): the host's Passenger file wrapper calls fileno() on the buffer and crashes.
    response = Response(pdf_buffer.getvalue(), mimetype="application/pdf")
    response.headers["Content-Disposition"] = f'attachment; filename="{comp_name}_Repayment_Report_{month}.pdf"'
    return response


@reports.route('/applications/get-all/repayment/company/<identifier>/excel', methods=['GET'])
@jwt_required()
@role_required("admin", "hr", "finance")
def get_company_repayment_excel(identifier):
    """Export repayment report in Excel format for any company."""
    return _repayment_excel_response(identifier)


@reports.route('/applications/get-all/repayment/company/<identifier>/pdf', methods=['GET'])
@jwt_required()
@role_required("admin", "hr", "finance")
def get_company_repayment_pdf(identifier):
    """Export repayment report in PDF format for any company."""
    return _repayment_pdf_response(identifier)


@reports.route('/aging/<identifier>', methods=['GET'])
@jwt_required()
@role_required('admin', 'hr', 'finance')
def get_aging_report(identifier):
    company = Company.query.filter(
        (Company.id == identifier) | (Company.code == identifier.lower())
    ).first()

    comp_code = company.code if company else identifier.lower()

    apps = Application.query.filter(
        Application.company == comp_code,
        Application.loan_status == 'disbursed',
        Application.repayment_status != 'paid'
    ).all()

    buckets = {
        'current': {'count': 0, 'amount': 0.0},
        '1-30': {'count': 0, 'amount': 0.0},
        '31-60': {'count': 0, 'amount': 0.0},
        '61-90': {'count': 0, 'amount': 0.0},
        '90+': {'count': 0, 'amount': 0.0}
    }
    details = []
    
    now = datetime.utcnow()

    for app in apps:
        overdue_days = 0
        if app.due_date and now > app.due_date:
            overdue_days = (now - app.due_date).days
        
        amt = _balance_due(app)
        
        if overdue_days <= 0:
            bucket = 'current'
        elif 1 <= overdue_days <= 30:
            bucket = '1-30'
        elif 31 <= overdue_days <= 60:
            bucket = '31-60'
        elif 61 <= overdue_days <= 90:
            bucket = '61-90'
        else:
            bucket = '90+'
            
        buckets[bucket]['count'] += 1
        buckets[bucket]['amount'] += amt
        
        details.append({
            'application_id': app.id,
            'applicant_name': getattr(app, 'name', str(app.id)),
            'amount': amt,
            'overdue_days': overdue_days,
            'bucket': bucket
        })
        
    return jsonify({
        'company': company.name if company else identifier,
        'summary': buckets,
        'details': details
    }), 200

@reports.route('/aging', methods=['GET'])
@jwt_required()
@role_required('admin')
def get_global_aging_report():
    apps = Application.query.filter(
        Application.loan_status == 'disbursed',
        Application.repayment_status != 'paid'
    ).all()

    buckets = {
        'current': {'count': 0, 'amount': 0.0},
        '1-30': {'count': 0, 'amount': 0.0},
        '31-60': {'count': 0, 'amount': 0.0},
        '61-90': {'count': 0, 'amount': 0.0},
        '90+': {'count': 0, 'amount': 0.0}
    }
    
    now = datetime.utcnow()

    for app in apps:
        overdue_days = 0
        if app.due_date and now > app.due_date:
            overdue_days = (now - app.due_date).days
        
        amt = _balance_due(app)
        
        if overdue_days <= 0:
            bucket = 'current'
        elif 1 <= overdue_days <= 30:
            bucket = '1-30'
        elif 31 <= overdue_days <= 60:
            bucket = '31-60'
        elif 61 <= overdue_days <= 90:
            bucket = '61-90'
        else:
            bucket = '90+'
            
        buckets[bucket]['count'] += 1
        buckets[bucket]['amount'] += amt
        
    return jsonify({
        'summary': buckets
    }), 200
@reports.route('/custom/excel', methods=['POST'])
@jwt_required()
@role_required('admin', 'hr', 'finance')
def custom_excel_report():
    import io
    import openpyxl
    from openpyxl.styles import Font
    data = request.get_json() or {}
    columns = data.get('columns', [])
    filters = data.get('filters', {})
    
    if not columns:
        return jsonify({"error": "No columns specified"}), 400
        
    query = Application.query
    
    if 'min_amount' in filters and filters['min_amount']:
        try:
            # Note: amount_applied is stored as string in this DB, doing a basic float conversion in python instead of SQL
            # For large DBs this is bad, but fine for MVP
            pass 
        except:
            pass
            
    if 'company' in filters and filters['company'] and filters['company'] != 'all':
        query = query.filter(Application.company == filters['company'])
        
    if 'status' in filters and filters['status']:
        query = query.filter(Application.loan_status == filters['status'])
        
    if 'start_date' in filters and filters['start_date']:
        try:
            start_date = datetime.strptime(filters['start_date'], '%Y-%m-%d')
            query = query.filter(Application.created_at >= start_date)
        except Exception as e:
            pass
            
    if 'end_date' in filters and filters['end_date']:
        try:
            end_date = datetime.strptime(filters['end_date'], '%Y-%m-%d')
            # Add 1 day to include the end date fully
            end_date = end_date.replace(hour=23, minute=59, second=59)
            query = query.filter(Application.created_at <= end_date)
        except Exception as e:
            pass
            
    apps = query.all()
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Custom Report"
    
    # Header
    for col_num, column_title in enumerate(columns, 1):
        cell = ws.cell(row=1, column=col_num)
        cell.value = column_title.replace('_', ' ').title()
        cell.font = Font(bold=True)
        
    # Rows
    for row_num, app in enumerate(apps, 2):
        for col_num, col_name in enumerate(columns, 1):
            val = ""
            if col_name == "applicant_name":
                val = app.applicant.name if app.applicant else "N/A"
            elif col_name == "phone_number":
                val = app.applicant.phone_number if app.applicant else "N/A"
            else:
                val = getattr(app, col_name, "N/A")
            ws.cell(row=row_num, column=col_num).value = str(val)
            
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    response = Response(output.getvalue(), mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    response.headers["Content-Disposition"] = "attachment; filename=Custom_Report.xlsx"
    return response
