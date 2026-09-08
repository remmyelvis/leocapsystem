from website import create_app, db
from website.models import Application, StatementEntry
from sqlalchemy import func

app = create_app()

with app.app_context():
    apps = Application.query.all()
    app_ids = [a.id for a in apps]
    statement_totals = db.session.query(
        StatementEntry.application_id,
        func.sum(StatementEntry.credit)
    ).filter(
        StatementEntry.application_id.in_(app_ids)
    ).group_by(StatementEntry.application_id).all()
    
    payments_by_app = {app_id: float(total) for app_id, total in statement_totals if total}
    
    total_disbursed = 0.0
    total_principal_paid = 0.0
    
    for a in apps:
        if a.loan_status in ['disbursed', 'paid', 'default']:
            principal = float(a.disbursement_amount) if a.disbursement_amount else 0.0
            total_disbursed += principal
            
            total_paid = payments_by_app.get(a.id, 0.0)
            outstanding_balance = 0.0 if a.repayment_status == 'paid' else (float(a.repayment_amount) if a.repayment_amount else 0.0)
            original_expected = outstanding_balance + total_paid
            interest_and_fees = original_expected - principal
            
            if interest_and_fees < 0:
                interest_and_fees = 0.0
                
            if total_paid <= interest_and_fees:
                principal_paid = 0.0
            else:
                principal_paid = total_paid - interest_and_fees
                
            if principal_paid > principal:
                principal_paid = principal
                
            total_principal_paid += principal_paid
            print(f"App {a.id}: Principal {principal}, Expected {original_expected}, Paid {total_paid}, Int/Fees {interest_and_fees}, Prin_Paid {principal_paid}")

    print(f"Total Disbursed: {total_disbursed}")
    print(f"Total Principal Paid: {total_principal_paid}")
    if total_disbursed > 0:
        print(f"Rate: {(total_principal_paid / total_disbursed) * 100}%")
