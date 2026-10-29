"""Self-checks for the demo data. They run at the end of every rebuild, so a demo with broken books is never served: if a
check fails the rebuild says so and raises.

They test what a prospect would notice if it were wrong: balances that do not add up, dates in the future, a story that is not
in the state it is supposed to be in, and the daily job doing something other than the five things the presenter expects.
"""
from datetime import datetime, timedelta
from decimal import Decimal as D

from website.models import Applicant, Application, ApplicationAudit, AuditLog, StatementEntry


def run(now):
    """Returns a list of (what was checked, passed, detail)."""
    out = []

    def check(label, ok, detail=""):
        out.append((label, bool(ok), "" if ok else str(detail)[:300]))

    today = now.date()
    apps = Application.query.all()
    rows_by = {}
    for r in StatementEntry.query.order_by(StatementEntry.date, StatementEntry.id).all():
        rows_by.setdefault(r.application_id, []).append(r)

    unbalanced, broken_run, future, negative, empty = [], [], [], [], []
    for a in apps:
        rows = rows_by.get(a.id, [])
        if not rows:
            empty.append(a.id[:8])
            continue
        net = sum(D(str(r.debit)) - D(str(r.credit)) for r in rows)
        if max(net, D(0)) != D(str(a.outstanding_balance)):
            unbalanced.append((a.id[:8], str(net), str(a.outstanding_balance)))
        running = D(0)
        for r in rows:
            running += D(str(r.debit)) - D(str(r.credit))
            if D(str(r.balance)) != running:
                broken_run.append((a.id[:8], r.memo))
                break
            if r.date > now:
                future.append((a.id[:8], r.memo))
            if D(str(r.balance)) < 0:
                negative.append((a.id[:8], r.memo))
    check("every loan has statement rows", not empty, empty[:3])
    check("each loan's balance equals its debits less its credits", not unbalanced, unbalanced[:3])
    check("each statement row's balance follows the one before", not broken_run, broken_run[:3])
    check("no statement row is dated in the future", not future, future[:3])
    check("no balance is negative", not negative, negative[:3])
    check("no change-history row is dated in the future", not [x for x in ApplicationAudit.query.all() if x.changed_at > now])
    check("no audit log row is dated in the future", AuditLog.query.filter(AuditLog.created_at > now + timedelta(seconds=5)).count() == 0)
    check("every due date is after its application date", not [a.id[:8] for a in apps if a.due_date < a.created_at])

    # the next run of the daily job must touch exactly the five live cases: due in 7 days, in 3, today, 7 days late, 8 days late
    acts = sorted((a.due_date.date() - today).days for a in apps
                  if a.loan_status == "disbursed" and a.repayment_status in ("unpaid", "partially_paid") and a.due_date
                  and ((a.due_date.date() - today).days in (7, 3, 0, -7) or (a.due_date.date() - today).days <= -8))
    check("the daily job's next run acts on exactly the five live cases", acts == [-8, -7, 0, 3, 7], acts)

    # the daily job charges the 10% late-payment charge on the 8th day after the due date; the 15% collection fee follows the demand
    # notice, so only escalated loans have it
    ok = True
    for a in apps:
        rows = rows_by.get(a.id, [])
        charge = next((r for r in rows if r.memo == "Late Payment Charge"), None)
        if charge:
            base = D(str(charge.balance)) - D(str(charge.debit))
            ok &= D(str(charge.debit)) == (base * D("0.10")).quantize(D("0.01")) and charge.date.date() == a.due_date.date() + timedelta(days=8)
        fee = next((r for r in rows if r.memo == "Delinquency Collection Fee"), None)
        if fee:
            base = D(str(fee.balance)) - D(str(fee.debit))
            ok &= a.repayment_status == "escalated" and D(str(fee.debit)) == (base * D("0.15")).quantize(D("0.01"))
    check("the job's 10% late-payment charge is dated 8 days after the due date, and the 15% collection fee is only on escalated loans", ok)

    def loans(name):
        person = Applicant.query.filter_by(name=name).first()
        return Application.query.filter_by(applicant_id=person.id).order_by(Application.created_at).all() if person else []

    for name, offset in (("Wanjiku Kamau", 7), ("Brian Odhiambo", 3), ("Faith Chepkoech", 0), ("Hassan Mohamed", -7), ("Peter Mwangi", -8)):
        open_ = [a for a in loans(name) if a.loan_status == "disbursed" and a.repayment_status == "unpaid"]
        check(f"{name} has one open loan due at day {offset:+d}", len(open_) == 1 and (open_[0].due_date.date() - today).days == offset)
    grace = loans("Grace Wairimu")[-1:] or [None]
    memos = [r.memo for r in rows_by.get(grace[0].id, [])] if grace[0] else []
    check("Grace is delinquent with the late-payment charge, two part payments and a penalty",
          grace[0] is not None and grace[0].repayment_status == "delinquent" and "Late Payment Charge" in memos
          and sum(m.startswith("Partially paid") for m in memos) == 2 and any(m.startswith("Penalty:") for m in memos), memos)
    samuel = loans("Samuel Kiprono")[-1:] or [None]
    check("Samuel's loan is escalated after default, with the 15% collection fee the demand notice charged",
          samuel[0] is not None and (samuel[0].repayment_status, samuel[0].loan_status) == ("escalated", "defaulted")
          and "Delinquency Collection Fee" in [r.memo for r in rows_by.get(samuel[0].id, [])])
    check("Daniel has a written-off loan", any(a.loan_status == "written_off" for a in loans("Daniel Mutua")))
    check("Tom has a pending application with both statements attached",
          any(a.loan_status == "pending_processing" and len(a.application_documents) == 2 for a in loans("Tom Ochieng")))
    check("Carol has a declined application", any(a.loan_status == "declined" for a in loans("Carol Mwende")))
    check("at least 3 applications are pending and 1 approved, to act on live",
          Application.query.filter_by(loan_status="pending_processing").count() >= 3 and Application.query.filter_by(loan_status="approved").count() >= 1)
    return out
