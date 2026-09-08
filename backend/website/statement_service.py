import io
import os
from datetime import datetime
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

from website.models import Applicant, Application, StatementEntry, Company
from website.role_decorator import role_required

statement_bp = Blueprint('statement', __name__, url_prefix='/api')


class StatementPDFGenerator:
    """Enterprise-grade ReportLab PDF Generator for Leocap Client Account Statements."""

    @staticmethod
    def generate_statement_pdf(applicant: Applicant, start_date=None, end_date=None) -> io.BytesIO:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=20 * mm,
            rightMargin=20 * mm,
            topMargin=15 * mm,
            bottomMargin=15 * mm
        )

        styles = getSampleStyleSheet()

        # Custom Palette
        c_primary = colors.HexColor("#0F2C59")      # Deep Navy
        c_secondary = colors.HexColor("#D97706")    # Rich Gold
        c_dark = colors.HexColor("#1E293B")         # Charcoal Dark
        c_light = colors.HexColor("#F8FAFC")        # Soft Ice
        c_border = colors.HexColor("#E2E8F0")       # Border Gray
        c_muted = colors.HexColor("#64748B")        # Slate Muted
        c_green = colors.HexColor("#16A34A")        # Emerald Green
        c_red = colors.HexColor("#DC2626")          # Crimson Red

        # Custom Typography
        title_style = ParagraphStyle(
            'CompanyTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=18,
            leading=22,
            textColor=c_primary,
            alignment=TA_LEFT
        )
        subtitle_style = ParagraphStyle(
            'SubTitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8,
            leading=11,
            textColor=c_muted,
            alignment=TA_LEFT
        )
        doc_header_style = ParagraphStyle(
            'DocHeader',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=13,
            leading=16,
            textColor=c_secondary,
            alignment=TA_RIGHT
        )
        meta_style = ParagraphStyle(
            'MetaText',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8,
            leading=11,
            textColor=c_muted,
            alignment=TA_RIGHT
        )
        card_label_style = ParagraphStyle(
            'CardLabel',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=10,
            textColor=c_muted
        )
        card_val_style = ParagraphStyle(
            'CardVal',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=12,
            textColor=c_dark
        )
        th_style = ParagraphStyle(
            'THStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=10,
            textColor=colors.white,
            alignment=TA_CENTER
        )
        td_style = ParagraphStyle(
            'TDStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8,
            leading=11,
            textColor=c_dark,
            alignment=TA_LEFT
        )
        td_num_style = ParagraphStyle(
            'TDNumStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8,
            leading=11,
            textColor=c_dark,
            alignment=TA_RIGHT
        )
        section_heading = ParagraphStyle(
            'SectionHeading',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=10,
            leading=13,
            textColor=c_primary
        )

        elements = []

        # ==========================================
        # 1. HEADER SECTION
        # ==========================================
        header_data = [
            [
                Paragraph("<b>LEOCAP INVESTMENTS</b>", title_style),
                Paragraph("ACCOUNT STATEMENT", doc_header_style)
            ],
            [
                Paragraph(
                    "Applewood Adams, Ngong Road, Nairobi, Kenya<br/>"
                    "Tel: +254 700 000 000 | Email: info@leocapinvest.co.ke<br/>"
                    "Web: https://leocapinvest.co.ke",
                    subtitle_style
                ),
                Paragraph(
                    f"<b>Statement Ref:</b> STMT-{applicant.id[:8].upper()}<br/>"
                    f"<b>Date Generated:</b> {datetime.now().strftime('%d %B %Y, %H:%M')}<br/>"
                    f"<b>Currency:</b> KES (Kenyan Shilling)",
                    meta_style
                )
            ]
        ]
        header_table = Table(header_data, colWidths=[3.2 * inch, 3.8 * inch])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 8))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=c_primary, spaceBefore=0, spaceAfter=8))

        # ==========================================
        # 2. BORROWER PROFILE & ACCOUNT SUMMARY CARDS
        # ==========================================
        company_name = applicant.applicant_type.upper() if applicant.applicant_type else "PERSONAL"
        company_rec = Company.query.filter_by(code=applicant.applicant_type).first()
        if company_rec:
            company_name = company_rec.name

        applicant_info = [
            [
                Paragraph("CUSTOMER NAME", card_label_style),
                Paragraph(applicant.name or "N/A", card_val_style),
                Paragraph("ID / PASSPORT NO.", card_label_style),
                Paragraph(applicant.id_number or "N/A", card_val_style),
            ],
            [
                Paragraph("PHONE NUMBER", card_label_style),
                Paragraph(applicant.phone_number or "N/A", card_val_style),
                Paragraph("KRA PIN", card_label_style),
                Paragraph(applicant.kra_pin or "N/A", card_val_style),
            ],
            [
                Paragraph("EMAIL ADDRESS", card_label_style),
                Paragraph(applicant.email or "N/A", card_val_style),
                Paragraph("COMPANY / PAYROLL", card_label_style),
                Paragraph(f"{company_name} ({applicant.payroll_number or 'N/A'})", card_val_style),
            ]
        ]
        info_table = Table(applicant_info, colWidths=[1.6 * inch, 2.0 * inch, 1.6 * inch, 1.8 * inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), c_light),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('BOX', (0, 0), (-1, -1), 0.5, c_border),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ]))

        elements.append(Paragraph("<b>BORROWER DETAILS</b>", section_heading))
        elements.append(Spacer(1, 4))
        elements.append(info_table)
        elements.append(Spacer(1, 10))

        # ==========================================
        # 3. STATEMENT ENTRIES (LEDGER) & TOTALS
        # ==========================================
        entries_query = StatementEntry.query.filter_by(applicant_id=applicant.id).order_by(StatementEntry.date.asc())
        entries = entries_query.all()

        total_debit = sum(float(e.debit or 0) for e in entries)
        total_credit = sum(float(e.credit or 0) for e in entries)
        current_balance = float(entries[-1].balance) if entries else 0.0

        # Financial Summary KPI Cards
        summary_cards = [
            [
                Paragraph("TOTAL BORROWED (DEBIT)", card_label_style),
                Paragraph("TOTAL REPAID (CREDIT)", card_label_style),
                Paragraph("CURRENT OUTSTANDING BALANCE", card_label_style),
                Paragraph("CREDIT LIMIT", card_label_style),
            ],
            [
                Paragraph(f"KES {total_debit:,.2f}", card_val_style),
                Paragraph(f"KES {total_credit:,.2f}", card_val_style),
                Paragraph(f"<b>KES {current_balance:,.2f}</b>", ParagraphStyle('Bal', parent=card_val_style, textColor=c_red if current_balance > 0 else c_green)),
                Paragraph(f"KES {float(applicant.loan_limit or 0):,.2f}", card_val_style),
            ]
        ]
        sum_table = Table(summary_cards, colWidths=[1.75 * inch, 1.75 * inch, 2.0 * inch, 1.5 * inch])
        sum_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('BOX', (0, 0), (-1, -1), 1, c_primary),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ]))

        elements.append(Paragraph("<b>FINANCIAL POSITION SUMMARY</b>", section_heading))
        elements.append(Spacer(1, 4))
        elements.append(sum_table)
        elements.append(Spacer(1, 12))

        # ==========================================
        # 4. ITEMIZED TRANSACTION LEDGER TABLE
        # ==========================================
        elements.append(Paragraph("<b>TRANSACTION HISTORY & LEDGER</b>", section_heading))
        elements.append(Spacer(1, 4))

        ledger_data = [
            [
                Paragraph("DATE", th_style),
                Paragraph("DESCRIPTION / MEMO", th_style),
                Paragraph("DEBIT (+)", th_style),
                Paragraph("CREDIT (-)", th_style),
                Paragraph("BALANCE", th_style)
            ]
        ]

        if entries:
            for idx, entry in enumerate(entries):
                entry_date = entry.date.strftime("%d-%b-%Y") if entry.date else "N/A"
                memo = entry.memo or "Transaction"
                debit_str = f"{float(entry.debit):,.2f}" if entry.debit and float(entry.debit) > 0 else "-"
                credit_str = f"{float(entry.credit):,.2f}" if entry.credit and float(entry.credit) > 0 else "-"
                balance_str = f"{float(entry.balance):,.2f}"

                ledger_data.append([
                    Paragraph(entry_date, td_style),
                    Paragraph(memo, td_style),
                    Paragraph(debit_str, td_num_style),
                    Paragraph(credit_str, td_num_style),
                    Paragraph(balance_str, td_num_style)
                ])
        else:
            ledger_data.append([
                Paragraph("-", td_style),
                Paragraph("No statement entries recorded for this account.", td_style),
                Paragraph("-", td_num_style),
                Paragraph("-", td_num_style),
                Paragraph("0.00", td_num_style)
            ])

        # Table styling
        ledger_table = Table(ledger_data, colWidths=[1.1 * inch, 2.7 * inch, 1.1 * inch, 1.1 * inch, 1.0 * inch])
        table_styles = [
            ('BACKGROUND', (0, 0), (-1, 0), c_primary),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('BOX', (0, 0), (-1, -1), 0.5, c_border),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ]

        # Alternating row colors
        for r_idx in range(1, len(ledger_data)):
            bg = c_light if r_idx % 2 == 1 else colors.white
            table_styles.append(('BACKGROUND', (0, r_idx), (-1, r_idx), bg))

        ledger_table.setStyle(TableStyle(table_styles))
        elements.append(ledger_table)
        elements.append(Spacer(1, 14))

        # ==========================================
        # 5. PAYMENT CLEARANCE INSTRUCTIONS & FOOTER
        # ==========================================
        footer_text = (
            "<b>PAYMENT & CLEARANCE INSTRUCTIONS:</b><br/>"
            "• Payments can be made directly via M-Pesa Paybill or Bank Transfer.<br/>"
            "• Please use your National ID Number as your Account Reference.<br/>"
            "• This statement is system-generated by Leocap Investments Management System and is valid without a physical signature.<br/>"
            "• For inquiries or dispute resolution, contact <b>support@leocapinvest.co.ke</b>."
        )
        footer_style = ParagraphStyle(
            'FooterNotes',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=7.5,
            leading=10.5,
            textColor=c_muted
        )

        elements.append(KeepTogether([
            HRFlowable(width="100%", thickness=0.5, color=c_border, spaceBefore=4, spaceAfter=6),
            Paragraph(footer_text, footer_style)
        ]))

        doc.build(elements)
        buffer.seek(0)
        return buffer


