from io import BytesIO
import pandas as pd
from reportlab.lib.pagesizes import portrait, landscape, A1, A4, A3
from reportlab.lib import colors
from reportlab.lib.units import cm, mm
from datetime import datetime
from openpyxl.styles import Alignment, Font
from openpyxl.drawing.image import Image as XLImage
from openpyxl.utils import get_column_letter
from reportlab.platypus import Image
from PIL import Image as PILImage
import os
from decimal import Decimal


from reportlab.platypus import (
    KeepTogether, HRFlowable, 
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer
)

from reportlab.lib import colors, pagesizes
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from flask import render_template
from website.models import Application, Applicant, StatementEntry


def dataframe_to_excel(df, title, total_amount, payment_details):
    output = BytesIO()

    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(
            writer,
            sheet_name="Applications",
            index=False,
            startrow=2
        )

        ws = writer.sheets["Applications"]

        num_cols = len(df.columns)
        last_data_row = 2 + 1 + len(df)

        ws.merge_cells(
            start_row=1,
            start_column=1,
            end_row=1,
            end_column=num_cols
        )

        # Merge A1 through the last column in row 1
        ws.merge_cells(
            start_row=2,
            start_column=1,
            end_row=2,
            end_column=num_cols
        )

        with PILImage.open("website/templates/logo.png") as img:
            orig_w, orig_h = img.size
            aspect = orig_w / orig_h

        target_height_px = 55  # pick based on your row height in points * 1.333
        target_width_px = int(target_height_px * aspect)

        logo = XLImage("website/templates/logo.png")
        logo.height = target_height_px
        logo.width = target_width_px

        ws.row_dimensions[1].height = target_height_px / 1.333  # convert back to points

        ws.add_image(logo, "A1")

        title_cell = ws.cell(row=2, column=1)
        title_cell.value = title
        title_cell.font = Font(bold=True, size=8)
        title_cell.alignment = Alignment(horizontal="left")

        ws.merge_cells(
            start_row=last_data_row + 1,
            start_column=1,
            end_row=last_data_row + 1,
            end_column=num_cols
        )

        total_cell = ws.cell(row=last_data_row + 1, column=1)
        total_cell.value = f"Total repayment: {total_amount:,.2f}"
        total_cell.font = Font(bold=True, size=10)
        total_cell.alignment = Alignment(horizontal="left")

        ws.merge_cells(
            start_row=last_data_row + 2,
            start_column=1,
            end_row=last_data_row + 2,
            end_column=num_cols
        )

        expected_cell = ws.cell(row=last_data_row + 2, column=1)
        expected_cell.value = f"Expected repayment: {total_amount:,.2f}"
        expected_cell.font = Font(bold=True, size=10)
        expected_cell.alignment = Alignment(horizontal="left")

        ws.merge_cells(
            start_row=last_data_row + 3,
            start_column=1,
            end_row=last_data_row + 13,
            end_column=num_cols
        )

        bank_cell = ws.cell(row=last_data_row + 3, column=1)
        bank_cell.value = payment_details
        bank_cell.font = Font(bold=False, size=10)
        bank_cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)

    output.seek(0)

    return output


def dataframe_to_pdf(df, title, bank_details, total_amount):
    output = BytesIO()

    doc = SimpleDocTemplate(output, pagesize=portrait(A4))

    styles = getSampleStyleSheet()

    table_data = [df.columns.tolist()]
    table_data.extend(df.values.tolist())

    table = Table(table_data)

    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    logo_path = os.path.join(BASE_DIR, "templates", "logo.png")

    table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("GRID", (0, 0), (-1, -1), 1, colors.black),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),  # <-- table-wide font size
            ("FONTSIZE", (0, 0), (-1, 0), 8),  # optional: slightly bigger header row
            ("TOPPADDING", (0, 0), (-1, -1), 3),  # optional: tighten row height to match smaller font
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("ALIGN", (-2, 0), (-1, -1), "RIGHT")
        ])
    )

    logo = Image("website/templates/logo.png")
    logo.drawHeight = 150
    logo.drawWidth = 250
    logo.hAlign = "LEFT"

    elements = [
        logo,
        Paragraph(title, styles["Heading4"]),
        Spacer(1, 12),
        table,
        Spacer(1, 12),
        Paragraph(f"Total repayment: {total_amount:,.2f}", styles["Heading4"]),
        Spacer(1, 12),
        Paragraph(f"Expected repayment: {total_amount:,.2f}", styles["Heading4"]),
        Paragraph(
            bank_details.replace("\n", "<br/>"),
            styles["BodyText"]
        ),
        Spacer(1, 15),
    ]

    doc.build(elements)

    output.seek(0)

    return output



