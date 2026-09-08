import os
from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from flask import current_app

class CompanyReportPDFGenerator:
    @staticmethod
    def generate_repayment_report(company_name, company_code, month, apps, total_amount):
        """
        Generates a standardized corporate PDF for the monthly repayment report.
        Uses landscape orientation to fit more data columns.
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(letter),
            rightMargin=30,
            leftMargin=30,
            topMargin=30,
            bottomMargin=30
        )
        
        elements = []
        styles = getSampleStyleSheet()
        
        # Colors
        BRAND_BLUE = colors.HexColor('#0F2C59')
        BRAND_ORANGE = colors.HexColor('#D97706')
        
        # Styles
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=BRAND_BLUE,
            spaceAfter=10,
            fontName='Helvetica-Bold'
        )
        
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.gray,
            spaceAfter=20
        )

        header_style = ParagraphStyle(
            'HeaderLeft',
            parent=styles['Normal'],
            fontSize=10,
            textColor=BRAND_BLUE,
            fontName='Helvetica-Bold'
        )
        
        # Add Logo
        logo_path = os.path.join(current_app.root_path, "static", "logo.png")
        if not os.path.exists(logo_path):
             logo_path = os.path.join(current_app.root_path, "templates", "logo.png")

        header_data = []
        if os.path.exists(logo_path):
            img = Image(logo_path, width=120, height=40)
            header_data.append([img, Paragraph("<b>LEOCAP INVEST</b><br/>Prestige Plaza, Nairobi<br/>contact@leocapinvest.co.ke", styles['Normal'])])
        else:
            header_data.append([Paragraph("<b>LEOCAP INVEST</b>", header_style), Paragraph("Prestige Plaza, Nairobi<br/>contact@leocapinvest.co.ke", styles['Normal'])])
            
        header_table = Table(header_data, colWidths=[200, 450])
        header_table.setStyle(TableStyle([
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 20),
        ]))
        elements.append(header_table)
        
        # Title
        elements.append(Paragraph(f"Monthly Repayment Report: {company_name.upper()}", title_style))
        elements.append(Paragraph(f"Repayment Cycle: {month} | Generated on: {datetime.now().strftime('%d %B %Y')}", subtitle_style))
        
        # KPI Summary Table
        summary_data = [
            ["Total Borrowers", "Total Repayment Expected"],
            [str(len(apps)), f"KES {float(total_amount):,.2f}"]
        ]
        
        summary_table = Table(summary_data, colWidths=[200, 200])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BRAND_BLUE),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            
            ('BACKGROUND', (0, 1), (-1, 1), colors.whitesmoke),
            ('TEXTCOLOR', (0, 1), (-1, 1), BRAND_ORANGE),
            ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 1), (-1, 1), 14),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 12),
            ('TOPPADDING', (0, 1), (-1, 1), 12),
            
            ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 20))
        
        # Main Data Table
        table_data = [["#", "Borrower Name", "Payroll No", "Phone", "Disbursed", "Monthly Installment"]]
        
        for idx, app in enumerate(apps, 1):
            table_data.append([
                str(idx),
                app.get('Name', 'N/A'),
                app.get('Payroll_Number', 'N/A'),
                app.get('Phone', 'N/A'),
                f"{float(app.get('Disbursement_Amount', 0)):,.2f}",
                f"{float(app.get('Repayment_Amount', 0)):,.2f}"
            ])
            
        # Add Total Row
        table_data.append([
            "", "", "", "TOTAL", "", f"KES {float(total_amount):,.2f}"
        ])
            
        main_table = Table(table_data, colWidths=[30, 200, 100, 100, 100, 100])
        main_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BRAND_BLUE),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            
            ('ALIGN', (4, 1), (5, -1), 'RIGHT'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -2), 0.5, colors.lightgrey),
            
            # Total Row Styling
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, -1), (-1, -1), BRAND_BLUE),
            ('BACKGROUND', (0, -1), (-1, -1), colors.whitesmoke),
            ('LINEABOVE', (0, -1), (-1, -1), 1.5, BRAND_BLUE),
            ('BOTTOMPADDING', (0, -1), (-1, -1), 10),
            ('TOPPADDING', (0, -1), (-1, -1), 10),
        ]))
        
        elements.append(main_table)
        elements.append(Spacer(1, 30))
        
        # Payment Instructions
        instructions = f"""
        <b>Payment Instructions:</b><br/>
        Account Name: LEOCAP INVEST<br/>
        NCBA BANK KENYA PLC<br/>
        Account Number: 9710240013<br/>
        Branch Name: PRESTIGE<br/>
        Swift Code: CBAFKENX<br/>
        <br/>
        <b>M-PESA Paybill:</b> 880100 (Deposit reference: {company_code.upper()})
        """
        elements.append(Paragraph(instructions, styles['Normal']))
        
        doc.build(elements)
        buffer.seek(0)
        return buffer
