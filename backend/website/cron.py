import os
from hmac import compare_digest

from flask import Blueprint, jsonify, request
from website.models import Application, Applicant
from website import db
from datetime import datetime, timedelta
from website.system_email_utils import send_audited

cron_bp = Blueprint('cron', __name__, url_prefix='/api/cron')

# The 10% late-payment charge is in the loan terms only for loans applied for on or after this date (UTC), so only those
# are charged it. Older loans were accepted under terms without it and keep the 15% collection fee alone.
try:
    LATE_CHARGE_FROM = datetime.strptime(os.getenv("LATE_CHARGE_FROM", "2026-10-26"), "%Y-%m-%d")  # the demo sets 2000-01-01
except ValueError:
    LATE_CHARGE_FROM = datetime(2026, 10, 26)

@cron_bp.route('/reminders', methods=['POST', 'GET'])
def run_reminders():
    # Only the scheduled job may run this: it sends the CRON_SECRET (X-Cron-Secret header or ?key=)
    secret = os.getenv("CRON_SECRET", "")
    if not secret:
        return jsonify({"error": "CRON_SECRET is not configured"}), 503
    sent = request.headers.get("X-Cron-Secret") or request.args.get("key", "")
    if not compare_digest(sent.encode(), secret.encode()):
        return jsonify({"error": "Unauthorized"}), 401

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
        late_terms = bool(app.created_at and app.created_at >= LATE_CHARGE_FROM)
        
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
            body = f"Dear {applicant.name},<br/>Your loan (ID: {app.id}) is 7 days overdue. Please make a payment immediately to avoid {'a collection fee and a late-payment charge' if late_terms else 'collection fees'}."
            
        # 8th day -> delinquent
        elif days_diff <= -8 and app.repayment_status != 'delinquent':
            app.repayment_status = 'delinquent'
            
            # Apply collection charges: a 15% collection fee and a 10% late-payment charge, both on the balance owed
            # before either is added (the loan's repayment amount stays the contract total)
            from decimal import Decimal
            outstanding = Decimal(app.outstanding_balance) if app.outstanding_balance else Decimal(app.repayment_amount)
            collection_fee = round(outstanding * Decimal('0.15'), 2) # 15% charge
            late_charge = round(outstanding * Decimal('0.10'), 2) if late_terms else Decimal('0') # 10% late-payment charge
            
            app.outstanding_balance = str(round(outstanding + collection_fee + late_charge, 2))
            
            subject = "NOTICE OF DELINQUENCY"
            applied = f"A collection fee of KES {collection_fee:,.2f} and a late-payment charge of KES {late_charge:,.2f} have been" if late_charge else f"A collection fee of KES {collection_fee:,.2f} has been"
            body = (f"Dear {applicant.name},<br/>Your loan (ID: {app.id}) has been marked as DELINQUENT. {applied} applied. "
                    f"Your outstanding balance is now KES {Decimal(app.outstanding_balance):,.2f}.")
            
            # Write to ledger: one row per charge, a second apart so the statement always reads fee, then charge
            from website.models import StatementEntry
            when = datetime.utcnow()
            db.session.add(StatementEntry(
                applicant_id=app.applicant_id,
                application_id=app.id,
                memo="Delinquency Collection Fee",
                debit=collection_fee,
                credit=Decimal(0),
                balance=outstanding + collection_fee,
                date=when
            ))
            if late_charge:
                db.session.add(StatementEntry(
                    applicant_id=app.applicant_id,
                    application_id=app.id,
                    memo="Late Payment Charge",
                    debit=late_charge,
                    credit=Decimal(0),
                    balance=Decimal(app.outstanding_balance),
                    date=when + timedelta(seconds=1)
                ))
            count_delinquent += 1
            
        if subject and body:
            try:
                ok, _ = send_audited(applicant.email, subject, body, html=True, purpose="a delinquency notice" if "DELINQUENCY" in subject else "a repayment reminder",
                                     entity_type="Application", entity_id=app.id, mask=True)
                if ok:
                    count_sent += 1
            except Exception:
                pass
                
    db.session.commit()
    return jsonify({
        "message": "Cron execution complete", 
        "emails_sent": count_sent, 
        "delinquent_marked": count_delinquent
    }), 200
