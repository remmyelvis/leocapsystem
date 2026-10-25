"""M-Pesa statements for the borrowers the lender underwrites from their phone money: the independents (no payslip) and two
salaried employees. Six months of believable transactions each, in the shapes the real statement reader produces, so the
Financial Analysis screen (income detection, M-Pesa metrics, credit score) runs for real on them with no outside service.

The contrast is deliberate: Tom Ochieng's statement is the one a lender is happy to see, Carol Mwende's is the one that
needs the analysis to say no.
"""
import string
from datetime import datetime, time, timedelta

from dateutil.relativedelta import relativedelta

from website.models import ParsedTransaction, StatementUpload

from .docs import _store

MONTHS = 6
PAYERS = ["Mary W", "John K", "Peter O", "Jane A", "Samuel M", "Grace N", "David K", "Esther A", "Moses T", "Lucy W",
          "Hassan M", "Faith C", "Brian O", "Rose A", "George N", "Ann N", "Kevin K", "Joyce W", "Victor O", "Susan C"]

# What each person's phone money looks like. receipts: (per month, low, high); curve: how each of the 6 months compares;
# fixed: (what, day of month, amount, months it applies to or None for all); variable: (what, per month, low, high).
PROFILES = {
    "tom": dict(receipts=(45, 800, 4200), curve=[1.0, 0.95, 1.05, 1.1, 1.0, 1.08],
                fixed=[("Paybill 247247 - Rent (landlord)", 1, 12000, None), ("Paybill 888880 - KPLC PREPAID token", 8, 2800, None),
                       ("Paybill 444400 - Nairobi Water", 10, 900, None), ("Paybill - Chama contribution", 15, 5000, None),
                       ("Paybill 522522 - Greenfield Academy term payment", 5, 20000, {0, 4, 5})],
                variable=[("Safaricom airtime purchase", 6, 100, 500), ("Till 412233 - SHELL PETROL STATION", 4, 2500, 4000),
                          ("Till 554433 - NAIVAS SUPERMARKET", 6, 1500, 5000), ("Withdrawal at Agent 112233 - Mtaani Agency", 5, 3000, 8000)]),
    "carol": dict(receipts=(12, 600, 6000), curve=[0.9, 0.4, 1.2, 0.3, 0.8, 0.35],
                  fixed=[("Paybill 247247 - Rent (landlord)", 3, 15000, None), ("Paybill 888880 - KPLC PREPAID token", 9, 3500, None)],
                  variable=[("Safaricom airtime purchase", 8, 100, 700), ("Till 661122 - Wholesale fabrics supplier", 3, 8000, 15000),
                            ("Till 554433 - NAIVAS SUPERMARKET", 8, 800, 3500), ("Withdrawal at Agent 112233 - Mtaani Agency", 6, 1000, 5000),
                            ("Tala loan repayment", 2, 3000, 5000), ("Branch loan repayment", 1, 2000, 4000)],
                  fuliza=True),
    "lucy": dict(receipts=(28, 700, 3500), curve=[1.0, 0.9, 1.1, 1.0, 1.05, 0.95],
                 fixed=[("Paybill 247247 - Rent (landlord)", 2, 14000, None), ("Paybill 888880 - KPLC PREPAID token", 7, 2500, None),
                        ("Paybill 522522 - Little Stars Academy term payment", 5, 12000, {0, 4})],
                 variable=[("Safaricom airtime purchase", 5, 100, 500), ("Till 778899 - Beauty Wholesalers stock", 3, 4000, 9000),
                           ("Till 554433 - NAIVAS SUPERMARKET", 5, 1200, 4000), ("Withdrawal at Agent 112233 - Mtaani Agency", 3, 2000, 6000)]),
    "nelson": dict(receipts=(10, 1000, 8000), curve=[1.0, 0.9, 1.0, 1.1, 1.0, 1.0], monthly_big=("Kaptagat Dairy Co-op", 55000, 75000),
                   harvest=(2, "Eldoret Grain Buyers", 180000),
                   fixed=[("Paybill 888880 - KPLC PREPAID token", 8, 2200, None), ("Paybill 522522 - Moi Primary school term payment", 5, 25000, {0, 3})],
                   variable=[("Paybill - Agrovet inputs", 2, 8000, 20000), ("Safaricom airtime purchase", 4, 100, 400),
                             ("Till 554433 - QUICKMART SUPERMARKET", 4, 1500, 4000), ("Withdrawal at Agent 112233 - Mtaani Agency", 4, 2000, 7000)]),
    "erick": dict(receipts=(60, 1000, 9000), curve=[1.0, 1.05, 0.95, 1.1, 1.05, 1.1],
                  fixed=[("Paybill 247247 - Rent (shop premises)", 1, 25000, None), ("Paybill 888880 - KPLC PREPAID token", 6, 6000, None)],
                  variable=[("Till 889900 - Bamburi Cement dealer", 3, 30000, 45000), ("Safaricom airtime purchase", 5, 200, 800),
                            ("Till 412233 - SHELL PETROL STATION", 4, 3000, 6000), ("Withdrawal at Agent 112233 - Mtaani Agency", 5, 5000, 15000)]),
    "halima": dict(receipts=(20, 800, 3200), curve=[1.0, 0.95, 1.05, 1.0, 0.9, 1.1],
                   fixed=[("Paybill 247247 - Rent (shop)", 2, 9000, None), ("Paybill 888880 - KPLC PREPAID token", 8, 1800, None)],
                   variable=[("Till 667788 - Fabric wholesalers", 2, 5000, 9000), ("Safaricom airtime purchase", 5, 100, 400),
                             ("Till 554433 - NAIVAS SUPERMARKET", 4, 1000, 3500), ("Withdrawal at Agent 112233 - Mtaani Agency", 3, 1500, 4000)]),
    "joel": dict(receipts=(5, 8000, 40000), curve=[1.0, 0.5, 1.3, 0.8, 1.2, 0.7],
                 fixed=[("Paybill 247247 - Rent (apartment)", 1, 28000, None), ("Paybill 888880 - KPLC PREPAID token", 7, 3000, None),
                        ("Paybill - Adobe Creative subscription", 12, 3500, None)],
                 variable=[("Safaricom airtime purchase", 6, 100, 700), ("Till 554433 - CARREFOUR SUPERMARKET", 5, 2000, 6000),
                           ("Withdrawal at Agent 112233 - Mtaani Agency", 3, 3000, 9000)], fuliza_some=True),
    "pauline": dict(receipts=(40, 300, 1800), curve=[1.0, 1.0, 0.95, 1.05, 1.0, 1.0],
                    fixed=[("Paybill 247247 - Rent (kiosk)", 2, 6000, None), ("Paybill 888880 - KPLC PREPAID token", 8, 1200, None)],
                    variable=[("Till 556677 - Wakulima market produce", 8, 1500, 5000), ("Safaricom airtime purchase", 5, 50, 300),
                              ("Withdrawal at Agent 112233 - Mtaani Agency", 3, 1000, 3000)]),
    # two salaried employees, for income detection from a payslip-style monthly credit
    "wanjiku": dict(salary=(28, 62000, "SAVANNAH FREIGHT & LOGISTICS"), receipts=(3, 500, 2500), curve=[1.0] * 6,
                    fixed=[("Paybill 247247 - Rent (landlord)", 2, 16000, None), ("Paybill 888880 - KPLC PREPAID token", 8, 2000, None),
                           ("Paybill 522522 - Hillside Academy term payment", 5, 9000, {0, 3})],
                    variable=[("Safaricom airtime purchase", 6, 100, 500), ("Till 554433 - NAIVAS SUPERMARKET", 8, 1500, 5000),
                              ("Withdrawal at Agent 112233 - Mtaani Agency", 4, 2000, 6000)]),
    "faith": dict(salary=(27, 78000, "KILELE HEALTH GROUP"), receipts=(2, 800, 3000), curve=[1.0] * 6,
                  fixed=[("Paybill 247247 - Rent (landlord)", 1, 22000, None), ("Paybill 888880 - KPLC PREPAID token", 7, 2600, None)],
                  variable=[("Safaricom airtime purchase", 5, 100, 500), ("Till 554433 - QUICKMART SUPERMARKET", 8, 1500, 5500),
                            ("Withdrawal at Agent 112233 - Mtaani Agency", 3, 2000, 7000)]),
}


