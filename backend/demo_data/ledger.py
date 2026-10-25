"""Builds a loan the way the real app writes one: the application, its statement rows, its change history and the audit log.

Every method mirrors what an admin, HR or finance user does on screen (approve, disburse, record a payment, add a penalty,
mark defaulted, write off), so the demo data looks exactly like data produced by clicking through the real screens, and
the same screens, reports and PDFs read it without any special case.
"""
import hashlib
from datetime import timedelta
from decimal import Decimal as D, ROUND_HALF_UP

from dateutil.relativedelta import relativedelta

from website.audit_hook import _describe, _entity
from website.models import Application, ApplicationAudit, AuditAction, AuditLog, StatementEntry

CENT = D("0.01")


def money(value):
    return D(str(value)).quantize(CENT, rounding=ROUND_HALF_UP)


def plain(n):
    """5000 -> "5000", 5000.5 -> "5000.5": the way a typed payment amount is kept in the memo."""
    n = D(str(n))
    return str(int(n)) if n == n.to_integral() else format(n.normalize(), "f")


class Actor:
    """Someone who does things in the system: their account id, email, role and company."""

    def __init__(self, id, email, role, company=None):
        self.id, self.email, self.role, self.company = id, email, role, company or "Leocap Invest"


class Ctx:
    """Shared tools for building: the database, the random generator (seeded, so ids stay the same on every reset) and
    the audit log writer."""

    def __init__(self, db, rng, now):
        self.db, self.rng, self.now = db, rng, now

    def uid(self):
        import uuid
        return str(uuid.UUID(int=self.rng.getrandbits(128), version=4))

    def ip(self, actor):
        """A stable made-up address per person, from the ranges reserved for documentation."""
        h = int(hashlib.md5(actor.email.encode()).hexdigest(), 16)
        return f"{('203.0.113', '198.51.100')[h % 2]}.{1 + (h >> 8) % 250}"

    def log(self, method, path, actor, when, fields=(), values=None, status="success", http_status=200, action=None, error=None):
        """One System Audit Log row, worded by the same table the live app uses."""
        kind, entity_id = _entity(path)
        action = action or {"POST": AuditAction.CREATE, "PATCH": AuditAction.UPDATE, "PUT": AuditAction.UPDATE,
                            "DELETE": AuditAction.DELETE}.get(method, AuditAction.EXPORT)
        new_values = {"http_status": http_status, "ip": self.ip(actor), "fields": list(fields)}
        if values:
            new_values["values"] = values
        self.db.session.add(AuditLog(
            action=action, description=_describe(method, path), endpoint=path, http_method=method, status=status,
            error_message=error, actor_id=actor.id, actor_email=actor.email, actor_role=actor.role,
            entity_type=kind, entity_id=entity_id, new_values=new_values, created_at=when))


