import calendar
from uuid import uuid4
from datetime import datetime

from sqlalchemy.engine import default
from sqlalchemy.orm import unitofwork

from . import db

def default_due_date():
    now = datetime.now()

    last_day = calendar.monthrange(
        now.year,
        now.month
    )[1]

    return now.replace(
        day=last_day,
        hour=0,
        minute=0,
        second=0,
        microsecond=0
    )

class Application(db.Model):
    __tablename__ = 'applications'
    id = db.Column(db.String(36), primary_key=True, unique=True, nullable=False)
    employment_type = db.Column(db.String(100), nullable=True)
    company = db.Column(db.String(100), nullable=True)
    employment_nature = db.Column(db.String(100), nullable=True)
    payroll_number = db.Column(db.String(100), nullable=True)
    designation = db.Column(db.String(100), nullable=True)
    is_first_time_applicant = db.Column(db.String, default=False, nullable=False)
    month_one = db.Column(db.String(100), nullable=False)
    month_two = db.Column(db.String(100), nullable=False)
    month_three = db.Column(db.String(100), nullable=False)
    loan_type = db.Column(db.String(100), nullable=False)
    loan_purpose = db.Column(db.String(2000), nullable=False)
    amount_applied = db.Column(db.Numeric(12,2), nullable=False)
    processing_fees = db.Column(db.Numeric(12,2), nullable=False)
    access_fees = db.Column(db.Numeric(12,2), nullable=False)
    legal_fees = db.Column(db.Numeric(12,2), nullable=False)
    disbursement_amount = db.Column(db.Numeric(12,2), nullable=False)
    repayment_amount = db.Column(db.Numeric(12,2), nullable=False)
    outstanding_balance = db.Column(db.Numeric(12,2), default="0", nullable=False)
    loan_product = db.Column(db.String(100), default="1_month_flat", nullable=True)
    duration_months = db.Column(db.Integer, default=1, nullable=True)
    late_payment_fee = db.Column(db.Numeric(12,2), default = "0", nullable=False)
    collection_fee = db.Column(db.Numeric(12,2), default = "0", nullable=False)
    repayment_status = db.Column(db.String(100), default="unpaid", nullable=False)
    loan_status = db.Column(db.String(100), default="pending_processing", nullable=False)
    hr_status = db.Column(db.String(100), default="okay", nullable=False)
    interest_rate = db.Column(db.String(100), default="10", nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    partially_paid_date = db.Column(db.DateTime, nullable = True)
    partially_paid_count = db.Column(db.Integer, nullable = True, default = 0)
    interest_charged_date = db.Column(db.DateTime, nullable = True)
    interest_charged_count = db.Column(db.Integer, nullable = True, default = 0)
    due_date = db.Column(db.DateTime)
    memo = db.Column(db.String(255), nullable = True)
    month = db.Column(db.String(100), nullable = True, default=lambda: datetime.now().strftime("%B"))
    

    notes = db.Column(db.Text, nullable=True)

    applicant_id = db.Column(db.String(36), db.ForeignKey('applicants.id'), nullable=False)
    applicant_role = db.Column(db.String(100), nullable=False)

    application_documents = db.relationship(
        "ApplicationDocument",
        backref="application",
        cascade="all, delete-orphan"
    )

    emails = db.relationship(
        "Email",
        backref="application",
        cascade="all, delete-orphan"
    )

    hr_emails = db.relationship(
        "HrEmail",
        backref="application",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f'<Application {self.id} | {self.loan_type}>'

    def to_dict(self):
        return {
            'id': self.id,
            'employment_type': self.employment_type,
            'employment_nature': self.employment_nature,
            'payroll_number': self.payroll_number,
            'designation': self.designation,
            'month_one': self.month_one,
            'month_two': self.month_two,
            'month_three': self.month_three,
            'company': self.company,
            'loan_type': self.loan_type,
            'amount_applied': self.amount_applied,
            'processing_fees': self.processing_fees,
            'legal_fees': self.legal_fees,
            'disbursement_amount': self.disbursement_amount,
            'repayment_amount':self.repayment_amount,
            'loan_status':self.loan_status,
            'is_first_time_applicant':self.is_first_time_applicant,
            'access_fees': self.access_fees,
            'applicant_id':self.applicant_id,
            'interest_rate':self.interest_rate,
            'loan_purpose':self.loan_purpose,
            'collection_fee': self.collection_fee,
            'late_payment_fee': self.late_payment_fee,
            'repayment_status': self.repayment_status,
            'created_at':self.created_at,
            'due_date':self.due_date,
            'notes': self.notes,
            'month': self.month,
            "memo": self.memo,
            "partially_paid_date":self.partially_paid_date,
            "partially_paid_count":self.partially_paid_count,
            "interest_charged_date":self.interest_charged_date,
            "interest_charged_count":self.interest_charged_count,
        }

    def to_export(self):
        return {
            'Loan Type': self.loan_type,
            'Company':self.company,
            'Amount': self.amount_applied,
            'Processing': self.processing_fees,
            'Legal': self.legal_fees,
            'Disbursement': self.disbursement_amount,
            'Repayment':self.repayment_amount,
            'Access': self.access_fees,
            'Collection': self.collection_fee,
            'Late Payment': self.late_payment_fee,
            'Request Date':self.created_at.strftime("%d %B %Y"),
            'Due Date': self.due_date.strftime("%d %B %Y"),
        }

    def to_dis_exp(self):
        applicant = Applicant.query.get(self.applicant_id)
        return {
            'Payroll': self.payroll_number,
            'Request Date': self.created_at.strftime("%d %B %Y"),
            'Customer': applicant.name,
            'Phone': applicant.phone_number,
            'Approved': self.amount_applied,
            'Processing': self.processing_fees,
            'Legal': self.legal_fees,
            'Access':self.access_fees,
            'Disbursement': self.disbursement_amount,
            'Status': self.loan_status
        }

    def to_rep_exp(self):
        applicant = Applicant.query.get(self.applicant_id)
        return {
            'Payroll': self.payroll_number,
            "Customer":applicant.name,
            'Employment Nature': self.employment_nature,
            'Request Date': self.created_at.strftime("%d %B %Y"),
            'Amount Applied': f"{float(self.amount_applied):,.2f}",
            'Repayment Amount': f"{float(self.repayment_amount):,.2f}"
        }

class ApplicationDocument(db.Model):
    __tablename__ = "application_documents"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()), unique=True, nullable=False)
    application_id = db.Column(db.String(36), db.ForeignKey("applications.id"), nullable=False)

    filename = db.Column(db.String(255), nullable=False)
    filepath = db.Column(db.String(500), nullable=False)
    filetype = db.Column(db.String(50))
    document_type = db.Column(db.String(100), nullable=False)
    document_passcode = db.Column(db.String(255), nullable=True)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "application_id": self.application_id,
            "filename": self.filename,
            "filetype": self.filetype,
            "document_passcode": self.document_passcode,
            "document_type": self.document_type,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "status": self.status,
            "admin_comment": self.admin_comment
        }


