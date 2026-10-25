"""Sample documents for the demo.

Borrowers' ID copies, KRA certificates, contracts and statements are one-page PDFs that say plainly they are samples, so a
document can be opened, downloaded or "rejected" in the demo exactly as in the real app, without a single real document.
Each row gets its own file (rejecting a document deletes its file, so files are never shared).
"""
import os

from werkzeug.utils import secure_filename

from website.models import ApplicantDocument, ApplicationDocument
from website.upload_paths import upload_path

APPLICANT_TITLES = {"id_copy": "National ID", "kra_certificate": "KRA PIN Certificate", "contract_document": "Employment Contract"}
LOAN_TITLES = {"bank_statement": "Bank Statement (6 months)", "mpesa_statement": "M-Pesa Statement (6 months)", "payslip": "Payslip"}


def write_pdf(path, title, name, note):
    """A one-page sample document."""
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    os.makedirs(os.path.dirname(path), exist_ok=True)
    c = canvas.Canvas(path, pagesize=A4)
    w, h = A4
    c.setFillColorRGB(0.06, 0.17, 0.35)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(60, h - 110, title)
    c.setFillColorRGB(0.2, 0.2, 0.2)
    c.setFont("Helvetica", 13)
    c.drawString(60, h - 140, f"Name: {name}")
    c.setFont("Helvetica", 11)
    c.drawString(60, h - 170, note)
    c.setFillColorRGB(0.85, 0.2, 0.2)
    c.setFont("Helvetica-Bold", 40)
    c.saveState()
    c.translate(w / 2, h / 2)
    c.rotate(35)
    c.drawCentredString(0, 0, "SAMPLE - DEMO DATA")
    c.restoreState()
    c.setFillColorRGB(0.4, 0.4, 0.4)
    c.setFont("Helvetica", 9)
    c.drawString(60, 50, "This is a sample document created for the Leocap Invest demo. It belongs to no real person.")
    c.save()


def _store(base_dir, owner_id, doc_type, shown_name, title, name, note):
    folder, path = upload_path(base_dir, owner_id, doc_type, secure_filename(shown_name) or "sample.pdf")
    write_pdf(path, title, name, note)
    return path


def applicant_documents(ctx, config, applicant, doc_types, when):
    """ID copy, KRA certificate (and the employment contract for staff of an employer), already reviewed and accepted."""
    for doc_type in doc_types:
        shown = f"{APPLICANT_TITLES[doc_type]} - {applicant.name}.pdf"
        path = _store(config["APPLICANT_DOCUMENTS"], applicant.id, doc_type, shown, APPLICANT_TITLES[doc_type], applicant.name,
                      "Sample document for the demo environment.")
        ctx.db.session.add(ApplicantDocument(
            applicant_id=applicant.id, filename=shown, filepath=path, filetype="pdf", document_type=doc_type,
            uploaded_at=when, status="accepted"))


def loan_documents(ctx, config, loan, doc_types, when):
    """What a personal-loan application carries: the statements the lender reviews."""
    for doc_type in doc_types:
        shown = f"{LOAN_TITLES[doc_type]} - {loan.applicant.name}.pdf"
        path = _store(config["APPLICATION_DOCUMENTS"], loan.app.id, doc_type, shown, LOAN_TITLES[doc_type], loan.applicant.name,
                      "Sample statement for the demo environment.")
        ctx.db.session.add(ApplicationDocument(
            application_id=loan.app.id, filename=shown, filepath=path, filetype="pdf", document_type=doc_type, uploaded_at=when))
