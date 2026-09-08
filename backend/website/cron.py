from flask import Blueprint, jsonify
from website.models import Application, Applicant
from website import db
from datetime import datetime, timedelta
from website.system_email_utils import send_email_smtp

cron_bp = Blueprint('cron', __name__, url_prefix='/api/cron')

@cron_bp.route('/reminders', methods=['POST', 'GET'])
def run_reminders():
    # In production, this should be secured by a cron secret
    apps = Application.query.filter(Application.loan_status == 'disbursed', Application.repayment_status.in_(['unpaid', 'partially_paid'])).all()
    
    now = datetime.utcnow()
    count_sent = 0
    count_delinquent = 0
    
    for app in apps:
        if not app.due_date:
            continue
            
        days_diff = (app.due_date.date() - now.date()).days
        applicant = Applicant.query.get(app.applicant_id)
        if not applicant:
            continue
            
        subject = None
        body = None
        
        # 1 week to due date
        if days_diff == 7:
            subject = "Reminder: Loan Due in 7 Days"
            body = f"Dear {applicant.name},<br/>Your loan (ID: {app.id}) is due in 7 days on {app.due_date.strftime('%Y-%m-%d')}."
        
        # 3 days to due date
        elif days_diff == 3:
            subject = "Reminder: Loan Due in 3 Days"
            body = f"Dear {applicant.name},<br/>Your loan (ID: {app.id}) is due in 3 days on {app.due_date.strftime('%Y-%m-%d')}."
            
        # Due date reminder
        elif days_diff == 0:
            subject = "URGENT: Loan Due Today"
            body = f"Dear {applicant.name},<br/>Your loan (ID: {app.id}) is due TODAY."
            
        # 7 days over due
        elif days_diff == -7:
            subject = "OVERDUE: Loan is 7 Days Late"
            body = f"Dear {applicant.name},<br/>Your loan (ID: {app.id}) is 7 days overdue. Please make a payment immediately to avoid collection fees."
            
        # 8th day -> delinquent
        elif days_diff <= -8 and app.repayment_status != 'delinquent':
            app.repayment_status = 'delinquent'
            
            # Apply collection charges
            from decimal import Decimal
            outstanding = Decimal(app.outstanding_balance) if app.outstanding_balance else Decimal(app.repayment_amount)
            collection_fee = outstanding * Decimal('0.15') # 15% charge
            
            app.outstanding_balance = str(round(outstanding + collection_fee, 2))
            
            subject = "NOTICE OF DELINQUENCY"
            body = f"Dear {applicant.name},<br/>Your loan (ID: {app.id}) has been marked as DELINQUENT. A collection fee of {collection_fee} has been applied."
            
            # Write to ledger
            from website.models import StatementEntry
            stmt = StatementEntry(
                applicant_id=app.applicant_id,
                application_id=app.id,
                memo="Delinquency Collection Fee",
                debit=collection_fee,
                credit=Decimal(0),
                balance=Decimal(app.outstanding_balance)
            )
            db.session.add(stmt)
            count_delinquent += 1
            
        if subject and body:
            try:
                send_email_smtp(applicant.email, subject, body)
                count_sent += 1
            except:
                pass
                
    db.session.commit()
    return jsonify({
        "message": "Cron execution complete", 
        "emails_sent": count_sent, 
        "delinquent_marked": count_delinquent
    }), 200
