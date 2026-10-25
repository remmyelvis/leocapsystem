"""What happens in the demo: thirteen months of loans, and the hand-written stories a presenter walks through.

Everything is dated relative to today, so the demo never looks stale: whenever it is rebuilt, "7 days overdue" is 7 days
overdue today. Loans are described here as plain dictionaries (a spec) and then built by ledger.Loan.

The book grows over the year (about 5 loans a month at the start, 15 by now) and three employers join one after another,
which is the picture an investor or a prospective partner wants to see. Most loans are repaid on time; a few are late, a
few part-paid; the unusual ones are the named stories at the bottom.
"""
from datetime import datetime, time, timedelta
from decimal import Decimal as D

from dateutil.relativedelta import relativedelta

from . import people as P
from .ledger import Actor

SALARY_ADVANCE_PURPOSES = [
    "School fees", "Rent deposit", "Medical bill", "Car repair", "Family emergency", "Farm inputs", "Shopping until payday",
    "Wedding contribution", "Phone replacement", "Dental treatment", "School uniforms", "Travel upcountry", "Funeral costs",
    "Pay a small debt",
]
PERSONAL_PURPOSES = [
    "Stock for the shop", "New sewing machine", "Working capital", "Equipment upgrade", "Bulk purchase of supplies",
    "Seeds and fertiliser", "Renovate the premises", "Pay suppliers early", "Deposit on a delivery motorbike",
]
# Independent borrowers are priced by how they have repaid: the better the record, the lower the rate.
INDEPENDENT_RATES = {"tom": "0.10", "erick": "0.10", "lucy": "0.12", "nelson": "0.12", "halima": "0.12",
                     "joel": "0.14", "pauline": "0.14", "carol": "0.15"}
# chance of (paying late, paying in part) by how reliable the borrower has been
RELIABILITY = {"excellent": (0.0, 0.03), "good": (0.05, 0.07), "fair": (0.20, 0.12), "poor": (0.45, 0.10)}
NEEDS_JOB = {"late_paid", "grace", "samuel", "written_off"}  # loans the daily job must charge fees on before the story continues


# -- dates ------------------------------------------------------------------------------------------------------------

def at(world, days, hour=10, minute=0):
    return datetime.combine(world.today + timedelta(days=days), time(hour, minute))


def month_end(dt):
    """Salary advances fall due on the last day of the month (the app sets it at midnight)."""
    return datetime.combine((dt.replace(day=1) + relativedelta(months=1) - timedelta(days=1)).date(), time(0, 0))


def next_business_day(dt):
    dt += timedelta(days=1)
    while dt.weekday() >= 5:
        dt += timedelta(days=1)
    return dt


def working_hour(rng, day):
    return datetime.combine(day.date(), time(rng.randint(8, 17), rng.randint(0, 59)))


def round_to(x, step):
    return int(round(x / step) * step)


# -- turning an idea into a spec --------------------------------------------------------------------------------------

def make_spec(world, who, kind, amount, applied, outcome, due=None, **extra):
    """One loan, as a dictionary. `who` is the borrower's key."""
    p = world.people[who]
    if due is None:
        due = month_end(applied) if kind == "salary_advance" else applied + relativedelta(months=1)
    rate = D(INDEPENDENT_RATES[who]) if kind == "personal" else D(str(world.company_rates[p["company"]])) / 100
    spec = dict(who=who, kind=kind, amount=amount, applied=applied, due=due, outcome=outcome, rate=rate, pay=p["pay"],
                company=p["company"], employer_name=p["employer_name"], job=p["job"],
                purpose=world.rng.choice(SALARY_ADVANCE_PURPOSES if kind == "salary_advance" else PERSONAL_PURPOSES))
    spec.update(extra)
    finish_dates(world, spec)
    return spec


def remit_date(world, company, due):
    """Employers pay the month's deductions across in one go a few days after month end, so every loan of a company-month
    is cleared on the same day (as "Bulk Loan paid")."""
    key = (company, due.year, due.month)
    if key not in world.remit:
        world.remit[key] = due + timedelta(days=world.rng.randint(2, 5), hours=14)
    return world.remit[key]


