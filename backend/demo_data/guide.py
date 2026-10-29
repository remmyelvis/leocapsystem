"""The presenter's guide: the short stories to walk a prospect through, in the order that tends to win a room.

Each story names who to sign in as and what to show. Its links are looked up in the database every time the guide is asked for, not
written down here, so they keep working after a reset (a rebuild gives every loan a fresh id when the builder changes).
A link that cannot be found is left out; the guide never fails because of it.
"""
from website.models import Applicant, Application


def _find(name, **where):
    """(person, their newest loan matching `where`). A tuple value means "any of these"."""
    person = Applicant.query.filter_by(name=name).first()
    query = Application.query.filter_by(applicant_id=person.id)
    for column, value in where.items():
        field = getattr(Application, column)
        query = query.filter(field.in_(value) if isinstance(value, tuple) else field == value)
    return person, query.order_by(Application.created_at.desc()).first()


OPEN = ("unpaid", "partially_paid", "delinquent")


def build():
    """The stories, each: key, title, pitch, who (a key of PERSONAS), steps, links [(label, path, optional other persona)]."""
    out = []

    def story(key, title, pitch, who, steps, links=lambda: []):
        try:
            found = [l for l in links() if l]
        except Exception:
            found = []
        out.append(dict(key=key, title=title, pitch=pitch, who=who, steps=steps, links=[dict(label=l[0], path=l[1], who=l[2] if len(l) > 2 else who) for l in found]))

    story("book", "The whole loan book at a glance", "A lender sees money out, money owed and what needs a decision, without opening a spreadsheet.", "credit",
          ["Read the cards: total disbursed, outstanding, interest income, fee revenue, overdue and repayment rate. Change the period, or filter by company.",
           "Below them, loans by status and by company.",
           "The pipeline lists what is waiting. Approve or Reject on the row, Disburse once approved, Mark Paid once repaid."],
          lambda: [("Open the dashboard", "/admin/dashboard")])

    def approve():
        _, loan = _find("Naomi Adhiambo", loan_status="pending_processing")
        return [("Open Naomi's application", f"/admin/applications/{loan.id}")]
    story("approve", "Approve a loan in a minute", "Everything needed to decide is on one page, and the platform gives its own view first.", "credit",
          ["Open the application: the applicant, their employment, the last three months' income and the loan terms.",
           "At the top, the AI Decision Engine gives a CRB score, the capacity it calculates and a recommendation, such as approving with a haircut. Apply Haircut cuts the amount for you.",
           "Press Approve Application (or Decline Application). The Application Timeline records who did what and when."], approve)

    def disburse():
        _, loan = _find("Rebecca Cherono", loan_status="approved")
        return [("Open Rebecca's approved loan", f"/admin/applications/{loan.id}")]
    story("disburse", "Pay out an approved loan", "From approved to paid out in one step, with a note of the transfer.", "credit",
          ["Open the approved loan.",
           "In the Mark as Disbursed section, add the transfer note and press Mark Disbursed.",
           "The timeline records it, the loan opens in the ledger and the due date starts counting."], disburse)

    def underwrite():
        tom, _ = _find("Tom Ochieng")
        carol, _ = _find("Carol Mwende")
        return [("Tom: a strong statement", f"/admin/manage-applicants/{tom.id}/financial-analysis"),
                ("Carol: a risky one", f"/admin/manage-applicants/{carol.id}/financial-analysis")]
    story("underwrite", "Lend to someone with no payslip", "Self-employed people are underwritten from their M-Pesa statement: income, spending, Fuliza and a score, in seconds.", "credit",
          ["Open Tom's analysis. The statement he uploaded is listed, and the AI Executive Summary reads it for you. In this demo the summary is a clearly marked sample built from the statement's own numbers.",
           "Open M-Pesa Analysis for the score and the figures behind it, and use Ask to question the statement, for example: How much does he pay in rent?",
           "Open Carol's analysis: a low score, Fuliza used again and again and spending above income. The numbers say why she was declined."], underwrite)

    def job():
        peter, _ = _find("Peter Mwangi", loan_status="disbursed", repayment_status=OPEN)
        return [("Open the inbox", "/demo/inbox"), ("Open Peter's statement", f"/admin/manage-applicants/{peter.id}")]
    story("job", "The platform chases the money for you", "Reminders and late fees run by themselves, every morning, and every message is on record.", "credit",
          ["Open the Demo menu (bottom-left) and press Run today's job.",
           "Four borrowers get a reminder: due in 7 days, due in 3 days, due today and 7 days late. Peter, 8 days late, is marked delinquent and sent a notice.",
           "Open the inbox to read the messages. Open Peter's statement: the 10% late-payment charge is now a line in it. (The 15% collection fee is charged later, when a loan is escalated.)"], job)

    def collections():
        grace, loan = _find("Grace Wairimu", repayment_status="delinquent")
        _, samuel = _find("Samuel Kiprono", repayment_status="escalated")
        return [("Grace's statement", f"/admin/manage-applicants/{grace.id}"), ("Grace's loan: record a payment", f"/admin/applications/{loan.id}"),
                ("Samuel: sent for recovery", f"/admin/applications/{samuel.id}")]
    story("collections", "Collections that leave a paper trail", "Fees, part payments, penalties and demand letters are all lines in the ledger and entries in the audit trail, so nothing is argued from memory.", "collections",
          ["Open Grace's statement and find the Applicant statement: the late-payment charge, two part payments and a penalty, each its own line, grouped by loan. Download PDF gives the borrower's copy.",
           "On Grace's loan, Mark as Partially Paid and Add Penalty record new lines. Mark as Default and Mark as Paid close it out.",
           "Open Samuel's loan: defaulted and escalated. Escalate produced the demand letter and charged the 15% collection fee (one more line on his statement), and Export Debt Dossier gives the full file for a recovery agent."], collections)

    def employer():
        _, kevin = _find("Kevin Kiprop", loan_status="pending_processing")
        return [("Kevin's request", f"/hr/applications/pending/{kevin.id}"), ("Savannah's applications", "/hr/applications")]
    story("employer", "Employers stay in the loop", "HR approves their own staff's requests and sees only their own company. A second employer sees only theirs.", "mercy",
          ["As Mercy (HR at Savannah Freight), open Kevin's request: his details, three months' earnings and the amount. Approve, Reject or Amend Amount.",
           "Open the applications list: only Savannah's staff and loans are there.",
           "Use Switch role in the Demo menu and sign in as Nancy (HR at Kilele Health): a different company and a different list."], employer)

    def finance():
        _, mercy = _find("Mercy Achieng", loan_status="pending_processing")
        return [("Joseph: Mercy's loan", f"/finance/applications/pending/{mercy.id}"), ("Savannah's applications", "/finance/applications")]
    story("finance", "Finance has its own desk", "The employer's finance team sees every request from their company and gets the month's repayment list without asking anyone.", "joseph_k",
          ["As Joseph (Finance at Savannah Freight), open the loan Mercy, the HR Manager, applied for. Finance can Approve, Reject or Amend Amount.",
           "Open Company Applications: every request from Savannah, with Download Repayment (PDF) and (Excel) for the month."], finance)

    def borrower():
        _, loan = _find("Wanjiku Kamau", loan_status="disbursed", repayment_status=OPEN)
        return [("Wanjiku's dashboard", "/dashboard"), ("Her open loan", f"/dashboard/applications/{loan.id}")]
    story("borrower", "What the borrower sees", "Borrowers see what they owe and when, and how it was worked out, which means fewer calls to your office.", "wanjiku",
          ["Open the dashboard: the outstanding balance, the next due date and her recent applications.",
           "Open the loan: the fees taken off, the interest rate, what she received and what she repays."], borrower)

    story("reports", "Reports and the audit trail", "The owner and the auditor get their answers without asking for a spreadsheet.", "credit",
          ["Open Reports to export the book as PDF or Excel. In the demo the downloads carry a SAMPLE mark and sample bank details.",
           "Open Audit trail: who signed in, who approved what, who downloaded which document."],
          lambda: [("Open Reports", "/admin/reports"), ("Open Audit trail", "/admin/audit-trail")])
    return out
