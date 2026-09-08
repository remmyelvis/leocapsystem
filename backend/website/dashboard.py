from flask import Blueprint, jsonify, request
from website import db
from flask_jwt_extended import jwt_required
from website.role_decorator import role_required
from website.models import db, Application, Applicant, Company, StatementEntry
from datetime import datetime
from sqlalchemy import func

dashboard_bp = Blueprint('dashboard_bp', __name__, url_prefix='/api/dashboard')

@dashboard_bp.route('/kpis', methods=['GET'])
@jwt_required()
@role_required('admin')
def get_dashboard_kpis():
    month_filter = request.args.get('month')
    
    query = Application.query
    if month_filter and month_filter != 'all':
        try:
            year, month = map(int, month_filter.split('-'))
            query = query.filter(func.extract('year', Application.created_at) == year, func.extract('month', Application.created_at) == month)
        except Exception:
            pass
            
    apps = query.all()

    app_ids = [app.id for app in apps]
    if app_ids:
        statement_totals = db.session.query(
            StatementEntry.application_id,
            func.sum(StatementEntry.credit)
        ).filter(
            StatementEntry.application_id.in_(app_ids)
        ).group_by(StatementEntry.application_id).all()
        payments_by_app = {app_id: float(total) for app_id, total in statement_totals if total}
    else:
        payments_by_app = {}
    
    total_applications = len(apps)
    total_disbursed_amount = 0.0
    total_outstanding = 0.0
    total_repaid = 0.0
    overdue_count = 0
    default_count = 0
    revenue_from_fees = 0.0
    interest_income = 0.0
    
    loans_by_status_dict = {}
    company_data = {}
    
    now = datetime.utcnow()
    
    for app in apps:
        # loans by status
        loans_by_status_dict[app.loan_status] = loans_by_status_dict.get(app.loan_status, 0) + 1
        
        # company grouping
        comp = app.company or "Unknown"
        if comp not in company_data:
            company_data[comp] = {'count': 0, 'total_amount': 0.0}
        company_data[comp]['count'] += 1
        
        app_amount = float(app.amount_applied) if app.amount_applied else 0.0
        company_data[comp]['total_amount'] += app_amount
        
        if app.loan_status in ['disbursed', 'paid', 'default']:
            disb = float(app.disbursement_amount) if app.disbursement_amount else 0.0
            total_disbursed_amount += disb
            
            p_fee = float(app.processing_fees) if app.processing_fees else 0.0
            a_fee = float(app.access_fees) if app.access_fees else 0.0
            l_fee = float(app.legal_fees) if app.legal_fees else 0.0
            revenue_from_fees += (p_fee + a_fee + l_fee)
            
            app_repay = float(app.repayment_amount) if app.repayment_amount else 0.0
            app_applied = float(app.amount_applied) if app.amount_applied else 0.0
            if app_repay > app_applied:
                interest_income += (app_repay - app_applied)
            
        if app.loan_status == 'disbursed' and app.repayment_status == 'unpaid':
            total_outstanding += float(app.outstanding_balance) if app.outstanding_balance and float(app.outstanding_balance) > 0 else (float(app.repayment_amount) if app.repayment_amount else 0.0)
            if app.due_date and app.due_date < now:
                overdue_count += 1
                
        if app.loan_status in ['disbursed', 'paid', 'default']:
            # Principal Collection Logic
            principal = float(app.disbursement_amount) if app.disbursement_amount else 0.0
            total_paid = payments_by_app.get(app.id, 0.0)
            
            outstanding_balance = 0.0 if app.repayment_status == 'paid' else (float(app.repayment_amount) if app.repayment_amount else 0.0)
            original_expected = outstanding_balance + total_paid
            interest_and_fees = original_expected - principal
            
            # Prevent negative interest and fees in case of data quirks
            if interest_and_fees < 0:
                interest_and_fees = 0.0
                
            if total_paid <= interest_and_fees:
                principal_paid = 0.0
            else:
                principal_paid = total_paid - interest_and_fees
                
            # Cap principal paid at actual principal to prevent >100% on overpayments
            if principal_paid > principal:
                principal_paid = principal
                
            total_repaid += principal_paid
            
        if app.loan_status == 'default':
            default_count += 1

    loans_by_company = []
    for comp, data in company_data.items():
        loans_by_company.append({
            'company': comp,
            'count': data['count'],
            'total_amount': data['total_amount']
        })
        
    repayment_rate_pct = 0.0
    if total_disbursed_amount > 0:
        repayment_rate_pct = (total_repaid / total_disbursed_amount) * 100
        
    recent_apps = Application.query.order_by(Application.created_at.desc()).limit(20).all()
    recent_applications = []
    for ra in recent_apps:
        applicant = Applicant.query.get(ra.applicant_id)
        recent_applications.append({
            'id': ra.id,
            'applicant_name': applicant.name if applicant else "Unknown",
            'company': ra.company,
            'amount_applied': float(ra.amount_applied) if ra.amount_applied else 0.0,
            'disbursement_amount': float(ra.disbursement_amount) if ra.disbursement_amount else 0.0,
            'repayment_amount': float(ra.repayment_amount) if ra.repayment_amount else 0.0,
            'loan_status': ra.loan_status,
            'repayment_status': ra.repayment_status,
            'due_date': ra.due_date.isoformat() if ra.due_date else None,
            'created_at': ra.created_at.isoformat() if ra.created_at else None
        })
        
        # Calculate available months based on earliest application
    available_months = []
    first_app = Application.query.order_by(Application.created_at.asc()).first()
    if first_app and first_app.created_at:
        start_date = first_app.created_at
        end_date = datetime.utcnow()
        curr = start_date.replace(day=1)
        while curr <= end_date:
            available_months.append(curr.strftime('%Y-%m'))
            if curr.month == 12:
                curr = curr.replace(year=curr.year+1, month=1)
            else:
                curr = curr.replace(month=curr.month+1)
    if not available_months:
        available_months.append(datetime.utcnow().strftime('%Y-%m'))
    available_months.reverse()

    return jsonify({
        'total_applications': total_applications,
        'total_disbursed_amount': total_disbursed_amount,
        'total_outstanding': total_outstanding,
        'total_repaid': total_repaid,
        'repayment_rate_pct': repayment_rate_pct,
        'overdue_count': overdue_count,
        'default_count': default_count,
        'revenue_from_fees': revenue_from_fees,
        'interest_income': interest_income,
        'loans_by_status': loans_by_status_dict,
        'loans_by_company': loans_by_company,
        'recent_applications': recent_applications,
        'available_months': available_months
    }), 200

