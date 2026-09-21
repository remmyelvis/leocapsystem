import re

path = 'backend/website/export_service.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 3.4 (Add the missing 3.4)
old_3_4 = 'elements.append(Paragraph(f"3.4 The parties hereby expressly acknowledge and agree that the applicable interest rate and fee aforesaid are dependent on market forces and therefore subject to revision. The Lender will notify <b>{company_name}</b> Thirty (30) days in advance of its intention to vary the applicable interest rate and/or fee and the review shall be done in consultation with <b>{company_name}</b>.", list_style))'

new_3_4 = """
      elements.append(Paragraph(f"3.4 The parties hereby expressly acknowledge and agree that the applicable interest rate and fee aforesaid are dependent on market forces and therefore subject to revision. The Lender will notify <b>{company_name}</b> Thirty (30) days in advance of its intention to vary the applicable interest rate and/or fee and the review shall be done in consultation with <b>{company_name}</b>.", list_style))
      elements.append(Paragraph("3.5 It is hereby further expressly agreed and understood that any revisions of the interest rate and/or fee applicable shall only apply to loan applications made subsequent to such revisions and shall not affect any loans that shall have been disbursed prior to the date of revision.", list_style))
"""
content = content.replace(old_3_4, new_3_4.strip())

# Fix 5.4
old_5_4 = 'elements.append(Paragraph("5.4 LEOCAP INVEST shall subject all loan applications to the standard Credit appraisal process and shall approve or decline the loan application within Twenty-Four (24) hours of receipt of the application.", list_style))'
new_5_4 = 'elements.append(Paragraph("5.4 LEOCAP INVEST shall subject all loan applications to the standard Credit appraisal process and shall approve or decline the loan application within Twenty-Four (24) hours of receipt of the application. The lender reserves the right to reject an application that does not meet the set criteria and shall not be obliged to give any reasons thereof.", list_style))'
content = content.replace(old_5_4, new_5_4)


# Fix 6.1 and 6.2
old_6_1 = 'elements.append(Paragraph(f"6.1 <b>{company_name}</b> shall guarantee the repayment of all loans under the Scheme and shall also offer administrative support to the LENDER.", list_style))'
new_6_1 = 'elements.append(Paragraph(f"6.1 <b>{company_name}</b> shall guarantee the repayment of all loans under the Scheme and shall also offer administrative support to the LENDER in the processing of the loans, and shall comply with the obligations stipulated hereunder.", list_style))\n      elements.append(Paragraph(f"6.2 <b>{company_name}</b> hereby undertakes that it shall:", list_style))'
content = content.replace(old_6_1, new_6_1)

# Fix 7 Force Majeure
old_7 = 'elements.append(Paragraph("This MOU shall be suspended in the event of an act of God, war or other event beyond the reasonable control of either party.", list_style))'
new_7 = 'elements.append(Paragraph("This MOU shall be suspended in the event of an act of God, war or other event beyond the reasonable control of either party which severely prejudices the ability to carry out the Scheme. If the operation of this MOU is suspended for a continuous period of three (3) months, then it shall terminate forthwith.", list_style))'
content = content.replace(old_7, new_7)

# Fix 9 Default
old_9_3 = 'elements.append(Paragraph("9.3 A 15% Debt Collection Fee will be levied on the loan balance 7 days after the default of payment and a formal demand letter issued.", list_style))'
new_9_3 = 'elements.append(Paragraph("9.3 A 15% Debt Collection Fee will be levied on the loan balance 7 days after the default of payment and a formal demand letter issued.", list_style))\n      elements.append(Paragraph("9.4 Unpaid cheques will be subjected to the recovery of actual bank charges or KES 3,000 whichever is higher, and 15% of the cheque amount as collection charges. This defaulted instalment will be considered a rescheduled instalment.", list_style))'
content = content.replace(old_9_3, new_9_3)


with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched MOU generator with missing clauses")