def finish_dates(world, spec):
    """Work out when a loan that ends in payment is paid (and part-paid), so the story is dated sensibly."""
    rng, now, outcome = world.rng, world.now, spec["outcome"]
    if outcome not in ("paid", "part_paid", "late_paid", "lucy_rolled"):
        return
    due, applied = spec["due"], spec["applied"]
    if outcome == "late_paid":
        age = (world.today - due.date()).days
        days = spec.get("late_days") or rng.randint(10, max(10, min(26, age - 1)))
        spec["pay_at"] = due + timedelta(days=days, hours=11)
        return
    if spec["kind"] == "salary_advance" and spec["company"] and not spec.get("independent_pay"):
        spec["pay_at"] = remit_date(world, spec["company"], due)
        spec["bulk"] = outcome == "paid" and rng.random() < 0.75
        spec["bulk_note"] = f"{world.company_names[spec['company']]}: {due.strftime('%B')} payroll deduction received"
    else:
        spec["pay_at"] = working_hour(rng, due - timedelta(days=rng.randint(0, 4)))
    if outcome == "part_paid":
        spec["part_at"] = working_hour(rng, applied + (due - applied) * rng.uniform(0.35, 0.65))
        repay = spec["amount"] * (1 + float(spec["rate"]))
        spec["part_amount"] = max(1000, round_to(repay * rng.uniform(0.3, 0.55), 100))
        spec["bulk"] = False


# -- the random history -----------------------------------------------------------------------------------------------

def history_specs(world):
    """Thirteen months of everyday lending by everyone who is not in a story."""
    rng, today, now = world.rng, world.today, world.now
    pool = [k for k, p in world.people.items() if p["kind"] in ("employee", "independent") and k not in P.STORY_KEYS]
    next_free = {k: world.people[k]["joined"] + timedelta(days=3) for k in pool}
    specs = []
    for m in range(12, -1, -1):
        start = datetime.combine(today.replace(day=1) - relativedelta(months=m), time(0, 0))
        last = min(start + relativedelta(months=1) - timedelta(seconds=1), now - timedelta(days=2))
        if last <= start:
            continue
        target = 5 + (12 - m) * 0.85
        if m == 0:
            target *= max(0.2, (last - start).days / 30)
        for _ in range(max(1, int(round(target + rng.uniform(-1.2, 1.2))))):
            kind = "personal" if rng.random() < 0.11 else "salary_advance"
            lo, hi = start + timedelta(days=4), min(start + timedelta(days=26), last)
            day = lo + timedelta(days=rng.random() * (hi - lo).days) if hi > lo else start + timedelta(days=rng.random() * max(1, (last - start).days))
            applied = working_hour(rng, day)
            wanted = "independent" if kind == "personal" else "employee"
            ok = [k for k in pool if world.people[k]["kind"] == wanted and world.people[k]["joined"] + timedelta(days=2) <= applied
                  and next_free[k] <= applied]
            if not ok:
                continue
            who = rng.choices(ok, weights=[{"excellent": 1.3, "good": 1.0, "fair": 0.8, "poor": 0.6}[world.people[k]["reliability"]] for k in ok])[0]
            p = world.people[who]
            if kind == "salary_advance":
                amount = min(max(3000, round_to(rng.uniform(0.10, 0.30) * p["pay"], 500)), round_to(p["pay"] / 3.3, 500))
            else:
                amount = min(max(15000, round_to(rng.uniform(0.3, 0.9) * p["pay"], 5000)), p["loan_limit"])
            spec = make_spec(world, who, kind, amount, applied, "open")
            outcome = pick_outcome(world, spec, p["reliability"])
            spec["outcome"] = outcome
            finish_dates(world, spec)
            if outcome != "open":
                if spec["pay_at"] > now - timedelta(hours=2):  # the employer has not paid across yet
                    spec["outcome"] = outcome = "open"
            next_free[who] = spec["due"] + timedelta(days=3)
            specs.append(spec)
    return specs


