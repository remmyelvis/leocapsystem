# -*- coding: utf-8 -*-
import re

path = 'backend/website/export_service.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

generator_code = """
def generate_company_proposal_pdf(company):
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
    import os
    from datetime import datetime

    company_name = company.name.upper() if company else "COMPANY"
    company_name_title = company.name if company else "Company"

    now = datetime.now()
    date_str = now.strftime('%d %B %Y')

    file_name = f"proposal_{company.id}.pdf"
    file_path = os.path.join(os.getcwd(), "tmp", file_name)
    os.makedirs(os.path.join(os.getcwd(), "tmp"), exist_ok=True)

    doc = SimpleDocTemplate(file_path, pagesize=A4, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'TitleStyle', parent=styles['Heading2'], alignment=TA_CENTER, 
        fontName='Helvetica-Bold', spaceAfter=6, textColor=colors.black
    )
    subtitle_style = ParagraphStyle(
        'SubtitleStyle', parent=styles['Normal'], alignment=TA_CENTER, 
        fontName='Helvetica-Bold', spaceAfter=14
    )
    header_style = ParagraphStyle(
        'HeaderStyle', parent=styles['Heading3'], alignment=TA_JUSTIFY, 
        fontName='Helvetica-Bold', spaceAfter=8, textColor=colors.HexColor("#ea580c")
    )
    normal_style = ParagraphStyle(
        'NormalStyle', parent=styles['Normal'], alignment=TA_JUSTIFY, 
        fontName='Helvetica', fontSize=10, spaceAfter=8, leading=14
    )
    list_style = ParagraphStyle(
        'ListStyle', parent=normal_style, leftIndent=20
    )

    elements = []

    # Letterhead approximation
    elements.append(Paragraph("<font size=24 color='#ea580c'><b>LEOCAP</b></font>", ParagraphStyle('LH1', alignment=TA_CENTER)))
    elements.append(Paragraph("<font size=10 color='#64748b'>- I N V E S T -</font>", ParagraphStyle('LH2', alignment=TA_CENTER, spaceAfter=20)))
    
    elements.append(Paragraph("PROPOSAL FOR THE INTRODUCTION OF A", title_style))
    elements.append(Paragraph("SALARY ADVANCE CHECK-OFF LOAN PRODUCT", title_style))
    
    elements.append(Spacer(1, 10))
    elements.append(Paragraph(f"<b>Submitted to:</b> {company_name_title}", subtitle_style))
    elements.append(Paragraph(f"<b>Date:</b> {date_str}", subtitle_style))
    elements.append(Spacer(1, 15))

    # 1. Introduction
    elements.append(Paragraph("1. Introduction", header_style))
    elements.append(Paragraph("Leocap Invest is a non-deposit-taking microfinance institution that provides structured short-term credit solutions to individuals and employees through responsible, convenient lending arrangements.", normal_style))
    elements.append(Paragraph("As part of our commitment to promoting employee financial wellness, we are pleased to introduce our Salary Advance Check-Off Loan Product, designed to provide employees with timely access to short-term financing while maintaining a simple, controlled, and efficient repayment mechanism for the employer.", normal_style))
    elements.append(Paragraph("The product is delivered through an employer-based check-off arrangement, whereby approved loan repayments are deducted through the payroll process and remitted to Leocap Invest in accordance with an agreed framework.", normal_style))
    elements.append(Spacer(1, 6))

    # 2. Purpose of the Proposal
    elements.append(Paragraph("2. Purpose of the Proposal", header_style))
    elements.append(Paragraph(f"The purpose of this proposal is to establish a structured partnership between Leocap Invest and {company_name} that will enable eligible employees to access short-term salary advances to meet immediate financial needs.", normal_style))
    elements.append(Paragraph("The arrangement is intended to:", normal_style))
    elements.append(Paragraph("• Improve employees' access to timely and structured short-term credit.", list_style))
    elements.append(Paragraph("• Support employee financial wellness and liquidity management.", list_style))
    elements.append(Paragraph("• Provide a convenient alternative to informal and potentially costly borrowing.", list_style))
    elements.append(Paragraph("• Minimise administrative involvement by the employer through a structured payroll check-off process.", list_style))
    elements.append(Paragraph("• Establish a transparent and controlled loan recovery framework.", list_style))
    elements.append(Spacer(1, 6))

    # 3. Product Overview
    elements.append(Paragraph("3. Product Overview", header_style))
    elements.append(Paragraph("The Salary Advance Check-Off Loan will operate under the following principal terms:", normal_style))
    
    table_data = [
        ["Product Feature", "Proposed Terms"],
        ["Minimum Loan Amount", "KES 1,000"],
        ["Maximum Loan Amount", "Up to one-third (1/3) of the employee's net salary"],
        ["Loan Tenure", "One (1) month"],
        ["Interest Rate", "10% flat rate"],
        ["Repayment Method", "Payroll check-off"],
        ["Target Customers", "Eligible employees of the partner organisation"],
        ["Approval", "Subject to Leocap Invest's credit assessment and\\napplicable eligibility criteria"]
    ]
    t = Table(table_data, colWidths=[150, 350])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f97316")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTNAME', (0,1), (0,-1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#fdba74")),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor("#fff7ed")),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 6))
    elements.append(Paragraph("The final eligibility criteria, documentation requirements, payroll process and operational procedures will be agreed between the parties and incorporated into the proposed Memorandum of Understanding (MOU).", normal_style))
    elements.append(Spacer(1, 6))

    # 4. Benefits to Employees
    elements.append(Paragraph("4. Benefits to Employees", header_style))
    elements.append(Paragraph("The product is designed to provide employees with a convenient and structured source of short-term financing.", normal_style))
    elements.append(Paragraph("Key benefits include:", normal_style))
    elements.append(Paragraph("• Quick access to funds for genuine short-term financial needs.", list_style))
    elements.append(Paragraph("• Simple repayment through an agreed payroll check-off mechanism.", list_style))
    elements.append(Paragraph("• Predictable repayment obligations, enabling employees to plan their finances.", list_style))
    elements.append(Paragraph("• Convenient application and processing, subject to the agreed approval process.", list_style))
    elements.append(Paragraph("• Access to a formal and structured credit facility rather than relying solely on informal borrowing channels.", list_style))
    elements.append(Spacer(1, 6))

    # 5. Benefits to the Employer
    elements.append(Paragraph("5. Benefits to the Employer", header_style))
    elements.append(Paragraph("The proposed partnership also provides benefits to the organisation, including:", normal_style))
    elements.append(Paragraph("<b>Employee Financial Wellness</b><br/>Access to structured short-term credit can assist employees in managing temporary cash-flow needs and unexpected financial obligations.", normal_style))
    elements.append(Paragraph("<b>Minimal Administrative Burden</b><br/>The check-off arrangement provides a structured repayment mechanism, reducing the need for employees to make individual repayments directly to the lender.", normal_style))
    elements.append(Paragraph("<b>Controlled Recovery Process</b><br/>Repayments are processed through an agreed payroll mechanism, providing a transparent and systematic recovery framework.", normal_style))
    elements.append(Paragraph("<b>Employee Support and Retention</b><br/>Providing access to structured financial solutions can complement an organisation's broader employee welfare and financial wellness initiatives.", normal_style))
    elements.append(Spacer(1, 6))

    # 6. Proposed Partnership Framework
    elements.append(Paragraph("6. Proposed Partnership Framework", header_style))
    elements.append(Paragraph(f"Leocap Invest proposes to formalise the arrangement through a Memorandum of Understanding (MOU) between Leocap Invest and {company_name}.", normal_style))
    elements.append(Paragraph("The MOU will establish the respective responsibilities of the parties, including:", normal_style))
    elements.append(Paragraph("1. Employee eligibility and onboarding.<br/>2. Loan application and approval procedures.<br/>3. Employee consent and authorisation for payroll deductions.<br/>4. Payroll check-off and remittance procedures.<br/>5. Reconciliation and reporting.<br/>6. Handling of employee exits, transfers or changes in employment status.<br/>7. Data protection and confidentiality.<br/>8. Dispute resolution and other applicable operational matters.", list_style))
    elements.append(Paragraph("The MOU is attached for your review and consideration.", normal_style))
    elements.append(Spacer(1, 6))

    # 7. Implementation Process
    elements.append(Paragraph("7. Implementation Process", header_style))
    elements.append(Paragraph("Step 1 - Engagement: A meeting between Leocap Invest and the organisation's relevant representatives to discuss the product and proposed partnership.", normal_style))
    elements.append(Paragraph("Step 2 - Review of MOU: The parties review and agree on the terms governing the partnership.", normal_style))
    elements.append(Paragraph("Step 3 - Employee Onboarding: Eligible employees are sensitised on the product, eligibility requirements, application process and repayment obligations.", normal_style))
    elements.append(Paragraph("Step 4 - Loan Processing: Employees submit applications, which are assessed by Leocap Invest in accordance with its credit assessment procedures.", normal_style))
    elements.append(Paragraph("Step 5 - Disbursement: Approved loans are disbursed to eligible employees.", normal_style))
    elements.append(Paragraph("Step 6 - Payroll Check-Off: Repayments are deducted through the agreed payroll process and remitted to Leocap Invest.", normal_style))
    elements.append(Paragraph("Step 7 - Reconciliation and Reporting: The parties undertake periodic reconciliation of deductions and remittances in accordance with the agreed procedures.", normal_style))
    elements.append(Spacer(1, 6))

    # 8. Compliance and Responsible Lending
    elements.append(Paragraph("8. Compliance and Responsible Lending", header_style))
    elements.append(Paragraph("Leocap Invest is committed to conducting the programme in a responsible, transparent and compliant manner.", normal_style))
    elements.append(Paragraph("Employee participation will be subject to the applicable eligibility and credit assessment requirements. Any payroll deduction will be undertaken pursuant to the appropriate employee authorisation and the agreed partnership framework.", normal_style))
    elements.append(Paragraph("Leocap Invest will also maintain appropriate confidentiality and data protection measures in relation to employee information processed as part of the programme.", normal_style))
    elements.append(Spacer(1, 6))

    # 9. Request for Engagement
    elements.append(Paragraph("9. Request for Engagement", header_style))
    elements.append(Paragraph(f"We respectfully request an opportunity to meet with the management and relevant representatives of {company_name} to formally present the Salary Advance Check-Off Loan Product, answer any questions and discuss the proposed partnership framework.", normal_style))
    elements.append(Paragraph("The attached MOU is provided for preliminary review and discussion and may be amended by mutual agreement to reflect the operational requirements of both parties.", normal_style))
    elements.append(Spacer(1, 6))

    # 10. Conclusion
    elements.append(Paragraph("10. Conclusion", header_style))
    elements.append(Paragraph("Leocap Invest believes that the Salary Advance Check-Off Loan Product can provide employees with a convenient and structured source of short-term credit while giving the organisation a controlled and transparent framework for facilitating employee financial support.", normal_style))
    elements.append(Paragraph(f"We look forward to the opportunity to engage with {company_name} and explore a mutually beneficial partnership.", normal_style))

    doc.build(elements)
    return file_path

"""

if "def generate_company_proposal_pdf" not in content:
    content += "\n" + generator_code
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added proposal generator to export_service.py")
else:
    print("Proposal generator already exists")