@statement_bp.route('/applicants/<applicant_id>/statement/pdf', methods=['GET'])
@jwt_required()
def download_applicant_statement(applicant_id):
    """Download official client account statement PDF for any applicant (Admin / Finance / Applicant)."""
    current_user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get('role', 'applicant')

    # Security check: applicant can only view their own statement unless admin/finance/hr
    if role == 'applicant' and current_user_id != applicant_id:
        return jsonify({"message": "Unauthorized access to another client's statement."}), 403

    applicant = Applicant.query.get(applicant_id)
    if not applicant:
        return jsonify({"message": "Applicant not found."}), 404

    try:
        pdf_buffer = StatementPDFGenerator.generate_statement_pdf(applicant)
        safe_name = (applicant.name or "Client").replace(" ", "_")
        filename = f"Statement_{safe_name}_{datetime.now().strftime('%Y%m%d')}.pdf"

        return send_file(
            pdf_buffer,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return jsonify({"message": "Failed to generate statement PDF", "error": str(e)}), 500


@statement_bp.route('/statements/my-statement/pdf', methods=['GET'])
@jwt_required()
def download_my_statement():
    """Download statement PDF for current authenticated applicant."""
    current_user_id = get_jwt_identity()
    applicant = Applicant.query.get(current_user_id)
    if not applicant:
        return jsonify({"message": "Applicant account not found."}), 404

    try:
        pdf_buffer = StatementPDFGenerator.generate_statement_pdf(applicant)
        safe_name = (applicant.name or "Client").replace(" ", "_")
        filename = f"My_Statement_{safe_name}_{datetime.now().strftime('%Y%m%d')}.pdf"

        return send_file(
            pdf_buffer,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return jsonify({"message": "Failed to generate statement PDF", "error": str(e)}), 500
