"""Showcase data for the demo / presentation environment.

`seed_demo_data(app)` wipes the demo database and rebuilds it: three employers, their staff, the lender's staff, 46 borrowers,
thirteen months of loans with their statements, change history and audit log, sample documents, M-Pesa statements, and a
handful of hand-written stories (see plan.py). Everything is dated relative to today and built from a fixed random seed, so a
rebuild always looks fresh and every person, loan and link keeps the same id.

It can only ever run against a demo database: DEMO_MODE must be True and the database name must contain the word "demo". It refuses to
wipe a database that holds anything but the demo's own ".example" addresses.

The fees on late loans are not invented: the real daily job is run once, and the loans it charges (15% fee and 10% charge, a
notice email) are then dated to the day the job would have charged them. That keeps the demo honest: it is the product's own
behaviour, not a picture of it.
"""
import os
import random
import re
import shutil
from datetime import datetime, time, timedelta

from werkzeug.security import generate_password_hash
from werkzeug.utils import secure_filename

from . import checks, docs, mpesa, people as P, plan
from .ledger import Actor, Ctx, Loan, money

SEED = 2026
STATEMENT_KEYS = [i[0] for i in P.INDEPENDENTS] + ["wanjiku", "faith"]


class DemoGuardError(RuntimeError):
    """Raised when the demo tools are pointed at something that is not the demo."""


def assert_demo_target(uri):
    name = (uri or "").rsplit("/", 1)[-1].split("?")[0].lower()
    if os.environ.get("DEMO_MODE") != "True":
        raise DemoGuardError("DEMO_MODE is not True: this tool only runs in the demo environment. Nothing was changed.")
    if not re.search(r"(^|[^a-z0-9])demo($|[^a-z0-9])", name):  # the word "demo", so "leocapin_demo" and "demo.db" pass but "notdemo" does not
        raise DemoGuardError(f"The database {name!r} is not a demo database (its name must contain the word 'demo', as in leocapin_demo). Nothing was changed.")


class World:
    """Everything the builders share."""


def seed_demo_data(app, log=print, now=None):
    """Rebuild the demo database. Returns a summary dictionary."""
    from website.extensions import db

    assert_demo_target(app.config.get("SQLALCHEMY_DATABASE_URI"))
    with app.app_context():
        _wipe(app, db, log)
        w = _world(app, db, now)
        log("People and companies...")
        _create_people(w)
        log("Loans (thirteen months of history, then the stories)...")
        _create_loans(w)
        log("Documents, M-Pesa statements, emails and the audit trail...")
        _create_extras(w)
        db.session.commit()
        _analyse_statements(w)
        db.session.commit()
        summary = _summary(w)
        failed = [(label, detail) for label, ok, detail in checks.run(w.now) if not ok]
        for label, detail in failed:
            log(f"CHECK FAILED: {label} {detail}")
        if failed:
            raise RuntimeError(f"The demo data failed {len(failed)} self-check(s); it must not be used.")
        log("Done: " + ", ".join(f"{v} {k}" for k, v in summary.items()) + " (all self-checks passed)")
        return summary


# -- wiping ------------------------------------------------------------------------------------------------------------

def _wipe(app, db, log):
    from sqlalchemy import inspect, text

    if inspect(db.engine).has_table("applicants"):
        for table in ("applicants", "users"):
            if inspect(db.engine).has_table(table):
                for (email,) in db.session.execute(text(f"select email from {table}")):
                    if not email.endswith(".example"):
                        raise DemoGuardError(f"{table} holds {email!r}, which is not a demo address. Refusing to wipe this database.")
        for base, table in ((app.config["APPLICANT_DOCUMENTS"], "applicants"), (app.config["APPLICATION_DOCUMENTS"], "applications")):
            for (id_,) in db.session.execute(text(f"select id from {table}")):
                shutil.rmtree(os.path.join(base, secure_filename(str(id_))), ignore_errors=True)
    db.session.remove()
    log("Rebuilding the demo database...")
    db.drop_all()
    db.create_all()


# -- the world ---------------------------------------------------------------------------------------------------------

def _world(app, db, now):
    w = World()
    w.db, w.config = db, app.config
    w.now = (now or datetime.utcnow()).replace(microsecond=0)
    w.today = w.now.date()
    w.rng = random.Random(SEED)
    w.ctx = Ctx(db, w.rng, w.now)
    w.remit, w.people, w.applicants, w.actors, w.loans, w.companies = {}, {}, {}, {}, [], {}
    w.company_rates = {c["code"]: c["rate"] for c in P.COMPANIES}
    w.company_names = {c["code"]: c["name"] for c in P.COMPANIES}
    w.password = generate_password_hash(P.PASSWORD)  # hashed once: every demo account shares the password
    return w