@dashboard_bp.route('/loans', methods=['GET'])
@jwt_required()
@role_required('admin')
def get_dashboard_loans():
    status = request.args.get('status')
    company = request.args.get('company')
    
    query = Application.query
    if status:
        query = query.filter_by(loan_status=status)
    if company:
        query = query.filter_by(company=company)
        
    apps = query.order_by(Application.created_at.desc()).all()
    
    results = []
    for app in apps:
        applicant = Applicant.query.get(app.applicant_id)
        results.append({
            'id': app.id,
            'applicant_name': applicant.name if applicant else "Unknown",
            'applicant_phone': applicant.phone_number if applicant else "Unknown",
            'company': app.company,
            'amount_applied': float(app.amount_applied) if app.amount_applied else 0.0,
            'disbursement_amount': float(app.disbursement_amount) if app.disbursement_amount else 0.0,
            'repayment_amount': float(app.repayment_amount) if app.repayment_amount else 0.0,
            'processing_fees': float(app.processing_fees) if app.processing_fees else 0.0,
            'access_fees': float(app.access_fees) if app.access_fees else 0.0,
            'legal_fees': float(app.legal_fees) if app.legal_fees else 0.0,
            'loan_status': app.loan_status,
            'repayment_status': app.repayment_status,
            'due_date': app.due_date.isoformat() if app.due_date else None,
            'created_at': app.created_at.isoformat() if app.created_at else None
        })
        
    return jsonify({'loans': results}), 200
