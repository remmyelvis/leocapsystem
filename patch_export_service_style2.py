# -*- coding: utf-8 -*-
import re

with open('backend/website/export_service.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_function = '''def generate_debt_dossier_pdf(app, applicant, statements, docs):
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image as RLImage, KeepTogether
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT, TA_CENTER
    from PIL import Image as PILImg
    import os
    from datetime import datetime
    import io

    buffer = io.BytesIO()
    # A4 width = 595.27. Margins 40 each = 515.27 available width.
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
        title=f"Debt Collection Profile - {applicant.name}"
    )
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], alignment=TA_CENTER, fontSize=16, spaceAfter=20, textColor=colors.HexColor("#1E3A8A"))
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=12, spaceAfter=10, textColor=colors.HexColor("#1E3A8A"), spaceBefore=15)
    normal_style = styles['Normal']
    small_style = ParagraphStyle('Small', parent=normal_style, fontSize=9)
    justified_style = ParagraphStyle('Justified', parent=normal_style, fontSize=9, leading=13, alignment=TA_JUSTIFY)
    
    elements = []
    
    # 1. Header Logo
    try:
        img_path = "website/templates/logo.png"
        if os.path.exists(img_path):
            img = PILImg.open(img_path)
            aspect = img.width / img.height
            new_height = 40
            new_width = new_height * aspect
            logo = RLImage(img_path, width=new_width, height=new_height)
            logo.hAlign = 'CENTER'
            elements.append(logo)
            elements.append(Spacer(1, 10))
    except Exception:
        pass
        
    elements.append(Paragraph("DEBT COLLECTION PROFILE", title_style))
    elements.append(Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", ParagraphStyle('small', fontSize=8, alignment=TA_CENTER)))
    elements.append(Spacer(1, 20))
    
    # 2. Applicant Profile
    elements.append(Paragraph("1. APPLICANT PROFILE", heading_style))
    
    profile_data = [
        ["Full Name:", Paragraph(str(applicant.name), normal_style), "ID Number:", str(applicant.id_number or 'N/A')],
        ["Email:", Paragraph(str(applicant.email), normal_style), "KRA PIN:", str(applicant.kra_pin or 'N/A')],
        ["Phone Number:", str(applicant.phone_number), "Company:", Paragraph(str(applicant.applicant_type).replace('_', ' ').title(), normal_style)],
        ["Payroll Number:", str(applicant.payroll_number or 'N/A'), "Role:", Paragraph(str(applicant.role).title(), normal_style)]
    ]
    
    t_profile = Table(profile_data, colWidths=[120, 137, 120, 138])
    t_profile.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.darkslategray),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#F1F5F9")),
        ('BACKGROUND', (2, 0), (2, -1), colors.HexColor("#F1F5F9")),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
    ]))
    t_profile.hAlign = 'CENTER'
    elements.append(t_profile)
    elements.append(Spacer(1, 20))
    
    # 3. Loan Details
    elements.append(Paragraph("2. LOAN APPLICATION DETAILS", heading_style))
    loan_data = [
        ["Loan ID:", str(app.id)[:8].upper(), "Application Date:", app.created_at.strftime('%Y-%m-%d') if app.created_at else 'N/A'],
        ["Loan Type:", str(app.loan_type).replace('_', ' ').title(), "Status:", str(app.loan_status).replace('_', ' ').title()],
        ["Amount Applied:", f"KES {float(app.amount_applied):,.2f}", "Interest Rate:", f"{float(app.interest_rate)*100:.1f}%"],
        ["Disbursed Amount:", f"KES {float(app.disbursement_amount or 0):,.2f}", "Total Repayment:", f"KES {float(app.repayment_amount or 0):,.2f}"],
        ["Duration (Days):", str((app.due_date - app.created_at).days) if (app.due_date and app.created_at) else 'N/A', "Due Date:", app.due_date.strftime('%Y-%m-%d') if app.due_date else 'N/A'],
        ["Employment Nature:", str(app.employment_nature or 'N/A').title(), "Designation:", Paragraph(str(app.designation or 'N/A').title(), normal_style)],
        ["Purpose of Loan:", Paragraph(str(app.loan_purpose or 'N/A').title(), normal_style), "", ""],
        ["Basic Pay (M1):", f"KES {float(app.month_one or 0):,.2f}", "Basic Pay (M2):", f"KES {float(app.month_two or 0):,.2f}"],
        ["Basic Pay (M3):", f"KES {float(app.month_three or 0):,.2f}", "", ""]
    ]
    
    if app.loan_status == 'disbursed' and app.notes:
        loan_data.append(["Proof of Disbursement:", Paragraph(str(app.notes), normal_style), "", ""])
    
    t_loan = Table(loan_data, colWidths=[130, 127, 120, 138])
    
    # Base styling
    ts_loan = [
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.darkslategray),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#F1F5F9")),
        ('BACKGROUND', (2, 0), (2, -1), colors.HexColor("#F1F5F9")),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]
    
    # Row 6: Purpose of Loan
    ts_loan.append(('SPAN', (1, 6), (3, 6)))
    ts_loan.append(('BACKGROUND', (1, 6), (3, 6), colors.white)) # override blue bg
    
    # Row 8: Basic Pay (M3)
    ts_loan.append(('SPAN', (1, 8), (3, 8)))
    ts_loan.append(('BACKGROUND', (1, 8), (3, 8), colors.white))
    
    # Proof of Disbursement (Row 9)
    if app.loan_status == 'disbursed' and app.notes:
        ts_loan.append(('SPAN', (1, 9), (3, 9)))
        ts_loan.append(('BACKGROUND', (1, 9), (3, 9), colors.white))
    
    t_loan.setStyle(TableStyle(ts_loan))
    t_loan.hAlign = 'CENTER'    
    elements.append(t_loan)
    elements.append(Spacer(1, 20))
    
    # 4. Electronic Agreement
    elements.append(Paragraph("3. ELECTRONIC AGREEMENT & CONSENT", heading_style))
    company_name = str(applicant.applicant_type).replace('_', ' ').title() if applicant.applicant_type else "the Employer"
    tc_text = f"""<b>LOAN AGREEMENT</b><br/><br/>
This Loan Agreement ("Agreement") is made and deemed executed in Nairobi, Kenya on the date of electronic acceptance by the Borrower.<br/><br/>
<b>PARTIES</b><br/>
1. <b>LEOCAP INVEST</b>, a business duly incorporated/registered under the laws of the Republic of Kenya, of P.O. Box 184-00100 GPO, Nairobi (hereinafter referred to as the "Lender", which expression shall include its successors and assigns);<br/>
AND<br/>
2. <b>The Applicant</b>, being the individual whose identification details, employment details, and address are provided in the online application form (hereinafter referred to as the "Borrower", which expression shall include personal representatives and assigns).<br/><br/>
<b>A. LOAN AMOUNT AND DISBURSEMENT</b><br/>
The Lender agrees to advance to the Borrower a loan amount as approved through the online application system ("Loan Amount").<br/>
The Borrower acknowledges that approval is subject to employment verification under the Memorandum of Understanding between the Lender and {company_name}.<br/>
The Borrower shall pay:<br/>
- A processing fee of 3%, An Admin & Access Fee of 2% of the Loan Amount, and<br/>
- Legal Fees of KES 1,500<br/>
These fees may be deducted upfront from the Loan Amount prior to disbursement.<br/><br/>
<b>B. LOAN LIMIT</b><br/>
The Borrower's approved loan limit shall be determined solely by the Lender based on internal credit assessment and employer MOU limits.<br/>
The Lender reserves the right to review, vary, or revoke the loan limit at its discretion.<br/>
The Borrower shall not be entitled to exceed the approved loan limit unless expressly authorized in writing.<br/><br/>
<b>C. LOAN TERM</b><br/>
The loan shall be for a maximum period of one (1) month, unless otherwise extended or rescheduled in writing by the Lender.<br/><br/>
<b>D. INTEREST</b><br/>
The Loan shall attract interest at the rate communicated and agreed at the time of approval.<br/>
Interest shall accrue monthly and be payable together with the principal unless otherwise agreed.<br/><br/>
<b>E. REPAYMENT</b><br/>
The Borrower shall repay the Loan Amount together with interest in accordance with the repayment schedule provided.<br/>
Repayment shall be effected through salary deduction under the employer check-off arrangement pursuant to the MOU with {company_name}.<br/>
Any unpaid balance shall continue to accrue interest at the contractual rate until fully settled.<br/><br/>
<b>F. DEFAULT</b><br/>
An event of default occurs when the Borrower fails to pay any instalment on its due date.<br/>
Upon default:<br/>
a. The overdue instalment may be rescheduled subject to a rescheduling fee of 10% of the instalment or KES 1,500 (whichever is higher);<br/>
b. A debt recovery fee of 15% of the outstanding balance may be charged after 7 days of default and issuance of demand notice;<br/>
c. Returned or unpaid cheques shall attract actual bank charges or KES 3,000 (whichever is higher) plus 15% collection fee.<br/>
The Lender reserves the right to engage third-party debt collection agents or legal counsel for recovery.<br/><br/>
<b>G. DATA PROTECTION AND DISCLOSURE CONSENT</b><br/>
The Borrower expressly consents to the collection, processing, storage, and sharing of their personal and employment data strictly for purposes of:<br/>
- Loan assessment and administration;<br/>
- Salary verification and check-off processing;<br/>
- Debt recovery and enforcement.<br/>
The Borrower acknowledges that data may be shared with:<br/>
- {company_name} (employer);<br/>
- Authorized debt collection agents;<br/>
- Legal practitioners; and<br/>
- Regulatory authorities where required by law.<br/>
All processing shall comply with the Data Protection Act, 2019 of Kenya.<br/><br/>
<b>H. DISPUTE RESOLUTION</b><br/>
Any dispute arising shall first be resolved amicably through negotiation.<br/>
If unresolved, the dispute shall be referred to the courts of competent jurisdiction in Kenya.<br/><br/>
<b>I. ELECTRONIC ACCEPTANCE</b><br/>
The Borrower agrees that ticking acceptance on the online portal constitutes a legally binding electronic signature under Kenyan law.<br/>
The Borrower confirms they have read, understood, and accepted all terms herein.<br/><br/>
<b>J. ENTIRE AGREEMENT</b><br/>
This Agreement constitutes the entire understanding between the parties and supersedes all prior representations or agreements.
"""
    elements.append(Paragraph(tc_text, justified_style))
    elements.append(Spacer(1, 15))
    
    agree_data = [
        ["Electronically Accepted By:", Paragraph(str(applicant.name), normal_style)],
        ["Timestamp:", app.created_at.strftime('%Y-%m-%d %H:%M:%S') if app.created_at else "Time of Application"],
        ["IP Address / Device:", "Verified via authenticated session"],
        ["Consent Granted:", Paragraph("Read and accepted Loan Agreement T&Cs. Read and understood Privacy Policy and consented to data processing under the Data Protection Act, 2019.", small_style)]
    ]
    t_agree = Table(agree_data, colWidths=[160, 355])
    t_agree.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#1E3A8A")),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('PADDING', (0, 0), (-1, -1), 12),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
    ]))
    t_agree.hAlign = 'CENTER'
    elements.append(t_agree)
    
    elements.append(PageBreak())
    
    # 5. Loan Statement
    elements.append(Paragraph("4. LOAN STATEMENT (LEDGER)", heading_style))
    
    if not statements:
        elements.append(Paragraph("No ledger entries found.", normal_style))
    else:
        stmt_data = [["Date", "Reference", "Description", "Debit", "Credit", "Balance"]]
        for s in statements:
            stmt_data.append([
                s.date.strftime('%Y-%m-%d') if s.date else "",
                str(s.id)[:8].upper(),
                Paragraph(str(s.memo or ""), small_style),
                f"{float(s.debit):,.2f}" if s.debit else "-",
                f"{float(s.credit):,.2f}" if s.credit else "-",
                f"{float(s.balance):,.2f}"
            ])
            
        t_stmt = Table(stmt_data, colWidths=[65, 55, 185, 65, 65, 80])
        t_stmt.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (2, 0), (2, -1), 'LEFT'),
            ('ALIGN', (3, 1), (5, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
        ]))
        t_stmt.hAlign = 'CENTER'
        elements.append(t_stmt)
    
    # 6. Attached Documents
    elements.append(PageBreak())
    elements.append(Paragraph("5. ATTACHED DOCUMENTS", heading_style))
    
    if not docs:
        elements.append(Paragraph("No documents attached.", normal_style))
    else:
        for doc_obj in docs:
            elements.append(KeepTogether([
                Paragraph(f"<b>Document Type:</b> {str(doc_obj.document_type).replace('_', ' ').title()}", normal_style),
                Spacer(1, 5)
            ]))
            
            filepath = doc_obj.filepath
            if filepath and os.path.exists(filepath):
                ext = os.path.splitext(filepath)[1].lower()
                if ext in ['.png', '.jpg', '.jpeg']:
                    try:
                        img = PILImg.open(filepath)
                        aspect = img.width / img.height
                        max_w = 400
                        max_h = 500
                        
                        w = max_w
                        h = w / aspect
                        
                        if h > max_h:
                            h = max_h
                            w = h * aspect
                            
                        rl_img = RLImage(filepath, width=w, height=h)
                        elements.append(rl_img)
                    except Exception as e:
                        elements.append(Paragraph(f"<i>Error loading image: {str(e)}</i>", normal_style))
                elif ext == '.pdf':
                    elements.append(Paragraph(f"<i>[PDF Document Attached: {os.path.basename(filepath)}]</i>", small_style))
                    elements.append(Paragraph("Note: The pages of this document have been appended to the end of this profile.", small_style))
                else:
                    elements.append(Paragraph(f"<i>[File Attached: {os.path.basename(filepath)}]</i>", normal_style))
            else:
                elements.append(Paragraph("<i>[File missing or inaccessible]</i>", normal_style))
            
            elements.append(Spacer(1, 20))

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    # If there are PDF attachments, merge them using PyPDF2 if available
    has_pdf_attachments = any(d.filepath and d.filepath.lower().endswith('.pdf') and os.path.exists(d.filepath) for d in docs)
    if has_pdf_attachments:
        try:
            import PyPDF2
            merger = PyPDF2.PdfMerger()
            
            # Append the main profile PDF
            merger.append(io.BytesIO(pdf_bytes))
            
            # Append each PDF document
            for doc_obj in docs:
                filepath = doc_obj.filepath
                if filepath and filepath.lower().endswith('.pdf') and os.path.exists(filepath):
                    try:
                        merger.append(filepath)
                    except Exception as e:
                        print(f"Error merging {filepath}: {e}")
                        
            merged_buffer = io.BytesIO()
            merger.write(merged_buffer)
            merger.close()
            pdf_bytes = merged_buffer.getvalue()
            merged_buffer.close()
        except ImportError:
            pass
            
    return pdf_bytes
'''

match = re.search(r'def generate_debt_dossier_pdf\(.*?\):.*?(?=\n\w|\Z)', content, re.DOTALL)
if match:
    # Just to be safe, find the exact start index and end of the function.
    start_idx = content.find('def generate_debt_dossier_pdf')
    content = content[:start_idx] + new_function + '\n'

    with open('backend/website/export_service.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Patched export_service.py with proper column widths and backgrounds!')
else:
    print('Function not found!')
