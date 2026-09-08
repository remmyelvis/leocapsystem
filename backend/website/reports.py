import os
from io import BytesIO

import pandas as pd
from flask import Blueprint, request, jsonify, current_app, send_file
from sqlalchemy import select
from werkzeug.utils import secure_filename
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from uuid import uuid4

from website.export_service import escalation_to_pdf, dataframe_to_excel, dataframe_to_pdf
from website.system_email_utils import send_email_smtp
from website.models import Application, Applicant, ApplicationDocument, HrEmail, Email, Company
from website import db, Config, export_service
from website.role_decorator import role_required
from flask import Response

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

    # Default ordering
    query = query.order_by(Application.created_at.desc())
    
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
                "company": application.company,
                "loan_type": application.loan_type,
                "amount_applied": application.amount_applied,
                "loan_status": application.loan_status,
                "id": application.id,
                "repayment_amount": application.repayment_amount,
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
    month = request.args.get("month")
    
    apps = (
        Application.query
        .filter_by(repayment_status="unpaid", company="nakama", loan_status = "disbursed", month=month)
        .all()
    )

    total_amount = Decimal("0")
    for app in apps:
        total_amount += Decimal(str(app.repayment_amount))

    if len(apps) < 1:
        return jsonify({
            "message":"There are no applications of this status"
        })

    records = [
        app.to_rep_exp()
        for app in apps
    ]

    df_excel = pd.DataFrame(records)
    
    bank_details = """
    1. Account Details:
    Account Name: ELVIS KAREMI NYAGA
    NCBA BANK KENYA PLC
    Account Number:8460950033
    Branch Name: PRESTIGE
    Swift Code: CBAFKENX
    Paybill Number: 880100 (For deposits from Mpesa to NCBA Bank)"""

    excel_sheet = dataframe_to_excel(df_excel,
        title="Nakama Tech LTD: Repayment Report", total_amount=total_amount, payment_details=bank_details)

    response = Response(
        excel_sheet.getvalue(),
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    response.headers["Content-Disposition"] = (
        "attachment; filename=repayment_nakama_export.xlsx"
    )
    return response, 200

@reports.route('/applications/get-all/repayment/ideon/excel', methods=['GET'])
@jwt_required()
@role_required("admin","hr","finance")
def get_all_repayment_ideon_excel():
    month = request.args.get("month")
    
    apps = (
        Application.query
        .filter_by(repayment_status="unpaid", company="ideon", loan_status="disbursed", month=month)
        .all()
    )

    total_amount = Decimal("0")
    for app in apps:
        total_amount += Decimal(str(app.repayment_amount))

    if len(apps) < 1:
        return jsonify({
            "message":"There are no applications of this status"
        })

    records = [
        app.to_rep_exp()
        for app in apps
    ]

    df_excel = pd.DataFrame(records)
    
    bank_details = """
    1. Account Details:
    Account Name: LEOCAP INVEST
    NCBA BANK KENYA PLC
    Account Number:9710240013
    Branch Name: PRESTIGE
    Swift Code: CBAFKENX
    Paybill Number: 880100 (For deposits from Mpesa to NCBA Bank)"""

    excel_sheet = dataframe_to_excel(df_excel,
        title="IDEON LTD: Repayment Report", total_amount=total_amount, payment_details=bank_details)

    response = Response(
        excel_sheet.getvalue(),
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    response.headers["Content-Disposition"] = (
        "attachment; filename=repayment_ideon_export.xlsx"
    )
    return response, 200

@reports.route('/applications/get-all/repayment/nakama/pdf', methods=['GET'])
@jwt_required()
@role_required("admin","hr","finance")
def get_all_repayment_nakama_pdf():
    month = request.args.get("month")
    
    apps = (
        Application.query
        .filter_by(repayment_status="unpaid", company="nakama", loan_status="disbursed", month=month)
        .all()
    )

    total_amount = Decimal("0")
    for app in apps:
        total_amount += Decimal(str(app.repayment_amount))

    if len(apps) < 1:
        return jsonify({
            "message":"There are no applications of this status"
        })

    records = [
        app.to_rep_exp()
        for app in apps
    ]

    df_pdf = pd.DataFrame(records)

    bank_details = """
                1. Account Details:
                Account Name: ELVIS KAREMI NYAGA
                NCBA BANK KENYA PLC
                Account Number:8460950033
                Branch Name: PRESTIGE
                Swift Code: CBAFKENX
                Paybill Number: 880100 (For deposits from Mpesa to NCBA Bank)"""

    pdf_sheet = dataframe_to_pdf(
        df_pdf,
        title="Nakama Tech LTD: Repayment Report",
        bank_details=bank_details,
        total_amount=total_amount
    )

    response = Response(
        pdf_sheet,
        mimetype="application/pdf"
    )
    response.headers["Content-Disposition"] = (
        "attachment; filename=repayment_nakama_export.pdf"
    )
    return response, 200

@reports.route('/applications/get-all/repayment/ideon/pdf', methods=['GET'])
@jwt_required()
@role_required("admin","hr","finance")
def get_all_repayment_ideon_pdf():
    month = request.args.get("month")
    
    apps = (
        Application.query
        .filter_by(repayment_status="unpaid", company="ideon", loan_status="disbursed", month=month)
        .all()
    )

    total_amount = Decimal("0")
    for app in apps:
        total_amount += Decimal(str(app.repayment_amount))

    if len(apps) < 1:
        return jsonify({
            "message":"There are no applications of this status"
        })

    records = [
        app.to_rep_exp()
        for app in apps
    ]

    df_pdf = pd.DataFrame(records)

    bank_details = """
                1. Account Details:
                Account Name: LEOCAP INVEST
                NCBA BANK KENYA PLC
                Account Number:9710240013
                Branch Name: PRESTIGE
                Swift Code: CBAFKENX
                Paybill Number: 880100 (For deposits from Mpesa to NCBA Bank)"""

    pdf_sheet = dataframe_to_pdf(
        df_pdf,
        title="Ideon LTD: Repayment Report",
        bank_details=bank_details,
        total_amount=total_amount
    )

    response = Response(
        pdf_sheet,
        mimetype="application/pdf"
    )
    response.headers["Content-Disposition"] = (
        "attachment; filename=repayment_ideon_export.pdf"
    )
    return response, 200


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


@reports.route('/applications/get-all/repayment/company/<identifier>/excel', methods=['GET'])
@jwt_required()
@role_required("admin", "hr", "finance")
def get_company_repayment_excel(identifier):
    """Export repayment report in Excel format for any company."""
    company = Company.query.filter(
        (Company.id == identifier) | (Company.code == identifier.lower())
    ).first()

    comp_code = company.code if company else identifier.lower()
    comp_name = company.name if company else identifier
    month = request.args.get("month", datetime.now().strftime("%B"))
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    query = Application.query.filter_by(repayment_status="unpaid", company=comp_code, loan_status="disbursed")
    
    if start_date and end_date:
        query = query.filter(Application.created_at >= start_date, Application.created_at <= end_date)
    else:
        query = query.filter_by(month=month)
        
    apps = query.all()

    if not apps:
        return jsonify({"message": f"No unpaid disbursed applications found for {comp_name} in {month}."}), 404

    total_amount = sum(Decimal(str(app.repayment_amount or 0)) for app in apps)
    df_apps = [app.to_rep_exp() for app in apps]
    df = pd.DataFrame(df_apps)

    bank_details = f"""
1. Account Details:
Account Name: LEOCAP INVEST
NCBA BANK KENYA PLC
Account Number: 9710240013
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


@reports.route('/applications/get-all/repayment/company/<identifier>/pdf', methods=['GET'])
@jwt_required()
@role_required("admin", "hr", "finance")
def get_company_repayment_pdf(identifier):
    """Export repayment report in PDF format for any company."""
    company = Company.query.filter(
        (Company.id == identifier) | (Company.code == identifier.lower())
    ).first()

    comp_code = company.code if company else identifier.lower()
    comp_name = company.name if company else identifier
    month = request.args.get("month", datetime.now().strftime("%B"))
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    query = Application.query.filter_by(repayment_status="unpaid", company=comp_code, loan_status="disbursed")
    
    if start_date and end_date:
        query = query.filter(Application.created_at >= start_date, Application.created_at <= end_date)
    else:
        query = query.filter_by(month=month)
        
    apps = query.all()

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
        total_amount=total_amount
    )

    return send_file(
        pdf_buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"{comp_name}_Repayment_Report_{month}.pdf"
    )

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
        
        amt = float(app.repayment_amount or 0)
        
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
        
        amt = float(app.repayment_amount or 0)
        
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
    
    return send_file(
        output,
        as_attachment=True,
        download_name="Custom_Report.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