def _phone(rng):
    # no spaces: every phone box on the site accepts only 07xxxxxxxx / +2547xxxxxxxx (a spaced number made the demo's borrowers unable to apply)
    return f"07{rng.choice('1237')}{rng.randint(0, 9)}{rng.randint(100, 999)}{rng.randint(100, 999)}"


def _create_people(w):
    from website.models import Applicant, Company, User

    rng, ctx, db = w.rng, w.ctx, w.db
    # The lender's own staff.
    for s in P.LENDER_STAFF:
        email = f"{P.slug(s['name'])}@{P.DOMAIN}"
        user = User(id=ctx.uid(), name=s["name"], email=email, number=s["phone"], password=w.password, role="admin",
                    created_at=w.now - timedelta(days=400))
        db.session.add(user)
        w.actors[s["key"]] = Actor(user.id, email, "admin")
    # The employers.
    hr_email = {c["code"]: f"{P.slug(next(e['name'] for e in P.EMPLOYER_STAFF if e['company'] == c['code'] and e['role'] == 'hr'))}@{c['domain']}"
                for c in P.COMPANIES}
    for c in P.COMPANIES:
        company = Company(id=ctx.uid(), name=c["name"], code=c["code"], hr_email=hr_email[c["code"]], contact_person=c["contact"],
                          contact_phone=c["phone"], interest_rate=c["rate"], processing_fee_rate=3.0, access_fee_rate=2.0,
                          legal_fee=500.0, repayment_cycle="monthly", status="active", bank_name="Sample Bank (demo)",
                          bank_account_number="0000 0000 0001", bank_branch=c["branch"], notes=c["notes"],
                          created_at=w.now - timedelta(days=c["days_ago"]))
        db.session.add(company)
        w.companies[c["code"]] = company
    # People who borrow on their own belong to the "personal" company, as on the live platform (its row is made here because the
    # demo never seeds the live platform's default companies). A random id, so the ids drawn after it stay as they were.
    import uuid
    db.session.add(Company(id=str(uuid.uuid4()), name="Personal / Individual", code="personal", hr_email=f"loans@{P.DOMAIN}",
                           contact_person=P.LENDER_STAFF[0]["name"], contact_phone=P.LENDER_STAFF[0]["phone"], interest_rate=10.0,
                           processing_fee_rate=3.0, access_fee_rate=0.0, legal_fee=0.0, repayment_cycle="monthly", status="active",
                           created_at=w.now - timedelta(days=400)))
    domains = {c["code"]: c["domain"] for c in P.COMPANIES}
    onboarded = {c["code"]: c["days_ago"] for c in P.COMPANIES}

    def person(key, name, kind, company, job, pay, reliability, employer_name, role="applicant", loan_limit=None):
        days = P.JOINED_DAYS_AGO.get(key) or (rng.randint(30, max(31, onboarded[company] - 8)) if company else rng.randint(60, 330))
        joined = w.now - timedelta(days=days, hours=rng.randint(0, 8))
        domain = domains.get(company, P.PERSONAL_DOMAIN)
        email = f"{P.slug(name)}@{domain}"
        applicant = Applicant(
            id=ctx.uid(), name=name, email=email, phone_number=_phone(rng), password=w.password, role=role,
            applicant_type=company or "personal", kra_pin=f"A{rng.randint(0, 999999999):09d}{rng.choice('BCDEFGHJKLMNPQRTUVWXYZ')}",
            id_number=str(rng.randint(20000000, 39999999)), loan_limit=loan_limit,
            payroll_number=f"{company[:3].upper()}-{rng.randint(100, 999)}" if company else None, applicant_status="active",
            created_at=joined)
        db.session.add(applicant)
        w.applicants[key] = applicant
        w.people[key] = dict(kind=kind, name=name, email=email, company=company, job=job, pay=pay, reliability=reliability,
                             employer_name=employer_name, joined=joined, loan_limit=loan_limit or 0)
        if role in ("hr", "finance"):
            w.actors[(role, company)] = Actor(applicant.id, email, role, company)

    for s in P.EMPLOYER_STAFF:
        person(s["key"], s["name"], "staff", s["company"], s["job"], s["salary"], "excellent", w.company_names[s["company"]], role=s["role"])
    for key, name, company, job, pay, reliability in P.EMPLOYEES:
        person(key, name, "employee", company, job, pay, reliability, w.company_names[company])
    for key, name, trade, business, town, income, reliability in P.INDEPENDENTS:
        person(key, name, "independent", None, trade, income, reliability, f"{business}, {town}", loan_limit=int(round(income * 1.5, -4)))
    # What the lender's staff wrote on the borrowers they chased.
    notes = {
        "grace": "Salary confirmed by HR. Agreed a repayment plan by phone: 15,000 now and the balance in two instalments.",
        "samuel": "Left the company in July. Phoned 3 times and visited the last known address. Referred to recovery; demand letter issued.",
        "peter": "Promised to pay on the 28th. HR has been asked to confirm the payroll deduction.",
        "carol": "Statement review: heavy Fuliza use and irregular income. Lend only with a guarantor.",
        "tom": "Strong, regular inflows. Loan limit raised to 150,000 after the last repayment.",
    }
    for key, text in notes.items():
        w.applicants[key].notes = text
    w.applicants["tom"].loan_limit = 150000
    w.db.session.flush()


