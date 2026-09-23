import io
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_credit_profile_pdf(applicant, credit_analysis, mpesa_metrics, narrative, loan_ask):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = styles['Title']
    title_style.textColor = colors.HexColor("#1e3a8a")
    h2_style = ParagraphStyle('H2', parent=styles['Heading2'], textColor=colors.HexColor("#1e40af"), spaceAfter=10)
    normal_style = styles['Normal']
    normal_style.fontSize = 10
    normal_style.leading = 14
    
    elements = []
    
    # Title
    elements.append(Paragraph("LeoCap Credit Risk Profile", title_style))
    elements.append(Spacer(1, 12))
    
    # Applicant Info
    elements.append(Paragraph(f"<b>Applicant:</b> {applicant.name if hasattr(applicant, 'name') else 'Unknown Applicant'}", normal_style))
    elements.append(Paragraph(f"<b>Loan Ask:</b> KES {loan_ask if loan_ask else 'N/A'}", normal_style))
    elements.append(Spacer(1, 20))
    
    # AI Executive Summary
    elements.append(Paragraph("1. AI Executive Summary", h2_style))
    for p in narrative.split('\n'):
        if p.strip():
            elements.append(Paragraph(p.strip(), normal_style))
            elements.append(Spacer(1, 6))
    elements.append(Spacer(1, 10))
    
    # Quantitative Credit Assessment
    elements.append(Paragraph("2. Quantitative Credit Assessment", h2_style))
    
    # Ensure we get the correct data dict depending on the payload structure
    c_data = credit_analysis.get('mpesa', credit_analysis) if isinstance(credit_analysis, dict) else {}
    score = c_data.get('score', 0)
    elements.append(Paragraph(f"<b>Final Credit Score:</b> {score} / 400", normal_style))
    elements.append(Spacer(1, 10))
    
    details = c_data.get('details', [])
    if details:
        table_data = [["Parameter Evaluated", "Impact on Score"]]
        for d in details:
            table_data.append([str(d.get('factor', '')), str(d.get('impact', ''))])
            
        t = Table(table_data, colWidths=[300, 150])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
        ]))
        elements.append(t)
    
    elements.append(Spacer(1, 20))
    
    # Advanced Risk Indicators
    elements.append(Paragraph("3. Advanced Risk Indicators", h2_style))
    adv = c_data.get('advanced_metrics', {})
    
    if adv.get('loan_ask_analysis'):
        la = adv['loan_ask_analysis']
        elements.append(Paragraph("<b>Affordability Analysis:</b>", normal_style))
        elements.append(Paragraph(f"- Avg Monthly Verified Inflow: KES {la.get('avg_monthly_inflow', 0):,.2f}", normal_style))
        elements.append(Paragraph(f"- Estimated Monthly Retention: KES {la.get('avg_monthly_retention', 0):,.2f}", normal_style))
        elements.append(Paragraph(f"- Ask-to-Retention Ratio: {la.get('ratio_to_retention', 0)}x", normal_style))
        elements.append(Paragraph(f"- Risk Rating: {la.get('affordability', '')}", normal_style))
        elements.append(Spacer(1, 10))
        
    elements.append(Paragraph("<b>Extremes:</b>", normal_style))
    elements.append(Paragraph(f"- Highest Balance: KES {adv.get('highest_balance', 0):,.2f}", normal_style))
    elements.append(Paragraph(f"- Highest Single Inflow: KES {adv.get('highest_money_in', 0):,.2f}", normal_style))
    elements.append(Paragraph(f"- Highest Single Outflow: KES {adv.get('highest_money_out', 0):,.2f}", normal_style))
    elements.append(Spacer(1, 10))
    
    if adv.get('heavy_credit_dependency_flags'):
        elements.append(Paragraph("<b>Heavy Credit Dependency (Flags):</b>", normal_style))
        for flag in adv['heavy_credit_dependency_flags'][:5]:
            elements.append(Paragraph(f"- {flag.get('description', '')}", normal_style))
            
    if adv.get('gambling_instances'):
        elements.append(Spacer(1, 10))
        elements.append(Paragraph("<b>Gambling Detected:</b>", normal_style))
        for g in adv['gambling_instances'][:5]:
            elements.append(Paragraph(f"- {g.get('description', '')}", normal_style))
            
    doc.build(elements)
    buffer.seek(0)
    return buffer