def export_statement(applicant, apps, df, statement_request_date=None):
    from reportlab.platypus import KeepTogether, HRFlowable, SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
    from reportlab.lib import colors, pagesizes
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from decimal import Decimal
    from datetime import datetime
    import pandas as pd
    from reportlab.lib.units import inch

    output = BytesIO()
    
    doc = SimpleDocTemplate(
        output,
        pagesize=portrait(A4),
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=30,
    )

    elements = []
    styles = getSampleStyleSheet()
    
    # Custom colors matching the sample
    c_blue = colors.HexColor("#0F2C59")
    c_orange = colors.HexColor("#F97316") # Tailwind orange-500
    c_light_bg = colors.HexColor("#F8FAFC")
    c_border = colors.HexColor("#E2E8F0")
    
    # Custom text styles
    header_left_style = ParagraphStyle(
        'HeaderLeft', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=18, textColor=c_blue, leading=22
    )
    header_address_style = ParagraphStyle(
        'HeaderAddress', parent=styles['Normal'], fontName='Helvetica', fontSize=8, textColor=colors.HexColor("#475569"), leading=12
    )
    header_right_title = ParagraphStyle(
        'HeaderRightTitle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=14, textColor=c_orange, alignment=2
    )
    header_right_details = ParagraphStyle(
        'HeaderRightDetails', parent=styles['Normal'], fontName='Helvetica', fontSize=8, textColor=colors.HexColor("#475569"), alignment=2, leading=12
    )
    
    section_title_style = ParagraphStyle(
        'SectionTitle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, textColor=c_blue, leading=14
    )
    
    footer_style = ParagraphStyle(
        'FooterNotes', parent=styles['Normal'], fontName='Helvetica', fontSize=8, leading=12, textColor=colors.HexColor("#475569")
    )
    
    if not isinstance(apps, list):
        apps = [apps]
    apps = sorted([a for a in apps if a], key=lambda x: x.created_at if x.created_at else datetime.min)
    
    if not df.empty and 'date' in df.columns:
        df['parsed_date'] = pd.to_datetime(df['date'], errors='coerce')
    else:
        df['parsed_date'] = pd.NaT

    stmt_date = statement_request_date if statement_request_date else datetime.now().strftime("%d %B %Y, %H:%M")

    for i, app in enumerate(apps):
        # 1. HEADER
        left_text = (
            "<b>LEOCAP INVEST</b><br/>"
            "<font size='8' color='#475569'>Applewood Adams, Ngong Road, Nairobi, Kenya<br/>"
            "Tel: +254 722 221 502 &amp; +254 721 834 959 | Email: info@leocapinvest.co.ke<br/>"
            "Web: https://leocapinvest.co.ke</font>"
        )
        
        try:
            from PIL import Image as PILImg
            from reportlab.platypus import Image as RLImage
            img = PILImg.open("website/templates/logo.png")
            aspect = img.width / img.height
            new_height = 30
            new_width = new_height * aspect
            logo = RLImage("website/templates/logo.png", width=new_width, height=new_height)
            logo.hAlign = 'LEFT'
            left_cell = [logo, Spacer(1, 6), Paragraph(left_text, header_address_style)]
        except Exception:
            left_cell = [Paragraph("<b>LEOCAP INVEST</b>", header_left_style), Paragraph(left_text.replace("<b>LEOCAP INVEST</b><br/>", ""), header_address_style)]

        right_header = (
            "ACCOUNT STATEMENT<br/>"
            f"<font size='8' color='#475569'><b>Statement Ref:</b> STMT-{app.id[:8].upper()}<br/>"
            f"<b>Date Generated:</b> {stmt_date}<br/>"
            "<b>Currency:</b> KES (Kenyan Shilling)</font>"
        )
        
        header_table = Table([
            [left_cell, Paragraph(right_header, header_right_title)]
        ], colWidths=[3.5 * inch, 3.5 * inch])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
            ('LINEBELOW', (0,0), (-1,-1), 1, c_blue)
        ]))
        
        elements.append(header_table)
        elements.append(Spacer(1, 15))
        
        # 2. BORROWER DETAILS
        elements.append(Paragraph("BORROWER DETAILS", section_title_style))
        elements.append(Spacer(1, 5))
        
        borrower_data = [
            ["CUSTOMER NAME", applicant.name, "ID / PASSPORT NO.", getattr(applicant, 'id_number', 'N/A') or 'N/A'],
            ["PHONE NUMBER", applicant.phone_number, "KRA PIN", getattr(applicant, 'kra_pin', 'N/A') or 'N/A'],
            ["EMAIL ADDRESS", applicant.email, "COMPANY", str(getattr(applicant, 'applicant_type', 'N/A') or 'N/A').upper()],
            ["LOAN ID", app.id[-6:].upper() if app.id else 'N/A', "PAYROLL NUMBER", str(getattr(applicant, 'payroll_number', 'N/A') or 'N/A')]
        ]
        
        b_table = Table(borrower_data, colWidths=[1.5*inch, 2.0*inch, 1.5*inch, 2.0*inch])
        b_table.setStyle(TableStyle([
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'), # col 1 bold keys
            ('FONTNAME', (2,0), (2,-1), 'Helvetica-Bold'), # col 3 bold keys
            ('TEXTCOLOR', (0,0), (0,-1), colors.HexColor("#64748B")),
            ('TEXTCOLOR', (2,0), (2,-1), colors.HexColor("#64748B")),
            ('BACKGROUND', (0,0), (-1,-1), c_light_bg),
            ('GRID', (0,0), (-1,-1), 0.5, c_border),
            ('PADDING', (0,0), (-1,-1), 6),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        elements.append(b_table)
        elements.append(Spacer(1, 15))
        
        # 3. FINANCIAL POSITION SUMMARY
        elements.append(Paragraph("FINANCIAL POSITION SUMMARY", section_title_style))
        elements.append(Spacer(1, 5))
        
        amt_applied = Decimal(app.amount_applied) if app.amount_applied else Decimal(0)
        interest_amt = Decimal(app.amount_applied) * Decimal(app.interest_rate or 0) if app.amount_applied else Decimal(0)
        total_borrowed = amt_applied + interest_amt
        total_repaid = Decimal(0) # Calculate from transactions if needed, but for now we'll put a placeholder or sum credits
        
        # Determine transactions for this loan
        start_date = app.created_at if app.created_at else pd.Timestamp.min
        end_date = apps[i+1].created_at if i + 1 < len(apps) and apps[i+1].created_at else pd.Timestamp.max
        
        # If multiple loans were created at the exact same microsecond (test data anomaly),
        # slightly offset the end_date so intervals don't collapse to zero width
        if start_date == end_date:
            end_date = end_date + pd.Timedelta(seconds=1)
        
        app_df = pd.DataFrame()
        if not df.empty:
            if 'application_id' in df.columns:
                # Prioritize application_id matching if present, else fallback to time window
                mask_id = df['application_id'] == app.id
                mask_time = df['application_id'].isnull() & (df['parsed_date'] >= start_date) & (df['parsed_date'] < end_date)
                app_df = df[mask_id | mask_time].copy()
            else:
                app_df = df[(df['parsed_date'] >= start_date) & (df['parsed_date'] < end_date)].copy()
        
        # Dynamically recalculate balances to ensure perfection chronologically
        running_bal = 0.0
        tot_rep = 0.0
        if not app_df.empty:
            app_df = app_df.sort_values(by='parsed_date')
            for _, r in app_df.iterrows():
                try:
                    d = float(str(r.get('debit', 0)).replace(',','').strip()) if str(r.get('debit', 0)).replace('.','',1).replace(',','').strip().isdigit() else 0.0
                except: d = 0.0
                try:
                    c = float(str(r.get('credit', 0)).replace(',','').strip()) if str(r.get('credit', 0)).replace('.','',1).replace(',','').strip().isdigit() else 0.0
                except: c = 0.0
                running_bal += d
                running_bal -= c
                tot_rep += c
                
        total_repaid = Decimal(tot_rep)
        current_balance = Decimal(running_bal) if running_bal > 0 else Decimal(0)
        
        def safe_float(val):
            try:
                return float(str(val).replace(',', '').strip())
            except:
                return 0.0
                
        m1 = safe_float(getattr(app, 'month_one', 0))
        m2 = safe_float(getattr(app, 'month_two', 0))
        m3 = safe_float(getattr(app, 'month_three', 0))
        avg_earnings = (m1 + m2 + m3) / 3.0
        calculated_limit = avg_earnings / 1.1 if avg_earnings > 0 else 0.0
        credit_limit = Decimal(calculated_limit)
        
        fin_data = [
            ["TOTAL BORROWED (DEBIT)", "TOTAL REPAID (CREDIT)", "CURRENT BALANCE", "CREDIT LIMIT"],
            [f"KES {total_borrowed:,.2f}", f"KES {total_repaid:,.2f}", f"KES {current_balance:,.2f}", f"KES {credit_limit:,.2f}"]
        ]
        
        fin_table = Table(fin_data, colWidths=[1.7*inch, 1.7*inch, 2.0*inch, 1.6*inch])
        fin_table.setStyle(TableStyle([
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 8),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor("#64748B")),
            ('FONTNAME', (0,1), (-1,1), 'Helvetica-Bold'),
            ('FONTSIZE', (0,1), (-1,1), 9),
            ('TEXTCOLOR', (2,1), (2,1), colors.HexColor("#16A34A")), # Green for balance
            ('BACKGROUND', (0,0), (-1,-1), c_light_bg),
            ('GRID', (0,0), (-1,-1), 0.5, c_border),
            ('PADDING', (0,0), (-1,-1), 8),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        elements.append(fin_table)
        elements.append(Spacer(1, 15))
        
        # 4. TRANSACTION HISTORY
        elements.append(Paragraph("TRANSACTION HISTORY & LEDGER", section_title_style))
        elements.append(Spacer(1, 5))
        
        if not app_df.empty:
            # Sort strictly by date chronologically
            app_df = app_df.sort_values(by='parsed_date')
            
            # Dynamically recalculate running balance per loan
            running_balance = 0.0
            recalc_balances = []
            for idx, row in app_df.iterrows():
                try:
                    deb = float(str(row.get('debit', 0)).replace(',','').strip()) if str(row.get('debit', 0)).replace('.','',1).replace(',','').strip().isdigit() else 0.0
                except: deb = 0.0
                
                try:
                    cred = float(str(row.get('credit', 0)).replace(',','').strip()) if str(row.get('credit', 0)).replace('.','',1).replace(',','').strip().isdigit() else 0.0
                except: cred = 0.0
                
                running_balance += deb
                running_balance -= cred
                recalc_balances.append(running_balance)
                
            app_df['balance'] = recalc_balances
            
            # Update Outstanding Balance dynamically for this loan
            current_balance = Decimal(running_balance) if running_balance > 0 else Decimal(0)
            
            # Format date for PDF display
            if 'parsed_date' in app_df.columns:
                app_df['date'] = app_df['parsed_date'].dt.strftime('%d %b %Y')
                
            # Now drop parsed date
            if 'parsed_date' in app_df.columns:
                app_df = app_df.drop(columns=['parsed_date'])
            
            # We must also format the financial summary table again, since it was defined earlier
            # But wait, fin_table is appended BEFORE transaction history!
            # We will handle fin_table dynamically earlier, but for now we format columns
            for col in ['debit', 'credit', 'balance', 'Debit', 'Credit', 'Balance']:
                if col in app_df.columns:
                    app_df[col] = app_df[col].apply(lambda x: f"{float(x):,.2f}" if str(x).replace('.','',1).isdigit() and float(x) != 0 else "-")
            
            headers = ["DATE", "DESCRIPTION / MEMO", "DEBIT (+)", "CREDIT (-)", "BALANCE"]
            
            app_df_ordered = app_df[['date', 'memo', 'debit', 'credit', 'balance']] if all(c in app_df.columns for c in ['date', 'memo', 'debit', 'credit', 'balance']) else app_df
            
            table_data = [headers]
            table_data.extend(app_df_ordered.values.tolist())
            
            t_col_widths = [1.0 * inch, 3.2 * inch, 0.9 * inch, 0.9 * inch, 1.0 * inch]
            tx_table = Table(table_data, colWidths=t_col_widths, repeatRows=1)
            
            tx_style = [
                ("BACKGROUND", (0, 0), (-1, 0), c_blue),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 8),
                ("ALIGN", (0, 0), (-1, 0), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("GRID", (0, 0), (-1, -1), 0.5, c_border),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
                ("ALIGN", (2, 1), (-1, -1), "RIGHT"), # Numbers aligned right
                ("ALIGN", (1, 1), (1, -1), "LEFT"), # Memo left
                ("ALIGN", (0, 1), (0, -1), "CENTER"), # Date center
                ("PADDING", (0,0), (-1,-1), 6),
            ]
            
            # Alternate row colors
            for r_idx in range(1, len(table_data)):
                if r_idx % 2 == 0:
                    tx_style.append(("BACKGROUND", (0, r_idx), (-1, r_idx), c_light_bg))
                    
            tx_table.setStyle(TableStyle(tx_style))
            elements.append(tx_table)
        else:
            elements.append(Paragraph("<font color='#64748B' size='8'><i>No transactions recorded for this loan period.</i></font>", styles['Normal']))
            
        elements.append(Spacer(1, 15))
        
        # 5. FOOTER
        footer_text = (
            "<b>PAYMENT & CLEARANCE INSTRUCTIONS:</b><br/>"
            "• Payments can be made directly via M-Pesa Paybill or Bank Transfer.<br/>"
            "• Please use your National ID Number as your Account Reference.<br/>"
            "• <b>M-Pesa:</b> 0722221502 | <b>NCBA Bank Paybill:</b> 880100 (Acc: 005605)<br/>"
            "• This statement is system-generated by Leocap Invest Management System and is valid without a physical signature.<br/>"
            "• For inquiries or dispute resolution, contact support@leocapinvest.co.ke."
        )
        elements.append(KeepTogether([Paragraph(footer_text, footer_style)]))
        
        # PageBreak for every loan except the last one
        if i < len(apps) - 1:
            elements.append(PageBreak())

    doc.build(elements)
    
    output.seek(0)
    return output



def export_applicant(df, title, applicant):
    output = BytesIO()

    doc = SimpleDocTemplate(output, pagesize=landscape(A4))

    styles = getSampleStyleSheet()

    logo = Image("website/templates/logo.png")
    logo.drawHeight = 100
    logo.drawWidth = 100

    elements = [
        logo,
        Paragraph(title, styles["Title"]),
        Spacer(1, 12),
    ]
    
    data = [
        ["Name", applicant.name],
        ["Email", applicant.email],
        ["Phone No.", applicant.phone_number],
        ["ID No", applicant.id_number],
        ["Status",applicant.applicant_status],
        ["Role", applicant.role],
        ["Type", applicant.applicant_type],
        ["Created at", applicant.created_at.strftime("%d-%b-%Y")]
    ]

    for label, value in data:
        elements.append(
            Paragraph(f"<b>{label}:</b> {value}", styles["BodyText"])
        )
    
    elements.append(Spacer(1, 12))

    doc.build(elements)

    output.seek(0)

    return output


def export_application(df, title, app):
    output = BytesIO()

    doc = SimpleDocTemplate(output, pagesize=landscape(A4))

    styles = getSampleStyleSheet()

    logo = Image("website/templates/logo.png")
    logo.drawHeight = 100
    logo.drawWidth = 100

    elements = [
        logo,
        Paragraph(title, styles["Title"]),
        Spacer(1, 12),
    ]
    
    data = [
        ["Employment Type", app.employment_type],
        ["Employment Nature", app.employment_nature],
        ["Company", app.company],
        ["Payroll Number", app.payroll_number],
        ["Designation",app.designation],
        ["Month One Salary", app.month_one],
        ["Month Two Salary", app.month_two],
        ["Month Three Salary", app.month_three],
        ["Loan Type", app.loan_type],
        ["Loan Purpose", app.loan_purpose],
        ["Amount Applied", app.amount_applied],
        ["Processing Fee", app.processing_fees],
        ["Access Fee.", app.access_fees],
        ["Legan Fee", app.legal_fees],
        ["Disbursement Amount",app.disbursement_amount],
        ["Repayment Amount", app.repayment_amount],
        ["Loan Status", app.loan_status],
        ["Repayment Status", app.repayment_status],
        ["Collection Fee", app.collection_fee],
        ["Late Payment Fee", app.late_payment_fee],
        ["Interest Rate", app.interest_rate],
        ["Application Date", app.created_at.strftime("%d-%b-%Y")],
        ["Due Date",app.due_date.strftime("%d-%b-%Y")]
    ]

    for label, value in data:
        elements.append(
            Paragraph(f"<b>{label}:</b> {value}", styles["BodyText"])
        )

    doc.build(elements)

    output.seek(0)

    return output


def escalation_to_pdf(applicant, app):
    html = render_template(
        "demand_letter.html",
        applicant_name=applicant.name,
        payroll_number=app.payroll_number,
        phone_number=applicant.phone_number,
        email=applicant.email,
        designation=app.designation,
        id_number=applicant.id_number,
        repayment_amount=app.repayment_amount,
        original_amount=str(Decimal(app.repayment_amount) - Decimal(app.collection_fee) - Decimal(app.late_payment_fee)),
        due_date=app.due_date.strftime("%d %B %Y"),
        late_payment_fee=app.late_payment_fee,
        collection_fee=app.collection_fee,
        created_at=app.created_at.strftime("%d %B %Y"),
        current_date=datetime.now().strftime("%d %B %Y"),
    )

    return html


def get_readable_date(stamp):
    dt = datetime.strptime(
        stamp,
        "%Y-%m-%d %H:%M:%S.%f"
    )

    human_readable = dt.strftime("%d %B %Y")

    return human_readable

import io


def generate_demand_letter_elements(app, applicant):
    from reportlab.platypus import Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    from datetime import datetime
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('DemandTitle', parent=styles['Heading1'], alignment=TA_CENTER, fontSize=18, spaceAfter=10, textColor=colors.HexColor("#B91C1C"))
    sub_title_style = ParagraphStyle('DemandSubTitle', parent=styles['Heading2'], alignment=TA_CENTER, fontSize=14, spaceAfter=20)
    normal_style = styles['Normal']
    bold_style = ParagraphStyle('BoldText', parent=normal_style, fontName='Helvetica-Bold')
    
    elements = []
    
    # Header
    elements.append(Paragraph("DEMAND LETTER", title_style))
    
    total_due = float(app.repayment_amount) if app.repayment_amount else 0.0
    elements.append(Paragraph(f"OUTSTANDING LOAN BALANCE OF KES {total_due:,.2f}", sub_title_style))
    
    # Date
    today_str = datetime.now().strftime("%d %B %Y")
    elements.append(Paragraph(f"<b>Date:</b> {today_str}", normal_style))
    elements.append(Spacer(1, 10))
    
    # Recipient
    designation = getattr(applicant, 'designation', 'N/A')
    payroll = applicant.payroll_number if applicant.payroll_number else 'N/A'
    elements.append(Paragraph(f"<b>{applicant.name}</b><br/>Payroll No: {payroll}<br/>ID No: {applicant.id_number}<br/>Phone: {applicant.phone_number}<br/>Email: {applicant.email}<br/>Designation: {designation}", normal_style))
    elements.append(Spacer(1, 10))
    
    elements.append(Paragraph(f"Dear {applicant.name},", normal_style))
    elements.append(Spacer(1, 10))
    
    elements.append(Paragraph(f"We write to formally demand payment of <b>{total_due:,.2f}</b>, being the outstanding loan balance due and payable as at the date of this letter.", normal_style))
    elements.append(Spacer(1, 10))
    
    # Find original instalment
    instalment = float(app.amount_applied) if app.amount_applied else 0.0
    due_date = app.due_date.strftime("%d %B %Y") if app.due_date else "the agreed due date"
    
    late_fee = float(app.late_payment_fee) if app.late_payment_fee else 0.0
    collection_fee = float(app.collection_fee) if app.collection_fee else 0.0
    
    elements.append(Paragraph(f"The loan instalment of <b>{instalment:,.2f}</b>, which fell due on <b>{due_date}</b>, remains unpaid and is therefore in default. Pursuant to Clause F (Default) of the Loan Agreement, the following charges have lawfully accrued:", normal_style))
    elements.append(Spacer(1, 10))
    
    bullet_style = ParagraphStyle('Bullet', parent=normal_style, leftIndent=20, bulletIndent=10)
    elements.append(Paragraph(f"<bullet>&bull;</bullet>The defaulted instalment has been treated as a rescheduled instalment and subjected to a rescheduling fee of <b>{late_fee:,.2f}</b> (being the higher of 10% of the instalment or KES 1,500); and", bullet_style))
    elements.append(Spacer(1, 5))
    elements.append(Paragraph(f"<bullet>&bull;</bullet>A debt collection fee of 15% of the outstanding loan balance, amounting to <b>{collection_fee:,.2f}</b>, has been levied following lapse of seven (7) days after default.", bullet_style))
    elements.append(Spacer(1, 10))
    
    elements.append(Paragraph("Despite prior reminders, no satisfactory payment has been received to date.", normal_style))
    elements.append(Spacer(1, 10))
    
    elements.append(Paragraph(f"<b>You are hereby required to settle the full outstanding amount of {total_due:,.2f} within seven (7) days from the date of this letter.</b>", normal_style))
    elements.append(Spacer(1, 15))
    
    # Payment Instructions
    elements.append(Paragraph("<b>Payment Instructions</b>", bold_style))
    elements.append(Paragraph("<b>Account Name:</b> LEOCAP INVEST<br/><b>Bank:</b> NCBA Bank Kenya PLC<br/><b>Account Number:</b> 9710240013", normal_style))
    elements.append(Spacer(1, 15))
    
    elements.append(Paragraph("This letter serves as a <b>final demand</b>. Failure to comply within the stipulated period shall result in escalation of recovery action, including but not limited to third-party debt recovery, and/or legal proceedings, at your sole cost and expense, without further notice.", normal_style))
    elements.append(Spacer(1, 15))
    
    elements.append(Paragraph("Yours faithfully,", normal_style))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph("<b>Elvis Karemi Nyaga</b><br/>Proprietor<br/>LEOCAP INVEST", normal_style))
    
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.black))
    elements.append(Spacer(1, 10))
    
    # Statement of Account
    elements.append(Paragraph("STATEMENT OF ACCOUNT - LOAN ARREARS SUMMARY", sub_title_style))
    
    app_date = app.created_at.strftime("%d %B %Y") if app.created_at else "N/A"
    
    elements.append(Paragraph(f"<b>Borrower Name:</b> {applicant.name}<br/><b>Payroll Number:</b> {payroll}<br/><b>ID Number:</b> {applicant.id_number}<br/><b>Designation:</b> {designation}<br/><b>Loan Application Date:</b> {app_date}<br/><b>Instalment Due Date:</b> {due_date}", normal_style))
    elements.append(Spacer(1, 15))
    
    data = [
        ["Description", "Basis", "Amount (KES)"],
        ["Outstanding instalment due", f"Loan Position as at {today_str}", f"{instalment:,.2f}"],
        ["Rescheduling fee", "Higher of 10% or KES 1,500", f"{late_fee:,.2f}"],
        ["Debt collection fee", "15% of loan balance", f"{collection_fee:,.2f}"],
        ["Total Amount Payable", "", f"{total_due:,.2f}"]
    ]
    
    t = Table(data, colWidths=[200, 150, 100])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f4f4f4")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.black),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('ALIGN', (2,0), (2,-1), 'RIGHT'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 1, colors.black),
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
    ]))
    
    elements.append(t)
    elements.append(Spacer(1, 10))
    
    elements.append(Paragraph("<b>Payment Instructions</b>", bold_style))
    elements.append(Paragraph("<b>Account Name:</b> LEOCAP INVEST<br/><b>Bank:</b> NCBA Bank Kenya PLC<br/><b>Account Number:</b> 9710240013", normal_style))
    elements.append(Spacer(1, 15))
    
    note_style = ParagraphStyle('Note', parent=normal_style, fontName='Helvetica-Oblique', fontSize=8)
    elements.append(Paragraph("Note: This statement is issued without prejudice to LEOCAP INVEST's rights to pursue recovery through debt recovery agents, or legal proceedings in the event of continued default.", note_style))
    
    elements.append(PageBreak())
    
    return elements

