import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from uuid import uuid4
from datetime import datetime

from website import db
from website.models import Company, Application, ApplicationAudit, User, Applicant
from website.role_decorator import role_required, optional_claims

company_bp = Blueprint('company', __name__, url_prefix='/api')


def seed_default_companies():
    """Ensure default companies exist in database on startup."""
    default_companies = [
        {
            "name": "Nakama Tech LTD",
            "code": "nakama",
            "hr_email": os.getenv("HR_NAKAMA_EMAIL", "hr_nakama@example.com"),
            "interest_rate": 10.0,
            "processing_fee_rate": 3.0,
            "access_fee_rate": 0.0,
            "legal_fee": 0.0,
            "repayment_cycle": "monthly",
            "status": "active"
        },
        {
            "name": "Ideon Limited",
            "code": "ideon",
            "hr_email": os.getenv("HR_IDEON_EMAIL", "hr_ideon@example.com"),
            "interest_rate": 10.0,
            "processing_fee_rate": 3.0,
            "access_fee_rate": 0.0,
            "legal_fee": 0.0,
            "repayment_cycle": "monthly",
            "status": "active"
        },
        {
            "name": "Personal / Individual",
            "code": "personal",
            "hr_email": os.getenv("HR_PERSONAL_EMAIL", "loans@leocapinvest.co.ke"),
            "interest_rate": 10.0,
            "processing_fee_rate": 3.0,
            "access_fee_rate": 0.0,
            "legal_fee": 0.0,
            "repayment_cycle": "monthly",
            "status": "active"
        }
    ]

    for comp in default_companies:
        existing = Company.query.filter_by(code=comp["code"]).first()
        if not existing:
            new_comp = Company(
                id=str(uuid4()),
                name=comp["name"],
                code=comp["code"],
                hr_email=comp["hr_email"],
                interest_rate=comp["interest_rate"],
                processing_fee_rate=comp["processing_fee_rate"],
                access_fee_rate=comp["access_fee_rate"],
                legal_fee=comp["legal_fee"],
                repayment_cycle=comp["repayment_cycle"],
                status=comp["status"]
            )
            db.session.add(new_comp)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()


@company_bp.route('/companies', methods=['GET'])
def get_companies():
    """List companies for application onboarding and admin oversight."""
    # Anonymous callers (the sign-up page) only get active companies' id/name/code; bank and fee details are for signed-in users.
    signed_in = bool(optional_claims())
    show_all = signed_in and request.args.get('all', 'false').lower() == 'true'
    
    if show_all:
        companies = Company.query.order_by(Company.created_at.desc()).all()
    else:
        companies = Company.query.filter_by(status='active').order_by(Company.name.asc()).all()

    return jsonify({
        "success": True,
        "count": len(companies),
        "companies": [
            comp.to_dict() if signed_in else {"id": comp.id, "name": comp.name, "code": comp.code}
            for comp in companies
        ]
    }), 200


@company_bp.route('/companies/<identifier>', methods=['GET'])
@jwt_required()
def get_company(identifier):
    """Retrieve single company details by ID or code slug."""
    company = Company.query.filter(
        (Company.id == identifier) | (Company.code == identifier.lower())
    ).first()

    if not company:
        return jsonify({"message": f"Company '{identifier}' not found"}), 404

    return jsonify({
        "success": True,
        "company": company.to_dict()
    }), 200


@company_bp.route('/companies', methods=['POST'])
@jwt_required()
@role_required("admin", "super_admin", "finance")
def create_company():
    """Onboard a new company with custom HR contacts, interest rate, and fee policies."""
    data = request.get_json() or {}

    name = data.get('name', '').strip()
    code = data.get('code', '').strip().lower()

    if not name:
        return jsonify({"message": "Company name is required"}), 400

    if not code:
        # Auto-generate code slug from name
        code = name.lower().replace(' ', '_').replace('-', '_')
        code = ''.join(c for c in code if c.isalnum() or c == '_')

    # Check for duplicate code
    existing = Company.query.filter_by(code=code).first()
    if existing:
        return jsonify({"message": f"A company with code '{code}' already exists"}), 409

    try:
        new_company = Company(
            id=str(uuid4()),
            name=name,
            code=code,
            hr_email=data.get('hr_email'),
            contact_person=data.get('contact_person'),
            contact_phone=data.get('contact_phone'),
            interest_rate=float(data.get('interest_rate', 10.0)),
            processing_fee_rate=float(data.get('processing_fee_rate', 3.0)),
            access_fee_rate=float(data.get('access_fee_rate', 0.0)),
            legal_fee=float(data.get('legal_fee', 0.0)),
            repayment_cycle=data.get('repayment_cycle', 'monthly'),
            status=data.get('status', 'active'),
            bank_name=data.get('bank_name'),
            bank_account_number=data.get('bank_account_number'),
            bank_branch=data.get('bank_branch'),
            notes=data.get('notes')
        )

        db.session.add(new_company)
        
        # Auto-create HR user credentials if email provided
        hr_credentials = None
        hr_email = data.get('hr_email')
        if hr_email:
            import secrets, string
            from werkzeug.security import generate_password_hash
            from website.models import User
            
            existing_user = User.query.filter_by(email=hr_email).first()
            if not existing_user:
                alphabet = string.ascii_letters + string.digits
                generated_password = ''.join(secrets.choice(alphabet) for i in range(12))
                hashed_password = generate_password_hash(generated_password, method="pbkdf2:sha256")
                
                new_hr_user = User(
                    id=str(uuid4()),
                    name=data.get('contact_person') or f"{name} HR",
                    email=hr_email,
                    number=data.get('contact_phone') or "0000000000",
                    password=hashed_password,
                    role="hr"
                )
                db.session.add(new_hr_user)
                hr_credentials = {
                    "email": hr_email,
                    "password": generated_password,
                    "login_url": "http://app.leocapinvest.co.ke/login",
                    "role": "hr"
                }

        db.session.commit()
        
        response_data = {
            "success": True,
            "message": "Company created successfully",
            "company": new_company.to_dict()
        }
        if hr_credentials:
            response_data["hr_credentials"] = hr_credentials

        return jsonify(response_data), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Failed to create company", "error": str(e)}), 500


