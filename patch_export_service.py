import re

path = 'backend/website/export_service.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Clause 5.6 and update 5.7
content = content.replace(
    'elements.append(Paragraph(f"5.7 The repayments shall be recovered and remitted in a lump sum to the LEOCAP INVEST Bank Account on the 28th day of each month.", list_style))',
    'elements.append(Paragraph(f"5.6 The Lender shall send repayment schedules advising {company_name} of the monthly repayment for new Loans advanced under the Scheme, after each disbursement.", list_style))\n    elements.append(Paragraph(f"5.7 The repayments shall be recovered and remitted in a lump sum to the LEOCAP INVEST Bank Account on the 28th day of each month. The bank Details are as follows: NCBA BANK, PRESTIGE BRANCH, ACCOUNT NUMBER: 9710240013.", list_style))'
)

# 2. Add Clause 6.2.2 and 6.2.3
content = content.replace(
    'elements.append(Paragraph("6.2.1 Execute a Guarantee in favour of LEOCAP INVEST and use Staff pay slips as security for the facility.", list_style))',
    'elements.append(Paragraph("6.2.1 Execute a Guarantee in favour of LEOCAP INVEST and use Staff pay slips as security for the facility.", list_style))\n    elements.append(Paragraph("6.2.2 Ensure that the Loan Application forms that are submitted to the Lender are fully and accurately completed by the applicants;", list_style))\n    elements.append(Paragraph("6.2.3 Issue a confirmation letter to the Lender signed by the duly authorized officials in respect of the applications that are submitted;", list_style))'
)

# 3. Add Clause 8 (Dispute)
content = content.replace(
    'elements.append(Spacer(1, 6))\n    elements.append(Paragraph("<b>9. Default</b>", bold_style))',
    'elements.append(Spacer(1, 6))\n    elements.append(Paragraph("<b>8. Dispute</b>", bold_style))\n    elements.append(Paragraph("Should any dispute arise between the parties hereto with regard to the interpretation, rights, claims, obligations, and/or implementation of any one or more of the provisions of this agreement, the parties shall refer the dispute to the jurisdiction of a court in Kenya.", list_style))\n    \n    elements.append(Spacer(1, 6))\n    elements.append(Paragraph("<b>9. Default</b>", bold_style))'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched export_service.py with missing clauses.")
