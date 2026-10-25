import os
from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepInFrame
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from flask import current_app
from website import bank_details as bank

class CompanyReportPDFGenerator:
    @staticmethod
    def generate_repayment_report(company_name, company_code, month, apps, total_amount,
                                  account_name=bank.ACCOUNT_NAME, account_number=bank.ACCOUNT_NUMBER):
        """
        Generates a standardized corporate PDF for the monthly repayment report (the admin and HR downloads).
        Uses landscape orientation to fit more data columns. The whole report is kept on ONE page: the layout is
        compact and, for a long list, everything is scaled down to fit. account_name/account_number are the
        account the payment instructions name (Nakama pays into its own).
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
            spaceAfter=2,
            fontName='Helvetica-Bold'
        )
        
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.gray,
            spaceAfter=6
        )

        address_style = ParagraphStyle('HeaderAddress', parent=styles['Normal'], alignment=2)  # right-aligned

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
            header_data.append([img, Paragraph("<b>LEOCAP INVEST</b><br/>Prestige Plaza, Nairobi<br/>contact@leocapinvest.co.ke", address_style)])
        else:
            header_data.append([Paragraph("<b>LEOCAP INVEST</b>", header_style), Paragraph("Prestige Plaza, Nairobi<br/>contact@leocapinvest.co.ke", address_style)])
            
        header_table = Table(header_data, colWidths=[360, 360])
        header_table.setStyle(TableStyle([
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
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
            ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
            
            ('BACKGROUND', (0, 1), (-1, 1), colors.whitesmoke),
            ('TEXTCOLOR', (0, 1), (-1, 1), BRAND_ORANGE),
            ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 1), (-1, 1), 12),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 6),
            ('TOPPADDING', (0, 1), (-1, 1), 6),
            
            ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 8))
        
        # Main Data Table
        table_data = [["#", "Borrower Name", "Payroll No", "Request Date", "Amount Applied", "Repayment Amount"]]
        
        for idx, app in enumerate(apps, 1):
            table_data.append([
                str(idx),
                app.get('Customer') or 'N/A',
                app.get('Payroll') or 'N/A',
                app.get('Request Date') or 'N/A',
                app.get('Amount Applied', '0.00'),
                app.get('Repayment Amount', '0.00')
            ])
            
        # Add Total Row
        table_data.append([
            "", "", "", "", "TOTAL", f"KES {float(total_amount):,.2f}"
        ])
            
        main_table = Table(table_data, colWidths=[30, 250, 110, 110, 110, 110])
        main_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BRAND_BLUE),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
            
            ('ALIGN', (4, 1), (5, -1), 'RIGHT'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('TOPPADDING', (0, 1), (-1, -2), 2),
            ('BOTTOMPADDING', (0, 1), (-1, -2), 2),
            ('GRID', (0, 0), (-1, -2), 0.5, colors.lightgrey),
            
            # Total Row Styling
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, -1), (-1, -1), BRAND_BLUE),
            ('BACKGROUND', (0, -1), (-1, -1), colors.whitesmoke),
            ('LINEABOVE', (0, -1), (-1, -1), 1.5, BRAND_BLUE),
            ('BOTTOMPADDING', (0, -1), (-1, -1), 5),
            ('TOPPADDING', (0, -1), (-1, -1), 5),
        ]))
        
        elements.append(main_table)
        elements.append(Spacer(1, 10))
        
        # Payment Instructions
        instructions = f"""
        <b>Payment Instructions:</b><br/>
        Account Name: {account_name} &nbsp;|&nbsp; {bank.BANK_UPPER} &nbsp;|&nbsp; Account Number: {account_number}
        &nbsp;|&nbsp; Branch Name: {bank.BRANCH} &nbsp;|&nbsp; Swift Code: {bank.SWIFT}<br/>
        <b>M-PESA Paybill:</b> {bank.PAYBILL} (Deposit reference: {company_code.upper()})
        """
        elements.append(Paragraph(instructions, styles['Normal']))
        
        # One page, always: a long list is scaled down to fit the page instead of running onto a second one.
        doc.build([KeepInFrame(doc.width - 12, doc.height - 12, elements, mode='shrink')])
        buffer.seek(0)
        return buffer