@company_bp.route('/companies/<identifier>', methods=['PATCH'])
@jwt_required()
@role_required("admin", "super_admin", "finance")
def update_company(identifier):
    """Update existing company settings."""
    company = Company.query.filter(
        (Company.id == identifier) | (Company.code == identifier.lower())
    ).first()

    if not company:
        return jsonify({"message": f"Company '{identifier}' not found"}), 404

    data = request.get_json() or {}

    if 'name' in data:
        company.name = data['name'].strip()
    if 'hr_email' in data:
        company.hr_email = data['hr_email'].strip()
    if 'contact_person' in data:
        company.contact_person = data['contact_person']
    if 'contact_phone' in data:
        company.contact_phone = data['contact_phone']
    if 'interest_rate' in data:
        company.interest_rate = float(data['interest_rate'])
    if 'processing_fee_rate' in data:
        company.processing_fee_rate = float(data['processing_fee_rate'])
    if 'access_fee_rate' in data:
        company.access_fee_rate = float(data['access_fee_rate'])
    if 'legal_fee' in data:
        company.legal_fee = float(data['legal_fee'])
    if 'repayment_cycle' in data:
        company.repayment_cycle = data['repayment_cycle']
    if 'status' in data:
        company.status = data['status']
    if 'bank_name' in data:
        company.bank_name = data['bank_name']
    if 'bank_account_number' in data:
        company.bank_account_number = data['bank_account_number']
    if 'bank_branch' in data:
        company.bank_branch = data['bank_branch']
    if 'notes' in data:
        company.notes = data['notes']

    try:
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Company '{company.name}' updated successfully",
            "company": company.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Failed to update company", "error": str(e)}), 500


@company_bp.route('/companies/<identifier>', methods=['DELETE'])
@jwt_required()
@role_required("admin", "super_admin")
def delete_company(identifier):
    """Deactivate / Soft-delete a company."""
    company = Company.query.filter(
        (Company.id == identifier) | (Company.code == identifier.lower())
    ).first()

    if not company:
        return jsonify({"message": f"Company '{identifier}' not found"}), 404

    try:
        company.status = "inactive"
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Company '{company.name}' deactivated successfully"
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Failed to deactivate company", "error": str(e)}), 500


@company_bp.route('/companies/<identifier>/paid', methods=['PATCH'])
@jwt_required()
@role_required("admin", "super_admin", "finance")
def mark_company_loans_as_paid(identifier):
    """Mark a month's unpaid, disbursed loans of any company as paid (?month=, default this month; ?dry_run=1 previews)."""
    from website.application import clear_company_month
    company = Company.query.filter(
        (Company.id == identifier) | (Company.code == identifier.lower())
    ).first()
    return clear_company_month(
        company.code if company else identifier.lower(),
        company.name if company else identifier,
        request.args.get("month"),
        dry_run=request.args.get("dry_run") in ("1", "true")
    )

@company_bp.route('/company/<string:company_id>/mou', methods=['GET'])
@jwt_required()
def download_company_mou(company_id):
    from website.export_service import generate_company_mou_pdf
    from flask import send_file
    company = Company.query.get(company_id)
    if not company:
        return jsonify({'error': 'Company not found'}), 404
        
    try:
        file_path = generate_company_mou_pdf(company)
        return send_file(file_path, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

import tempfile
from werkzeug.utils import secure_filename
from website.system_email_utils import send_audited
from flask import current_app

@company_bp.route('/companies/onboard/<string:company_id>', methods=['POST'])
@jwt_required()
@role_required("admin")
def onboard_company(company_id):
    company = Company.query.filter_by(id=company_id).first()
    if not company:
        return jsonify({"error": "Company not found"}), 404

    to_email = request.form.get("to_email", company.hr_email)
    subject = request.form.get("subject", "Partnership Proposal: LeoCap Check-Off Salary Advance")
    message = request.form.get("message", "Please find our proposal and MoU attached.")

    if not to_email:
        return jsonify({"error": "Destination email is required"}), 400

    attachment_paths = []
    temp_files = []
    
    # 1. Poster
    poster_path = os.path.join(current_app.root_path, "static", "assets", "check_off_poster.jpg")
    if os.path.exists(poster_path):
        attachment_paths.append(poster_path)

    # 2. Auto-generate MOU and Proposal
    from website.export_service import generate_company_mou_pdf, generate_company_proposal_pdf
    
    try:
        mou_path = generate_company_mou_pdf(company)
        if mou_path and os.path.exists(mou_path):
            attachment_paths.append(mou_path)
            temp_files.append(mou_path)
            
        proposal_path = generate_company_proposal_pdf(company)
        if proposal_path and os.path.exists(proposal_path):
            attachment_paths.append(proposal_path)
            temp_files.append(proposal_path)
    except Exception as e:
        print("Error generating documents:", str(e))

    try:
        ok, error = send_audited(to_email, subject, message, purpose="a company onboarding pack", entity_type="Company", entity_id=company.id, mask=False, isHrEmail=False, attachments=attachment_paths)
    except Exception as e:
        ok, error = False, str(e)
    finally:
        for t in temp_files:
            if os.path.exists(t):
                os.remove(t)

    if not ok:
        return jsonify({"error": f"The email was not sent: {error}"}), 500

    return jsonify({"message": "Onboarding email sent successfully"}), 200