class ApplicationAudit(db.Model):
    __tablename__ = "application_audits"

    id = db.Column(
        db.String(36),
        primary_key=True,
        default=lambda: str(uuid4())
    )

    application_id = db.Column(
        db.String(36),
        db.ForeignKey("applications.id"),
        nullable=False
    )

    application_old_loan_amount = db.Column(db.Float, nullable=False)
    application_new_loan_amount = db.Column(db.Float, nullable=False)

    application_old_repayment_amount = db.Column(db.Float, nullable=False)
    application_new_repayment_amount = db.Column(db.Float, nullable=False)

    field_name = db.Column(db.String(100), nullable=False)
    old_status = db.Column(db.String(255), nullable=True)
    new_status = db.Column(db.String(255), nullable=False)

    changed_by_email = db.Column(
        db.String(120),
        nullable=False
    )

    changed_by_role = db.Column(
        db.String(36),
        nullable=False
    )

    changed_by_company = db.Column(
        db.String(36),
        nullable=False
    )


    changed_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    notes = db.Column(db.Text, nullable=True)

    application = db.relationship(
        "Application",
        backref=db.backref(
            "audit_logs",
            lazy=True,
            cascade="all, delete-orphan"
        )
    )

    def to_dict(self):
        return {
            "id": self.id,
            "application_id": self.application_id,
            "field_name": self.field_name,
            "old_status": self.old_status,
            "new_status": self.new_status,
            "application_old_loan_amount": self.application_old_loan_amount,
            "application_new_loan_amount": self.application_new_loan_amount,
            "application_old_repayment_amount": self.application_old_repayment_amount,
            "application_new_repayment_amount": self.application_new_repayment_amount,
            "changed_by_email": self.changed_by_email,
            "changed_by_role": self.changed_by_role,
            "changed_by_company": self.changed_by_company,
            "changed_at": self.changed_at,
            "notes": self.notes
        }


