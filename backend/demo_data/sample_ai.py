"""The demo's stand-in for the AI summary and the statement chat.

The live platform sends the statement to an AI model (Gemini). The demo has no key, so it answers from the statement's own
computed numbers instead: nothing is invented, so what it says always agrees with the figures on the same page. Every answer says
it is a sample, so nobody mistakes it for the real thing.
"""
import re

from website.models import ParsedTransaction

NOTE = "(Sample summary for the demo. On the live platform an AI model writes this from the same figures.)"
CHAT_NOTE = "(Sample answer for the demo. On the live platform an AI model answers from the full statement.)"


def kes(n):
    return f"KES {float(n or 0):,.0f}"


def _names(items, n=3):
    return ", ".join(f"{re.sub(r'(?i)^funds received from ', '', i['name'])} ({i['count']}x)" for i in (items or [])[:n])


def _verdict(score, top):
    share = score / top if top else 0
    if share >= 0.75:
        return "Overall this is a strong statement: steady inflows, regular everyday spending and no competing lenders. It supports the amount asked for."
    if share >= 0.5:
        return "Overall this is an acceptable statement with some weak points. It supports a smaller amount, or the amount asked for with closer follow-up."
    return "Overall this is a weak statement. Spending is at or above income and the person relies on other lenders. A decline, or a much smaller amount, is the careful answer."


def narrative(applicant_id, txns, mpesa, credit):
    box = (credit or {}).get("combined") or {}
    score, top = (credit or {}).get("score") or 0, box.get("max_score") or 400
    adv = box.get("advanced_metrics") or {}
    first = (f"Over {mpesa.get('transaction_count', 0)} transactions, {kes(mpesa.get('total_inflows'))} came in and "
             f"{kes(mpesa.get('total_outflows'))} went out, so about {mpesa.get('dependency_ratio', 0):.0f}% of what comes in is spent. "
             f"The balance moved between {kes(adv.get('lowest_balance'))} and {kes(adv.get('highest_balance'))}.")
    sources = _names(box.get("frequent_inflows"))
    if sources:
        first += f" The most frequent inflows are {sources}."

    fix = lambda factor: factor.lower().replace("fuliza", "Fuliza")
    gains = [fix(d["factor"]) for d in box.get("scoring_details", []) if str(d["impact"]).startswith("+")]
    losses = [fix(d["factor"]) for d in box.get("scoring_details", []) if str(d["impact"]).startswith("-")]
    second = f"The credit score is {score} out of {top}."
    if gains:
        second += " In their favour: " + "; ".join(gains) + "."
    if losses:
        second += " Against them: " + "; ".join(losses) + "."
    others = sorted({l.replace(" Loan Repayment", "") for l in box.get("active_credit_facilities") or [] if not l.lower().startswith("fuliza")})
    if mpesa.get("fuliza_count"):
        second += f" Fuliza was used {mpesa['fuliza_count']} times" + (f", and loans from {', '.join(others)} also show up" if others else "") + "."
    elif others:
        second += f" Loans from {', '.join(others)} show up in the statement."
    return f"{first}\n\n{second}\n\n{_verdict(score, top)}\n\n{NOTE}"


STOP = {"what", "when", "where", "which", "does", "have", "much", "many", "with", "about", "this", "that", "their", "they", "them",
        "from", "into", "pays", "paid", "pay", "make", "show", "tell", "total", "last", "statement", "applicant", "month", "months"}


def answer(applicant_id, query):
    from website.financial_engine.credit_analyzer import generate_credit_analysis
    from website.financial_engine.mpesa_analyzer import analyze_mpesa

    q = (query or "").lower()
    mpesa, credit = analyze_mpesa(applicant_id), generate_credit_analysis(applicant_id)
    box = credit.get("combined") or {}
    adv = box.get("advanced_metrics") or {}
    score, top = credit.get("score") or 0, box.get("max_score") or 400

    if re.search(r"fuliza|lender|borrow|debt|credit facilit|competing|loan app", q):
        lenders = box.get("active_credit_facilities") or []
        text = f"Fuliza appears {mpesa.get('fuliza_count', 0)} times. " + (f"Other lenders seen in the statement: {', '.join(lenders)}." if lenders else "No other lenders were found.")
    elif re.search(r"score|risk|recommend|approve|decline|safe", q):
        text = f"The credit score is {score} out of {top}. {_verdict(score, top)}"
    elif re.search(r"income|inflow|earn|receiv|salary|revenue|sales|come from|comes from|source|who pays", q):
        text = f"Money in came to {kes(mpesa.get('total_inflows'))}. The most frequent inflows: {_names(box.get('frequent_inflows')) or 'none stood out'}."
    elif re.search(r"balance", q):
        text = f"The balance ranged from {kes(adv.get('lowest_balance'))} to {kes(adv.get('highest_balance'))}."
    elif re.search(r"spend|outflow|expens|cost|biggest|pays? for", q):
        text = f"Money out came to {kes(mpesa.get('total_outflows'))}, {mpesa.get('dependency_ratio', 0):.0f}% of the money in. Most frequent payments: {_names(box.get('frequent_outflows')) or 'none stood out'}."
    else:
        words = [w for w in re.findall(r"[a-z0-9]{4,}", q) if w not in STOP]
        rows = [t for t in ParsedTransaction.query.filter_by(applicant_id=applicant_id).all() if any(w in (t.description or "").lower() for w in words)] if words else []
        if rows:
            last = max(rows, key=lambda t: t.date)
            text = (f"{len(rows)} transactions mention \"{' / '.join(words)}\": {kes(sum(t.money_out or 0 for t in rows))} paid out and "
                    f"{kes(sum(t.money_in or 0 for t in rows))} received. The latest was on {last.date:%d %b %Y} ({last.description}).")
        else:
            text = ("In this demo I can answer questions about income, spending, balances, Fuliza and other lenders, the score, "
                    "or a word that appears in the transactions, such as rent, school or airtime.")
    return f"{text}\n\n{CHAT_NOTE}"