def _ref(rng):
    return "".join(rng.choices(string.ascii_uppercase + string.digits, k=10))


def build_statement(world, key):
    """Create the uploaded statement and its parsed transactions for one borrower."""
    rng, p, a, prof = world.rng, world.people[key], world.applicants[key], PROFILES[key]
    first = datetime.combine(world.today.replace(day=1), time(0, 0))
    events = []  # (when, description, money_in, money_out)
    for mi in range(MONTHS):
        month_start = first - relativedelta(months=MONTHS - mi)
        mult = prof["curve"][mi]

        def when(day=None):
            d = day if day is not None else rng.randint(1, 28)
            return datetime.combine(month_start.date(), time(rng.randint(6, 21), rng.randint(0, 59))).replace(day=min(d, 28))

        if "salary" in prof:
            day, amount, employer = prof["salary"]
            events.append((when(day).replace(hour=7), f"Salary - {employer}", float(amount), 0.0))
        n, lo, hi = prof["receipts"]
        for _ in range(max(1, round(n * mult))):
            events.append((when(), f"Funds received from {rng.choice(PAYERS)} - mpesa", float(round(rng.uniform(lo, hi), -1)), 0.0))
        if "monthly_big" in prof:
            who, lo2, hi2 = prof["monthly_big"]
            events.append((when(27), f"Funds received from {who} - mpesa", float(round(rng.uniform(lo2, hi2), -2)), 0.0))
        if "harvest" in prof and mi == prof["harvest"][0]:
            events.append((when(12), f"Funds received from {prof['harvest'][1]} - mpesa", float(prof["harvest"][2]), 0.0))
        for what, day, amount, months in prof["fixed"]:
            if months is None or mi in months:
                events.append((when(day), what, 0.0, float(amount)))
        for what, count, lo, hi in prof["variable"]:
            for _ in range(count):
                events.append((when(), what, 0.0, float(round(rng.uniform(lo, hi), -1))))
        if prof.get("fuliza_some") and mi in (1, 3):
            events.append((when(), "Fuliza M-Pesa overdraft", 3000.0, 0.0))
            events.append((when(), "Fuliza M-Pesa repayment - OverDraft of Credit Party", 0.0, 3000.0))

    events.sort()
    rows, balance, fuliza_owed = [], 8000.0 if "salary" not in prof else 12000.0, 0.0
    for when, desc, money_in, money_out in events:
        if money_out > balance and prof.get("fuliza"):
            need = round(money_out - balance + rng.choice([300, 500, 800]), -2)
            rows.append((when - timedelta(seconds=30), "Fuliza M-Pesa overdraft", need, 0.0, balance + need))
            balance += need
            fuliza_owed += need
        elif money_out > balance:
            money_out = max(0.0, balance - 50)
        balance += money_in - money_out
        rows.append((when, desc, money_in, money_out, balance))
        if prof.get("fuliza") and fuliza_owed > 0 and money_in >= 3000:
            repay = min(fuliza_owed, round(money_in * 0.6, -2))
            balance -= repay
            fuliza_owed -= repay
            rows.append((when + timedelta(seconds=30), "Fuliza M-Pesa repayment - OverDraft of Credit Party", 0.0, repay, balance))

    shown = f"Mpesa_Statement_{p['name'].replace(' ', '_')}.pdf"
    path = _store(world.config["APPLICANT_DOCUMENTS"], a.id, "mpesa_statement", shown, "M-Pesa Statement", p["name"],
                  "Sample statement for the demo environment.")
    upload = StatementUpload(id=world.ctx.uid(), applicant_id=a.id, filename=shown, filepath=path, source="mpesa", password="",
                             is_parsed=True, uploaded_at=world.now - timedelta(days=3))
    world.ctx.db.session.add(upload)
    world.ctx.db.session.flush()  # the statement row must exist before the transactions that point to it (Postgres checks)
    for when, desc, money_in, money_out, bal in rows:
        world.ctx.db.session.add(ParsedTransaction(
            applicant_id=a.id, statement_id=upload.id, date=when, description=desc, reference=_ref(rng),
            money_in=money_in, money_out=money_out, balance=round(bal, 2), is_internal_transfer=False))
    return upload