def pick_outcome(world, spec, reliability):
    rng, age = world.rng, (world.today - spec["due"].date()).days
    if age < 0:
        return "open"
    if age < 9:  # not late enough to be anything but paid, and nobody is left unpaid right at a reminder date
        return "paid"
    late, part = RELIABILITY[reliability]
    roll = rng.random()
    if age >= 12 and roll < late:
        return "late_paid"
    if roll < late + part and (spec["due"] - spec["applied"]).days >= 12:
        return "part_paid"
    return "paid"


# -- the stories ------------------------------------------------------------------------------------------------------

def story_specs(world):
    """The loans a presenter talks about. Each one is there for a reason (the comment says which)."""
    T, S = (lambda d, h=10, m=0: at(world, d, h, m)), []

    def add(who, kind, amount, applied, outcome, due=None, **kw):
        S.append(make_spec(world, who, kind, amount, applied, outcome, due=due, **kw))

    sa, pl = "salary_advance", "personal"
    # Everyday good borrowers: a record of on-time repayment behind each of the live cases below.
    for who, loans in {
        "wanjiku": [(15000, -150), (20000, -95), (18000, -60)], "brian": [(10000, -120), (14000, -70)],
        "faith": [(22000, -200), (24000, -140), (25000, -80)], "hassan": [(16000, -90)], "peter": [(12000, -150)],
        "grace": [(35000, -240), (38000, -180)], "samuel": [(14000, -130)], "daniel": [(15000, -300)],
        "kevin": [(20000, -100)], "naomi": [(25000, -70)], "rebecca": [(18000, -50)], "mercy": [(12000, -100)],
    }.items():
        for amount, day in loans:
            add(who, sa, amount, T(day), "paid")
    # Live cases for the daily job: press "run today's job" and each of these does something different.
    add("wanjiku", sa, 18000, T(-16), "open", due=T(+7, 0, 0))   # reminder: due in 7 days
    add("brian", sa, 12500, T(-20), "open", due=T(+3, 0, 0))     # reminder: due in 3 days
    add("faith", sa, 25000, T(-22), "open", due=T(0, 0, 0))      # urgent: due today
    add("hassan", sa, 15000, T(-37), "open", due=T(-7, 0, 0))    # warning: 7 days overdue
    add("peter", sa, 20000, T(-40), "open", due=T(-8, 0, 0))     # becomes DELINQUENT: 15% fee + 10% charge + notice
    add("peter", sa, 11000, T(-110), "late_paid")                # he has paid late before
    # Collections: a delinquent borrower with fees, part payments and a penalty; a default that went to demand letter.
    add("grace", sa, 40000, T(-62), "grace", due=T(-35, 0, 0))
    add("samuel", sa, 22000, T(-88), "samuel", due=T(-72, 0, 0))
    add("daniel", sa, 16000, T(-250), "written_off")
    # A rollover: the borrower asked for more time and was charged interest on the balance.
    add("lucy", pl, 30000, T(-220), "paid")
    add("lucy", pl, 60000, T(-75), "lucy_rolled", due=T(-44, 9, 30))
    add("lucy", pl, 80000, T(-10), "open", due=T(+20, 9, 30))
    # Two independent borrowers underwritten from their M-Pesa statements: one strong, one risky.
    add("tom", pl, 50000, T(-200), "paid")
    add("tom", pl, 80000, T(-120), "paid")
    add("tom", pl, 100000, T(-1, 15, 40), "pending")             # waiting for a decision: approve it live
    add("carol", pl, 40000, T(-150), "late_paid", late_days=40)
    add("carol", pl, 60000, T(-6, 11, 15), "declined", reason="Declined after the statement review: Fuliza dependency and irregular inflows (see the financial analysis).")
    # Applications waiting at each stage, so approval, rejection and disbursement can be shown live.
    add("kevin", sa, 20000, T(-1, 15, 20), "pending")
    add("naomi", sa, 35000, world.now - timedelta(hours=3), "pending")
    add("rebecca", sa, 30000, T(-2, 9, 10), "approved")          # approved by HR, waiting for the lender to disburse
    add("mercy", sa, 15000, T(-1, 12, 5), "pending")             # an HR manager's own loan, decided by finance
    add("collins", sa, 30000, T(-20, 14, 0), "declined", reason="The amount is more than one third of the average salary on the payslips.")
    return S