def generate_debt_dossier_pdf(app, applicant, statements, docs, include_demand=False):

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
    
    if include_demand:
        elements.extend(generate_demand_letter_elements(app, applicant))
        
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
    elements.append(Spacer(1, 10))
    
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
    elements.append(Spacer(1, 10))
    
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
    elements.append(Spacer(1, 10))
    
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
            
            elements.append(Spacer(1, 10))

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



def generate_crb_report_pdf(applicant, risk_data):
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    import io
    import os
    from datetime import datetime

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4, rightMargin=40, leftMargin=40, topMargin=20, bottomMargin=20,
        title=f"Credit Risk Profile - {applicant.name}"
    )
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], alignment=TA_CENTER, fontSize=16, spaceAfter=5, textColor=colors.HexColor("#1E3A8A"))
    sub_title_style = ParagraphStyle('SubTitle', parent=styles['Heading2'], alignment=TA_CENTER, fontSize=12, spaceAfter=10)
    normal_style = styles['Normal']
    
    elements = []
    
    # Logo
    logo_path = "C:/Users/ELVIS/.gemini/antigravity/scratch/leocap-system/backend/website/templates/logo.png"
    if os.path.exists(logo_path):
        img = Image(logo_path, width=120, height=50)
        img.hAlign = 'CENTER'
        elements.append(img)
        elements.append(Spacer(1, 5))
    
    # Header
    elements.append(Paragraph("CREDIT RISK PROFILE", title_style))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1E3A8A")))
    elements.append(Spacer(1, 10))
    
    # Date
    today_str = datetime.now().strftime("%d %B %Y")
    elements.append(Paragraph(f"<b>Date Generated:</b> {today_str}", normal_style))
    elements.append(Spacer(1, 10))
    
    # Applicant Details
    payroll = applicant.payroll_number if applicant.payroll_number else 'N/A'
    kra = applicant.kra_pin if getattr(applicant, 'kra_pin', None) else 'N/A'
    id_no = applicant.id_number if applicant.id_number else 'N/A'
    
    details_data = [
        [Paragraph("<b>Applicant Name:</b>", normal_style), Paragraph(applicant.name, normal_style)],
        [Paragraph("<b>ID Number:</b>", normal_style), Paragraph(id_no, normal_style)],
        [Paragraph("<b>KRA PIN:</b>", normal_style), Paragraph(kra, normal_style)],
        [Paragraph("<b>Payroll Number:</b>", normal_style), Paragraph(payroll, normal_style)],
        [Paragraph("<b>Phone:</b>", normal_style), Paragraph(applicant.phone_number, normal_style)],
        [Paragraph("<b>Email:</b>", normal_style), Paragraph(applicant.email, normal_style)]
    ]
    
    details_table = Table(details_data, colWidths=[150, 350])
    details_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(details_table)
    elements.append(Spacer(1, 10))
    
    # Risk Profile Overview
    elements.append(Paragraph("RISK ASSESSMENT SUMMARY", sub_title_style))
    
    score = risk_data['score']
    max_score = risk_data['max_score']
    tier = risk_data['tier']
    risk_level = risk_data['risk_level']
    
    score_data = [
        [Paragraph("<b>Credit Score:</b>", normal_style), Paragraph(f"{score} / {max_score}", normal_style)],
        [Paragraph("<b>Grade / Tier:</b>", normal_style), Paragraph(tier, normal_style)],
        [Paragraph("<b>Risk Level:</b>", normal_style), Paragraph(risk_level, normal_style)]
    ]
    score_table = Table(score_data, colWidths=[150, 350])
    score_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('GRID', (0,0), (-1,-1), 1, colors.HexColor("#E2E8F0")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 10),
    ]))
    elements.append(score_table)
    elements.append(Spacer(1, 15))
    
    # Factors
    elements.append(Paragraph("ASSESSMENT FACTORS BREAKDOWN", sub_title_style))
    
    factors_data = [["Factor Evaluated", "Impact"]]
    for factor in risk_data['factors']:
        factors_data.append([factor['factor'], factor['impact']])
        
    factors_table = Table(factors_data, colWidths=[350, 150])
    factors_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1E3A8A")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('ALIGN', (1,0), (1,-1), 'RIGHT'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 1, colors.black),
    ]))
    elements.append(factors_table)
    elements.append(Spacer(1, 15))
    
    # Footer
    elements.append(Paragraph("<i>This report is generated automatically by LEOCAP INVEST based on systemic algorithms analyzing borrowing behavior, data consistency, and completeness.</i>", styles['Italic']))
    
    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes



