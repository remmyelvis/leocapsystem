import os
import sys
import uuid
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash
import random

os.environ['DEMO_MODE'] = 'True'
os.environ['DATABASE_URL'] = 'sqlite:///demo.db'
os.environ['SECRET_KEY'] = 'demo_secret_key'

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from website import create_app
from website.extensions import db
from website.models import User, Company, Applicant, Application, ParsedTransaction, StatementUpload

app = create_app()

def seed_demo_data():
    with app.app_context():
        print("Dropping and recreating demo.db...")
        db.drop_all()
        db.create_all()

        print("Seeding Users...")
        admin = User(
            id=str(uuid.uuid4()), email="admin@leocapdemo.com", name="Demo Admin",
            role="admin", number="123456", password=generate_password_hash("demo123", method="scrypt")
        )
        hr = User(
            id=str(uuid.uuid4()), email="hr@leocapdemo.com", name="Demo HR",
            role="hr", number="123457", password=generate_password_hash("demo123", method="scrypt")
        )
        finance = User(
            id=str(uuid.uuid4()), email="finance@leocapdemo.com", name="Demo Finance",
            role="finance", number="123458", password=generate_password_hash("demo123", method="scrypt")
        )
        db.session.add_all([admin, hr, finance])

        print("Seeding Companies...")
        comp1 = Company(id=str(uuid.uuid4()), name="Acme Corp", hr_email="hr@acmecorp.co.ke", status="active", code="acme")
        comp2 = Company(id=str(uuid.uuid4()), name="TechFlow Solutions", hr_email="hr@techflow.co.ke", status="active", code="tech")
        db.session.add_all([comp1, comp2])
        db.session.commit()

        print("Seeding Applicants...")
        applicants = []
        for i, name in enumerate(["Sylvia Igiria", "David Kimani", "Jane Wanjiku", "Peter Omondi", "Grace Njeri"]):
            comp = comp1 if i % 2 == 0 else comp2
            a = Applicant(
                id=str(uuid.uuid4()), kra_pin=f"A00{i}567243C", name=name, id_number=f"29103{i}90",
                phone_number=f"071643296{i}", email=f"{name.split()[0].lower()}@example.com",
                password=generate_password_hash("password123", method="scrypt"),
                role="applicant", applicant_status="active", applicant_type=comp.code, payroll_number=f"EMP00{i}"
            )
            applicants.append(a)
            db.session.add(a)
        db.session.commit()

        print("Seeding Applications...")
        for i, a in enumerate(applicants):
            amt = (i+1) * 10000
            processing, access, legal = amt * 0.03, amt * 0.02, 500
            loan_status, repayment_status = [
                ("disbursed", "unpaid"), ("pending_processing", "unpaid"), ("disbursed", "paid"),
                ("processing", "unpaid"), ("disbursed", "unpaid"),
            ][i]
            app_record = Application(
                id=str(uuid.uuid4()), applicant_id=a.id, applicant_role=a.role,
                amount_applied=amt, processing_fees=processing, access_fees=access, legal_fees=legal,
                disbursement_amount=amt - processing - access - legal,
                repayment_amount=amt * 1.1, interest_rate="10", loan_type="Personal Loan", loan_purpose="Emergency",
                loan_status=loan_status, repayment_status=repayment_status,
                company=a.applicant_type, created_at=datetime.utcnow() - timedelta(days=i*10),
                due_date=datetime.utcnow() + timedelta(days=30-i*10),
                month_one=str(amt*3), month_two=str(amt*3), month_three=str(amt*3)
            )
            db.session.add(app_record)

            if i < 3:
                stmt = StatementUpload(
                    id=str(uuid.uuid4()), applicant_id=a.id,
                    filename=f"Mpesa_Statement_{a.name.replace(' ','_')}.pdf",
                    filepath="/dummy/path.pdf", source="mpesa", password="", is_parsed=True
                )
                db.session.add(stmt)
                db.session.commit()

                for d in range(10):
                    txn = ParsedTransaction(
                        id=str(uuid.uuid4()), statement_id=stmt.id, applicant_id=a.id,
                        reference=f"RCPT{i}{d}X", date=datetime.utcnow() - timedelta(days=d),
                        description="Paybill - Groceries" if d%2==0 else "Send Money",
                        money_in=5000.0 if d==0 else 0.0,
                        money_out=0.0 if d==0 else 500.0,
                        balance=5000.0 - (d*500.0), is_internal_transfer=False
                    )
                    db.session.add(txn)
        
        db.session.commit()
        print("Demo Database Seeded Successfully!")
        print("Staff Logins (password demo123): admin@leocapdemo.com, hr@leocapdemo.com, finance@leocapdemo.com")

if __name__ == '__main__':
    seed_demo_data()