# -- carrying out an outcome ------------------------------------------------------------------------------------------

def approver_for(world, loan):
    """Who decides: HR for staff of an employer, finance for HR's own loans, the lender's credit head for the rest."""
    a = loan.applicant
    if not loan.spec["company"]:
        return world.actors["credit"]
    if a.role == "hr":
        return world.actors[("finance", a.applicant_type)]
    return world.actors[("hr", a.applicant_type)]


def start(world, loan, upto="disbursed"):
    """Approve, (for personal loans, set and confirm the rate), then disburse the next business day. Returns the
    disbursement time."""
    rng, s = world.rng, loan.spec
    when = s["applied"] + timedelta(hours=rng.randint(2, 20), minutes=rng.randint(0, 59))
    approver = approver_for(world, loan)
    if loan.kind == "personal":
        credit = world.actors["credit"]
        if loan.rate != D("0.10"):
            loan.set_rate("0.1", credit, when, "Rate set from the applicant's statements and repayment record")
        loan.confirm_rate(when + timedelta(hours=2))
        when, approver = when + timedelta(hours=3), credit
    loan.approve(approver, when)
    if upto == "approved":
        return when
    paid_out = working_hour(rng, next_business_day(when))
    loan.disburse(world.actors["collections"], paid_out, f"Bank transfer to the borrower, ref DEMO-{rng.randint(10000, 99999)}")
    return paid_out


def stage_one(world, loan):
    """Everything up to the point where the daily job takes over (for loans that need it), or the whole story."""
    s, o, collections = loan.spec, loan.spec["outcome"], world.actors["collections"]
    if o == "pending":
        return
    if o == "approved":
        start(world, loan, "approved")
        return
    if o == "declined":
        loan.decline(approver_for(world, loan), s["applied"] + timedelta(hours=world.rng.randint(3, 20)), s["reason"])
        return
    start(world, loan)
    if o == "paid":
        loan.pay_full(collections, s["pay_at"], **({"memo": "Bulk Loan paid", "note": s["bulk_note"]} if s.get("bulk") else {}))
    elif o == "part_paid":
        loan.partial(s["part_amount"], collections, s["part_at"])
        loan.pay_full(collections, s["pay_at"])
    elif o == "lucy_rolled":
        due = s["due"]
        loan.rollover(0.12, collections, due)
        loan.partial(20000, collections, due + timedelta(days=7, hours=1))
        loan.partial(20000, collections, due + timedelta(days=25, hours=2))
        loan.pay_full(collections, due + timedelta(days=33, hours=3))
    # "open": nothing more happens. needs_job outcomes: the story waits for the job's fees.


def stage_two(world, loan):
    """What happens after the job has charged its fees on a loan that went late."""
    s, o, collections = loan.spec, loan.spec["outcome"], world.actors["collections"]
    due, T = s["due"], world.today
    if o == "late_paid":
        loan.pay_full(collections, s["pay_at"], note="Loan paid in full, fees included")
    elif o == "grace":
        loan.partial(15000, collections, at(world, -20, 11))
        loan.penalty(2500, "Dishonoured cheque fee", collections, at(world, -12, 10))
        loan.partial(8000, collections, at(world, -9, 15))
    elif o == "samuel":
        loan.default(collections, due + timedelta(days=27, hours=10))
        loan.escalate(collections, due + timedelta(days=32, hours=10))
    elif o == "written_off":
        loan.write_off(world.actors["credit"], due + timedelta(days=100, hours=10))