class Loan:
    """One loan and its statement. `balance` is the running balance of the statement, kept the way the app keeps it."""

    def __init__(self, ctx, applicant, spec):
        self.ctx, self.applicant, self.spec = ctx, applicant, spec
        self.kind = spec["kind"]  # salary_advance or personal
        self.amount = D(str(spec["amount"]))
        self.rate = D(str(spec["rate"]))
        self.balance = D(0)
        self.last = None  # time of the last statement row, to keep rows in order
        self.app = None
        self.disbursed_at = None

    # -- opening ---------------------------------------------------------------------------------------------------

    def open(self):
        """What happens when the loan is applied for: the application and its two opening statement rows."""
        s, a, ctx = self.spec, self.applicant, self.ctx
        sa = self.kind == "salary_advance"
        processing = money(self.amount * D("0.03"))
        access = money(self.amount * D("0.02")) if sa else D(0)
        legal = D(500) if sa else D(0)
        interest = money(self.amount * self.rate)
        pay = s["pay"]
        self.app = Application(
            id=ctx.uid(), employment_type="employed" if s.get("company") else "self-employed",
            company=a.applicant_type, employer_name=s.get("employer_name"),
            employment_nature="permanent" if s.get("company") else "self-employed",
            payroll_number=a.payroll_number, designation=s.get("job"),
            is_first_time_applicant="true" if s.get("first") else "false",
            month_one=str(pay), month_two=str(int(pay * ctx.rng.uniform(0.97, 1.03))), month_three=str(int(pay * ctx.rng.uniform(0.97, 1.03))),
            loan_type=self.kind, loan_purpose=s["purpose"], amount_applied=self.amount, processing_fees=processing,
            access_fees=access, legal_fees=legal, disbursement_amount=self.amount - processing - access - legal,
            repayment_amount=self.amount + interest, outstanding_balance=self.amount + interest,
            interest_rate=format(self.rate.normalize(), "f"), created_at=s["applied"], due_date=s["due"],
            month=s["due"].strftime("%B"), loan_status="pending_processing", repayment_status="unpaid",
            applicant_id=a.id, applicant_role=a.role, partially_paid_count=0, interest_charged_count=0, hr_status="okay")
        ctx.db.session.add(self.app)
        self.row("New loan applied", debit=self.amount, when=s["applied"])
        self.row(f"Interest charged ({float(self.rate) * 100}%)", debit=interest, when=s["applied"] + timedelta(seconds=1))
        ctx.log("POST", "/api/applications", Actor(a.id, a.email, a.role, a.applicant_type), s["applied"], fields=["amount", "loan_type"])
        return self

    # -- the statement ---------------------------------------------------------------------------------------------

    def row(self, memo, debit=0, credit=0, when=None):
        """Add a statement row and move the running balance (and the loan's tracked balance) with it."""
        when = max(when, self.last + timedelta(seconds=1)) if self.last else when
        self.balance = self.balance + D(str(debit)) - D(str(credit))
        self.ctx.db.session.add(StatementEntry(
            applicant_id=self.applicant.id, application_id=self.app.id, memo=memo, debit=D(str(debit)), credit=D(str(credit)),
            balance=self.balance, date=when))
        self.app.outstanding_balance = max(self.balance, D(0)) if memo != "Loan written off" else D(0)
        self.last = when

    def resync(self):
        """Pick the loan up again after something outside this class changed it (the daily job adds fees to the balance)."""
        self.ctx.db.session.refresh(self.app)
        self.balance = D(str(self.app.outstanding_balance))
        rows = StatementEntry.query.filter_by(application_id=self.app.id).order_by(StatementEntry.date.desc()).first()
        self.last = rows.date if rows else None

    # -- the change history ----------------------------------------------------------------------------------------

    def audit(self, field, old, new, by, when, notes=None):
        a = self.app
        self.ctx.db.session.add(ApplicationAudit(
            application_id=a.id, application_old_loan_amount=float(a.amount_applied), application_new_loan_amount=float(a.amount_applied),
            application_old_repayment_amount=float(a.repayment_amount), application_new_repayment_amount=float(a.repayment_amount),
            field_name=field, old_status=old, new_status=new, changed_by_email=by.email, changed_by_role=by.role,
            changed_by_company=by.company, changed_at=when, notes=notes))

    def set_loan_status(self, new, by, when, notes=None):
        self.audit("loan_status", self.app.loan_status, new, by, when, notes)
        self.app.loan_status = new

    def set_repayment_status(self, new, by, when, notes=None):
        if self.app.repayment_status != new:
            self.audit("repayment_status", self.app.repayment_status, new, by, when, notes)
            self.app.repayment_status = new

    # -- the steps an admin takes ----------------------------------------------------------------------------------

    def approve(self, by, when):
        self.set_loan_status("approved", by, when)
        self.ctx.log("PATCH", f"/api/applications/approve/{self.app.id}", by, when)

    def decline(self, by, when, reason):
        self.set_loan_status("declined", by, when, reason)
        self.ctx.log("PATCH", f"/api/applications/reject/{self.app.id}", by, when, fields=["message"])

    def set_rate(self, old, by, when, notes):
        """Personal loans: the admin sets the rate and the borrower confirms it, before approval."""
        self.audit("interest_rate", old, format(self.rate.normalize(), "f"), by, when, notes)

    def confirm_rate(self, when):
        b = Actor(self.applicant.id, self.applicant.email, "applicant", self.applicant.applicant_type)
        self.set_loan_status("confirmed", b, when)
        self.ctx.log("PATCH", f"/api/applications/rate-confirmed/{self.app.id}", b, when)

    def disburse(self, by, when, reference):
        self.app.notes = reference
        self.disbursed_at = when
        self.set_loan_status("disbursed", by, when)
        self.ctx.log("PATCH", f"/api/applications/disbursed/{self.app.id}", by, when)

    # -- money coming in -------------------------------------------------------------------------------------------

    def partial(self, amount, by, when):
        """Record a part payment ("Partially paid 5000")."""
        amount = money(amount)
        self.row(f"Partially paid {plain(amount)}", credit=amount, when=when)
        self.app.partially_paid_date, self.app.partially_paid_count = when, (self.app.partially_paid_count or 0) + 1
        self.app.memo = f"Partially paid {plain(amount)}"
        # a delinquent loan stays delinquent while it is paid down (the daily job would charge the fee again otherwise)
        if self.app.repayment_status != "delinquent":
            self.set_repayment_status("partially_paid", by, when)
        self.ctx.log("PATCH", f"/api/applications/partially-paid/{self.app.id}", by, when, fields=["amount"], values={"amount": float(amount)})

    def pay_full(self, by, when, memo="Loan paid", note="Loan paid in full"):
        """Mark the loan paid: a credit for what was still owed, and the balance goes to nothing."""
        owed = max(self.balance, D(0))
        self.row(memo, credit=owed, when=when)
        self.set_repayment_status("paid", by, when, note)
        self.ctx.log("PATCH", f"/api/applications/paid/{self.app.id}" if memo == "Loan paid" else "/api/applications/bulk/paid", by, when)

    # -- the things that go wrong ----------------------------------------------------------------------------------

    def rollover(self, rate, by, when):
        """Charge interest on what is still owed and move the due date a month on (the borrower asked for more time)."""
        interest = money(max(self.balance, D(0)) * D(str(rate)))
        self.app.repayment_amount = D(str(self.app.repayment_amount)) + interest
        self.app.memo = f"Interest charged {plain(D(str(rate)) * 100)}%"
        self.row(self.app.memo, debit=interest, when=when)
        self.app.due_date = self.app.due_date + relativedelta(months=1)
        self.app.month = self.app.due_date.strftime("%B")
        self.app.interest_charged_date, self.app.interest_charged_count = when, (self.app.interest_charged_count or 0) + 1
        self.ctx.log("PATCH", f"/api/applications/charge-interest/{self.app.id}", by, when, fields=["interest_rate"], values={"interest_rate": float(D(str(rate)) * 100)})

    def penalty(self, amount, description, by, when):
        self.row(f"Penalty: {description}", debit=money(amount), when=when)
        self.ctx.log("POST", f"/api/applications/penalty/{self.app.id}", by, when, fields=["amount", "date", "description"])

    def default(self, by, when):
        self.app.repayment_status = "defaulted"
        self.set_loan_status("defaulted", by, when, "Marked as defaulted")
        self.ctx.log("PATCH", f"/api/applications/default/{self.app.id}", by, when)

    def escalate(self, by, when):
        self.app.repayment_status = "escalated"
        self.ctx.log("GET", f"/api/applications/escalate/{self.app.id}", by, when, action=AuditAction.UPDATE)

    def write_off(self, by, when):
        owed = max(self.balance, D(0))
        self.row("Loan written off", credit=owed, when=when)
        self.app.repayment_amount, self.app.repayment_status, self.app.loan_status = D(0), "paid", "written_off"
        self.ctx.log("POST", f"/api/applications/write-off/{self.app.id}", by, when)