class Email(db.Model):

    __tablename__ = "emails"
    id = db.Column(db.String(36), primary_key=True, unique=True, nullable=False)

    application_id = db.Column(db.String(36), db.ForeignKey("applications.id"), nullable=False)
    recipient = db.Column(db.String(100), nullable = False)
    subject = db.Column(db.String(100), nullable = False)
    confirmation_text = db.Column(db.Text, nullable = False)
    status = db.Column(db.String(100), nullable = False, default = "pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    confirmation_documents = db.relationship(
        "ConfirmationDocument",
        backref="email",
        cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "application_id": self.application_id,
            "recipient": self.recipient,
            "subject": self.subject,
            "confirmation_text": self.confirmation_text,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class HrEmail(db.Model):

    __tablename__ = "hr_emails"
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()), unique=True, nullable=False)

    application_id = db.Column(db.String(36), db.ForeignKey("applications.id"), nullable=False)
    recipient = db.Column(db.String(100), nullable = False)
    subject = db.Column(db.String(100), nullable = False)
    body = db.Column(db.Text, nullable = False)
    company = db.Column(db.String(100), nullable = False)
    status = db.Column(db.String(100), nullable = False, default = "pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "application_id": self.application_id,
            "recipient": self.recipient,
            "subject": self.subject,
            "confirmation_text": self.body,
            "status": self.status,
            'company': self.company,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class ConfirmationDocument(db.Model):

    __tablename__ = "confirmation_documents"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()), unique=True, nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    filepath = db.Column(db.String(500), nullable=False)
    filetype = db.Column(db.String(50))
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    email_id = db.Column(db.String(100), db.ForeignKey("emails.id"), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "filetype": self.filetype,
            "email_id":self.email_id,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None
        }

class Applicant(db.Model):
    __tablename__ = "applicants"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()), unique=True, nullable=False)
    kra_pin = db.Column(db.String(100), nullable=True)
    name = db.Column(db.String(100), nullable=False)
    id_number = db.Column(db.String(100), nullable=True)
    phone_number = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False, unique=True, index=True)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(100), nullable=False)
    loan_limit = db.Column(db.Integer, nullable=True)
    payroll_number = db.Column(db.String, nullable=True)
    applicant_status = db.Column(db.String, default="active", nullable=True)
    interest_rate = db.Column(db.Float, nullable=True)
    applicant_type = db.Column(db.String(100), nullable=False) #"personal, ideon or nakama"
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    notes = db.Column(db.Text)

    applications = db.relationship(
        "Application",
        backref="applicant",
        cascade="all, delete-orphan"
    )

    documents = db.relationship(
        "ApplicantDocument",
        backref="applicant",
        cascade="all, delete-orphan"
    )

    statement_entries = db.relationship(
        "StatementEntry",
        backref="applicant",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f'Applicant {self.id} | {self.name} >'

    def to_dict(self):
        return {
            'id': self.id,
            'kra_pin': self.kra_pin,
            'name': self.name,
            'id_number': self.id_number,
            'phone_number': self.phone_number,
            'email': self.email,
            'role':self.role,
            'loan_limit': self.loan_limit,
            'applicant_type':self.applicant_type,
            'applicant_status': self.applicant_status,
            'payroll_number': self.payroll_number,
            'interest_rate': self.interest_rate,
            'created_at':self.created_at,
        }

    def to_export(self):
        return {
            'Id No': self.id_number,
            'KRA': self.kra_pin,
            'Name': self.name,
            'Phone': self.phone_number,
            'Applicant Type':self.applicant_type,
            'Email': self.email,
            'Loan Limit': self.loan_limit,
            'Interest Rate': self.interest_rate,
            'Register Date':self.created_at.strftime("%d %B %Y"),
        }
        
class StatementEntry(db.Model):
    __tablename__ = "statement_entries"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()), unique=True, nullable=False)
    applicant_id = db.Column(db.String(36), db.ForeignKey("applicants.id"), nullable=False)
    application_id = db.Column(db.String(36), db.ForeignKey("applications.id"), nullable=True)

    memo = db.Column(db.String(255), nullable=False)
    credit = db.Column(db.Numeric(12,2), nullable=False, default = 0)
    debit = db.Column(db.Numeric(12,2), nullable=False, default = 0)
    balance = db.Column(db.Numeric(12,2), nullable=False)
    date = db.Column(db.DateTime, default = datetime.utcnow)
    external_reference = db.Column(db.String(100), nullable=True, unique=True)
    idempotency_key = db.Column(db.String(100), nullable=True, unique=True)

    def to_dict(self):
        return {
            "id": self.id,
            "applicant_id": self.applicant_id,
            "application_id": self.application_id,
            "memo": self.memo,
            "credit": self.credit,
            "debit": self.debit,
            "balance": self.balance,
            "date": self.date
        }

    def to_statement(self):
        return {
            "application_id": self.application_id,
            "date": self.date.isoformat() if self.date else None,
            "memo": self.memo,
            "debit": self.debit,
            "credit": self.credit,
            "balance": self.balance,
        }