# -- loans -------------------------------------------------------------------------------------------------------------

def _create_loans(w):
    specs = plan.history_specs(w) + plan.story_specs(w)
    specs.sort(key=lambda s: s["applied"])
    seen = set()
    for s in specs:
        s["first"] = s["who"] not in seen
        seen.add(s["who"])
    late = [s for s in specs if s["outcome"] in plan.NEEDS_JOB]
    rest = [s for s in specs if s["outcome"] not in plan.NEEDS_JOB]

    # 1. Loans that go late. They are built up to the day they fall overdue, then the real daily job charges them.
    late_loans = [_build(w, s) for s in late]
    w.db.session.commit()
    _run_daily_job(w)
    for loan in late_loans:
        _backdate_job_charges(w, loan)
        loan.resync()
        plan.stage_two(w, loan)
    w.db.session.commit()
    # 2. Everything else, including the live cases that must still be waiting for the next run of the job.
    for s in rest:
        _build(w, s)
    w.db.session.commit()


def _build(w, spec):
    loan = Loan(w.ctx, w.applicants[spec["who"]], spec).open()
    w.loans.append(loan)
    if loan.kind == "personal":
        docs.loan_documents(w.ctx, w.config, loan, ["bank_statement", "mpesa_statement"], spec["applied"] + timedelta(minutes=6))
    plan.stage_one(w, loan)
    return loan


def _run_daily_job(w):
    """Run the product's own daily job on the loans that are late. It adds the 10% late-payment charge and records the delinquency
    notice; the 15% collection fee is not its job (it is charged when a loan is escalated). (For the demo the 10% applies to every
    loan, whatever its application date.)"""
    import website.cron as cron

    cron.LATE_CHARGE_FROM = datetime(2000, 1, 1)
    os.environ["CRON_SECRET"] = "demo-seed-run"
    import logging
    from flask import current_app

    logging.disable(logging.ERROR)  # on SQLite the job's email record can hit a write lock; _backdate_job_charges covers for it
    try:
        reply = current_app.test_client().post("/api/cron/reminders", headers={"X-Cron-Secret": "demo-seed-run"})
    finally:
        logging.disable(logging.NOTSET)
    if reply.status_code != 200:
        raise RuntimeError(f"The daily job failed while building the demo: {reply.status_code} {reply.get_data(as_text=True)[:200]}")
    w.db.session.expire_all()
    from website.models import AuditLog
    run = AuditLog.query.filter(AuditLog.description == "Ran the daily reminder job").order_by(AuditLog.created_at.desc()).first()
    if run:
        run.created_at = min(w.now, datetime.combine(w.today, time(6, 0)))
        run.actor_email, run.actor_role = "scheduled job", "system"


