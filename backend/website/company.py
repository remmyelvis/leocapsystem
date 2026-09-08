import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from uuid import uuid4
from datetime import datetime

from website import db
from website.models import Company, Application, ApplicationAudit, User, Applicant
from website.role_decorator import role_required

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
    show_all = request.args.get('all', 'false').lower() == 'true'
    
    if show_all:
        companies = Company.query.order_by(Company.created_at.desc()).all()
    else:
        companies = Company.query.filter_by(status='active').order_by(Company.name.asc()).all()

    return jsonify({
        "success": True,
        "count": len(companies),
        "companies": [comp.to_dict() for comp in companies]
    }), 200


@company_bp.route('/companies/<identifier>', methods=['GET'])
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
    """Batch-mark all active disbursed loans for any company as paid."""
    company = Company.query.filter(
        (Company.id == identifier) | (Company.code == identifier.lower())
    ).first()

    comp_code = company.code if company else identifier.lower()
    comp_name = company.name if company else identifier

    claims = get_jwt()
    changed_by_email = claims.get('email', 'admin@leocapinvest.co.ke')
    changed_by_role = claims.get('role', 'admin')

    month = request.args.get('month', datetime.now().strftime("%B"))

    applications = Application.query.filter(
        Application.company == comp_code,
        Application.repayment_status == "unpaid",
        Application.loan_status == "disbursed",
        Application.month == month
    ).all()

    if not applications:
        return jsonify({
            "message": f"No unpaid disbursed applications found for {comp_name} in {month}."
        }), 404

    updated_count = 0
    for app in applications:
        old_status = app.repayment_status
        app.repayment_status = "paid"
        updated_count += 1

        audit = ApplicationAudit(
            id=str(uuid4()),
            application_id=app.id,
            field_name="repayment_status",
            old_status=old_status,
            new_status="paid",
            application_old_loan_amount=float(app.amount_applied or 0),
            application_new_loan_amount=float(app.amount_applied or 0),
            application_old_repayment_amount=float(app.repayment_amount or 0),
            application_new_repayment_amount=float(app.repayment_amount or 0),
            changed_by_email=changed_by_email,
            changed_by_role=changed_by_role,
            changed_by_company=comp_name,
            notes=f"Batch payroll clearance for {comp_name} - {month}"
        )
        db.session.add(audit)

    try:
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Successfully marked {updated_count} {comp_name} loans as paid for {month}.",
            "count": updated_count,
            "company": comp_name,
            "month": month
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Failed to update loan repayment status", "error": str(e)}), 500

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