class ApplicantDocument(db.Model):
    __tablename__ = "applicant_documents"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()), unique=True, nullable=False)
    applicant_id = db.Column(db.String(36), db.ForeignKey("applicants.id"), nullable=False)
    application_id = db.Column(db.String(36), db.ForeignKey("applications.id"), nullable=True)

    filename = db.Column(db.String(255), nullable=False)
    filepath = db.Column(db.String(500), nullable=False)
    filetype = db.Column(db.String(50))
    document_type = db.Column(db.String(100), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(50), default='pending')
    admin_comment = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "applicant_id": self.applicant_id,
            "application_id": self.application_id,
            "filename": self.filename,
            "filetype": self.filetype,
            "document_type":self.document_type,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None
        }

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String(36), primary_key=True, default= lambda: str(uuid4()), unique=True, nullable=False)

    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False, unique=True, index=True)
    number = db.Column(db.String(20), nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    reset_token = db.Column(db.String(255), nullable=True)
    reset_token_expiry = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        """Return user as JSON"""
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "number": self.number,
            "role": self.role if self.role else None,
        }

    def __repr__(self):
        return f"<User {self.name}>"


class Company(db.Model):
    __tablename__ = 'companies'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()), unique=True, nullable=False)
    name = db.Column(db.String(150), nullable=False)
    code = db.Column(db.String(50), nullable=False, unique=True, index=True)
    hr_email = db.Column(db.String(120), nullable=True)
    contact_person = db.Column(db.String(100), nullable=True)
    contact_phone = db.Column(db.String(50), nullable=True)
    interest_rate = db.Column(db.Float, default=10.0, nullable=False)
    processing_fee_rate = db.Column(db.Float, default=3.0, nullable=False)
    access_fee_rate = db.Column(db.Float, default=0.0, nullable=False)
    legal_fee = db.Column(db.Float, default=0.0, nullable=False)
    repayment_cycle = db.Column(db.String(50), default="monthly", nullable=False)
    status = db.Column(db.String(50), default="active", nullable=False)
    bank_name = db.Column(db.String(100), nullable=True)
    bank_account_number = db.Column(db.String(100), nullable=True)
    bank_branch = db.Column(db.String(100), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "hr_email": self.hr_email,
            "contact_person": self.contact_person,
            "contact_phone": self.contact_phone,
            "interest_rate": float(self.interest_rate) if self.interest_rate is not None else 10.0,
            "processing_fee_rate": float(self.processing_fee_rate) if self.processing_fee_rate is not None else 3.0,
            "access_fee_rate": float(self.access_fee_rate) if self.access_fee_rate is not None else 0.0,
            "legal_fee": float(self.legal_fee) if self.legal_fee is not None else 0.0,
            "repayment_cycle": self.repayment_cycle,
            "status": self.status,
            "bank_name": self.bank_name,
            "bank_account_number": self.bank_account_number,
            "bank_branch": self.bank_branch,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f"<Company {self.code} | {self.name}>"

from sqlalchemy import event
from sqlalchemy.orm import ORMExecuteState
from flask import has_request_context, g

@event.listens_for(db.session, "do_orm_execute")
def _add_tenant_filter(execute_state: ORMExecuteState):
    if not has_request_context():
        return
        
    if execute_state.is_select and not execute_state.is_column_load and not execute_state.is_relationship_load:
        if hasattr(g, "tenant_company") and g.tenant_company:
            for entity in execute_state.statement.get_select_entities():
                entity_class = getattr(entity, 'class_', None)
                if entity_class == Application:
                    execute_state.statement = execute_state.statement.where(Application.company == g.tenant_company)
                elif entity_class == Applicant:
                    execute_state.statement = execute_state.statement.where(Applicant.company == g.tenant_company)
                elif entity_class == StatementEntry:
                    execute_state.statement = execute_state.statement.where(StatementEntry.company == g.tenant_company)
                elif entity_class == ApplicantDocument:
                    subq = db.select(Applicant.id).where(Applicant.company == g.tenant_company)
                    execute_state.statement = execute_state.statement.where(ApplicantDocument.applicant_id.in_(subq))
                elif entity_class == ApplicationDocument:
                    subq = db.select(Application.id).where(Application.company == g.tenant_company)
                    execute_state.statement = execute_state.statement.where(ApplicationDocument.application_id.in_(subq))