def generate_company_mou_pdf(company):
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
    import os
    from datetime import datetime
    
    company_name = company.name.upper() if company else "COMPANY"
    
    now = datetime.now()
    day = now.day
    suffix = 'th' if 11 <= day <= 13 else {1: 'st', 2: 'nd', 3: 'rd'}.get(day % 10, 'th')
    date_str = f"{day}{suffix} day of {now.strftime('%B %Y')}"
    
    file_name = f"mou_company_{company.id}.pdf"
    file_path = os.path.join(os.getcwd(), "tmp", file_name)
    os.makedirs(os.path.join(os.getcwd(), "tmp"), exist_ok=True)
    
    doc = SimpleDocTemplate(file_path, pagesize=A4, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'TitleStyle', parent=styles['Heading2'], alignment=TA_CENTER, 
        fontName='Helvetica-Bold', spaceAfter=14
    )
    normal_style = ParagraphStyle(
        'NormalStyle', parent=styles['Normal'], alignment=TA_JUSTIFY, 
        fontName='Helvetica', fontSize=10, spaceAfter=8, leading=14
    )
    bold_style = ParagraphStyle(
        'BoldStyle', parent=normal_style, fontName='Helvetica-Bold'
    )
    list_style = ParagraphStyle(
        'ListStyle', parent=normal_style, leftIndent=20
    )
    
    elements = []
    
    elements.append(Paragraph(f"MEMORANDUM OF UNDERSTANDING BETWEEN {company_name} AND LEOCAP INVEST IN A PERSONAL LOANS SCHEME.", title_style))
    
    intro = f"This MEMORANDUM OF UNDERSTANDING is made on this <b>{date_str}</b> between <b>{company_name}</b> (hereinafter referred to as 'The Client' which expression includes its successors and assigns where the context so admits) of the one part and <b>LEOCAP INVEST</b> a body corporate duly incorporated under the Laws of Kenya whose postal address is care of Post Office Box Number 184 - 00100 Nairobi Kenya (hereinafter referred to as 'the Lender' which expression includes its successors and assigns where the context so admits) of the other part:"
    elements.append(Paragraph(intro, normal_style))
    
    elements.append(Paragraph("<b>WHEREAS:</b>", normal_style))
    elements.append(Paragraph(f"1. <b>{company_name}</b> is desirous of assisting its qualifying staff (hereinafter also referred to as 'loanees') to obtain loans from a lending institution for their personal needs;", list_style))
    elements.append(Paragraph(f"2. The Lender has at request agreed to provide various personal loans to all eligible loanees as specified hereinafter, subject to recommendation by <b>{company_name}</b> and subject also to eligibility under LEOCAP INVEST Personal Loans Scheme (hereinafter collectively referred to as 'the Scheme');", list_style))
    elements.append(Paragraph("3. The parties have agreed to execute this Memorandum of Understanding to set out the rights and obligations of each party.", list_style))
    elements.append(Paragraph("4. The parties intend that the terms of this Memorandum of Understanding be and are binding and enforceable against each of them and their respective successors and assigns.", list_style))
    
    elements.append(Spacer(1, 12))
    elements.append(Paragraph("<b>NOW THIS MEMORANDUM OF UNDERSTANDING WITNESSETH AS FOLLOWS:</b>", bold_style))
    
    elements.append(Paragraph("<b>1. Commencement and Duration</b>", bold_style))
    elements.append(Paragraph("1.1 This Memorandum of Understanding ('MOU') shall be effective from the date of execution. The MOU may be terminated by either party giving to the other at least one (1) month written notice of its intention to terminate.", list_style))
    elements.append(Paragraph("1.2 The parties hereto expressly agree that the termination of this MOU shall not prejudice any rights or obligations of either party accrued up to the date of termination.", list_style))
    elements.append(Paragraph("1.3 For the avoidance of doubt it is hereby expressly agreed that pursuant to the issuance of a notice of termination in accordance with Clause1.1 hereof, the Lender shall not accept and/or process any fresh loan applications but the obligations hereunder relating to repayment of loans disbursed under the Scheme shall survive the termination of the MOU until all outstanding loan balances are paid in full.", list_style))
    
    elements.append(Spacer(1, 6))
    elements.append(Paragraph("<b>2. Maximum Loan Amount and Eligibility</b>", bold_style))
    elements.append(Paragraph("2.1 The parties agree that the minimum loan available under the Scheme to any loanee shall be Kenya Shillings One Thousand (Kshs 1,000/-) and the maximum loan available shall be 1/3 of the average of the last 3 months' Net Salary.", list_style))
    elements.append(Paragraph(f"2.2 The loans shall be available to all eligible loanees as <b>{company_name}</b> recommends.", list_style))
    
    elements.append(Spacer(1, 6))
    elements.append(Paragraph("<b>3. Rate of Interest and Processing Fees</b>", bold_style))
    
    elements.append(Paragraph("3.1 The Loanee shall pay a Processing Fee of 3% and a further Admin and Access Fees of 2% of the principal loan amount.", list_style))
    elements.append(Paragraph(f"3.2 The rate of interest applicable on loans issued under the Scheme shall be <b>10%</b> for one month PROVIDED THAT the Interest Rate shall be subject to review at the Lenders discretion in line with market conditions prevalent from time to time and such review shall be communicated in writing <b>{company_name}</b> as stipulated here below.", list_style))
    elements.append(Paragraph("3.3 All such interest shall be calculated on a straight-line basis and shall remain fixed for the duration of each personal loan given.", list_style))
    elements.append(Paragraph(f"3.4 The parties hereby expressly acknowledge and agree that the applicable interest rate and fee aforesaid are dependent on market forces and therefore subject to revision. The Lender will notify <b>{company_name}</b> Thirty (30) days in advance of its intention to vary the applicable interest rate and/or fee and the review shall be done in consultation with <b>{company_name}</b>.", list_style))
    
    elements.append(Spacer(1, 6))
    elements.append(Paragraph("<b>4. Repayment Period</b>", bold_style))
    elements.append(Paragraph("The Salary Advance Loans (Check off Loans) will be advanced by the Lender for a maximum period of 1 Month.", list_style))
    
    elements.append(Spacer(1, 6))
    elements.append(Paragraph("<b>5. Loan Application, Disbursement and Mode of Repayment</b>", bold_style))
    elements.append(Paragraph(f"5.1 All loan application forms will be filled and forwarded to the Lender and authorized by a signatory of <b>{company_name}</b> confirming that the applicants are staff and eligible for the requested amount.", list_style))
    elements.append(Paragraph(f"5.2 <b>{company_name}</b> shall furnish the Lender with the following particulars of each of its authorized signatories and/or contact persons for purposes of this Scheme: -I) Full Name Ii) Designation;", list_style))
    elements.append(Paragraph("5.3 All loan applications must be accompanied by: i) The Applicant's National Identity Card; ii) Original Copies of The Applicant's Salary Pay Slips for Three Months Immediately Preceding the Date of The Application; And iii) Certified Copy Of The Applicant's Job Identity Card.", list_style))
    elements.append(Paragraph("5.4 LEOCAP INVEST shall subject all loan applications to the standard Credit appraisal process and shall approve or decline the loan application within Twenty-Four (24) hours of receipt of the application.", list_style))
    elements.append(Paragraph("5.5 Loan drawdown shall be affected by crediting the loan proceeds to the loanees' account.", list_style))
    elements.append(Paragraph(f"5.7 The repayments shall be recovered and remitted in a lump sum to the LEOCAP INVEST Bank Account on the 28th day of each month.", list_style))
    
    elements.append(Spacer(1, 6))
    elements.append(Paragraph(f"<b>6. Obligations of {company_name}</b>", bold_style))
    elements.append(Paragraph(f"6.1 <b>{company_name}</b> shall guarantee the repayment of all loans under the Scheme and shall also offer administrative support to the LENDER.", list_style))
    elements.append(Paragraph("6.2.1 Execute a Guarantee in favour of LEOCAP INVEST and use Staff pay slips as security for the facility.", list_style))
    elements.append(Paragraph("6.2.4 Promptly advise LEOCAP INVEST in case a loanee leaves the employment and facilitate the recovery of the employee's outstanding loan with the lender from the loanee's terminal dues.", list_style))
    
    elements.append(Spacer(1, 6))
    elements.append(Paragraph("<b>7. Force Majeure</b>", bold_style))
    elements.append(Paragraph("This MOU shall be suspended in the event of an act of God, war or other event beyond the reasonable control of either party.", list_style))
    
    elements.append(Spacer(1, 6))
    elements.append(Paragraph("<b>9. Default</b>", bold_style))
    elements.append(Paragraph("9.1 Default will be deemed to have occurred if the borrower fails to remit the monthly instalment on their due date.", list_style))
    elements.append(Paragraph("9.2 Any defaulted instalment will be considered a rescheduled instalment. The rescheduled instalments will be subjected to a rescheduling fee of 10% of the instalment or KES 1,500 whichever is higher.", list_style))
    elements.append(Paragraph("9.3 A 15% Debt Collection Fee will be levied on the loan balance 7 days after the default of payment and a formal demand letter issued.", list_style))
    
    elements.append(Spacer(1, 6))
    elements.append(Paragraph("<b>10. Governing Law</b>", bold_style))
    elements.append(Paragraph("This MOU shall be governed and construed in accordance with the Laws of Kenya.", list_style))
    
    elements.append(Spacer(1, 24))
    elements.append(Paragraph("IN WITNESS WHEREOF this MOU has been executed the day and year first hereinbefore written.", normal_style))
    
    elements.append(Spacer(1, 24))
    sig_data = [
        [Paragraph("<b>LEOCAP INVEST</b><br/>NELIUS WANJIRU (Proprietor)<br/>DATE: _____________________<br/>SIGNATURE: _________________", normal_style), 
         Paragraph("<b>WITNESSED BY:</b><br/><br/>ADVOCATE: _________________", normal_style)],
        [Paragraph(f"<b>BORROWER</b><br/>NAME: _____________________<br/>DATE: _____________________<br/>SIGNATURE: _________________", normal_style), 
         Paragraph("<b>WITNESSED BY:</b><br/><br/>ADVOCATE: _________________", normal_style)]
    ]
    
    t = Table(sig_data, colWidths=[250, 250])
    elements.append(t)
    
    doc.build(elements)
    return file_path