def _backdate_job_charges(w, loan):
    """The job charged these loans just now; date its charge row and notice to the day it would have (8 days after the due date)."""
    from website.models import AuditLog, StatementEntry

    app = loan.app
    charged_on = datetime.combine(app.due_date.date() + timedelta(days=8), time(6, 0))
    rows = StatementEntry.query.filter(StatementEntry.application_id == app.id,
                                       StatementEntry.memo.in_(["Delinquency Collection Fee", "Late Payment Charge"])).order_by(StatementEntry.date).all()
    for i, row in enumerate(rows):
        row.date = charged_on + timedelta(seconds=i)
    notices = AuditLog.query.filter(AuditLog.entity_id == app.id, AuditLog.description.like("Emailed a delinquency notice%")).all()
    for log in notices:
        log.created_at = charged_on + timedelta(minutes=2)
    if rows and not notices:
        # SQLite lets one writer at a time, so the job's own email record can fail there (never on the live database)
        from website.models import AuditAction
        from website.system_email_utils import mask_address

        shown = mask_address(loan.applicant.email)
        w.db.session.add(AuditLog(
            action=AuditAction.CREATE, description=f"Emailed a delinquency notice to {shown}", status="success", actor_id="system",
            actor_role="system", entity_type="Application", entity_id=app.id,
            new_values={"to": shown, "subject": "NOTICE OF DELINQUENCY"}, created_at=charged_on + timedelta(minutes=2)))


# -- documents, statements, emails, audit -----------------------------------------------------------------------------

def _create_extras(w):
    from website.models import AuditAction, Email, HrEmail

    ctx, rng, db = w.ctx, w.rng, w.db
    # Applicant documents: ID and KRA for everyone, the employment contract too for staff of an employer.
    for key, a in w.applicants.items():
        types = ["id_copy", "kra_certificate"] + (["contract_document"] if w.people[key]["company"] else [])
        docs.applicant_documents(ctx, w.config, a, types, a.created_at + timedelta(days=1))
    for key in STATEMENT_KEYS:
        mpesa.build_statement(w, key)
    # Emails the platform sent about recent loans.
    for loan in w.loans:
        s, a = loan.spec, loan.applicant
        if s["company"] and (w.now - s["applied"]).days <= 45:
            db.session.add(HrEmail(
                application_id=loan.app.id, recipient=w.companies[s["company"]].hr_email, company=s["company"],
                subject=f"New loan application from {a.name}", status="sent", created_at=s["applied"] + timedelta(minutes=1),
                body=f"{a.name} ({s['job']}) has applied for a salary advance of KES {loan.amount:,.2f}. Please confirm their employment details."))
        if loan.disbursed_at and (w.now - loan.disbursed_at).days <= 30:
            db.session.add(Email(
                id=ctx.uid(), application_id=loan.app.id, recipient=a.email, subject="Your loan has been disbursed", status="sent",
                created_at=loan.disbursed_at + timedelta(minutes=5),
                confirmation_text=f"Dear {a.name.split()[0]}, KES {loan.app.disbursement_amount:,.2f} has been sent to you ({loan.app.notes}). "
                                  f"Your loan of KES {loan.amount:,.2f} is due on {loan.app.due_date:%d %B %Y}. Thank you for borrowing with Leocap Invest."))
    # Who signed in and what they downloaded over the last three weeks.
    staff = [w.actors["credit"], w.actors["collections"]] + [v for k, v in w.actors.items() if isinstance(k, tuple)]
    for d in range(21):
        day = datetime.combine(w.today - timedelta(days=d), time(0, 0))
        for _ in range(rng.randint(3, 7)):
            who = rng.choice(staff)
            path = "/api/auth/users/login" if who.role == "admin" else "/api/auth/applicant/login"
            when = day + timedelta(hours=rng.randint(7, 17), minutes=rng.randint(0, 59))
            if when <= w.now:
                ctx.log("POST", path, who, when, fields=["email"], action=AuditAction.LOGIN)
    collections = w.actors["collections"]
    for loan in w.loans:
        if loan.spec["outcome"] in ("grace", "samuel"):
            for days_ago in (14, 6):
                ctx.log("GET", f"/api/applications/{loan.app.id}/dossier", collections, w.now - timedelta(days=days_ago, hours=3), action=AuditAction.EXPORT)
    for code in w.company_rates:
        ctx.log("GET", f"/api/reports/applications/get-all/repayment/{code}/pdf", w.actors["credit"], w.now - timedelta(days=4, hours=2), action=AuditAction.EXPORT)


def _analyse_statements(w):
    """Run the product's own classifier over the statements, so categories and internal transfers are real."""
    from website.financial_engine.reconciliation_engine import reconcile_internal_transfers
    from website.financial_engine.transaction_classifier import classify_transactions
    from website.models import StatementUpload

    for upload in StatementUpload.query.all():
        classify_transactions(upload.id)
        reconcile_internal_transfers(upload.applicant_id)


def _summary(w):
    from website.models import Applicant, Application, AuditLog, StatementEntry

    return {"borrowers and staff": Applicant.query.count(), "loans": Application.query.count(),
            "statement rows": StatementEntry.query.count(), "audit log rows": AuditLog.query.count()}
