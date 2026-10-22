import string

from flask import Blueprint, request, jsonify, current_app, send_file, Response

from website.models import Applicant, Application, ApplicantDocument, Company
from website import db, Config

from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt, set_access_cookies

from website.role_decorator import role_required, optional_claims
from website.upload_paths import upload_path
from website import password_reset
from sqlalchemy import func
from website.system_email_utils import send_email_smtp
from dotenv import load_dotenv
load_dotenv()

import random, os
import pandas as pd
import secrets
import io
import csv
import uuid

applicant = Blueprint('applicant',__name__, url_prefix='/api/auth/applicant')

# What a person may change on their own profile. Loan limit, interest rate, company and status are not here:
# they are set by admins through their own routes.
PROFILE_FIELDS = ("name", "email", "phone_number", "id_number", "kra_pin", "payroll_number")


def _valid_name(name):
    """A name ends up in PDFs, emails and download file names: no path separators or control characters."""
    name = (name or "").strip()
    if not 2 <= len(name) <= 100 or any(c in "/\\" or ord(c) < 32 for c in name):
        return None
    return name


@applicant.route('/register', methods=['POST'])
def register():

    data = request.get_json()

    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Please provide both email and password'}), 400

    if Applicant.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'An account with this email already exists. Try signing in, or reset your password if you have forgotten it.'}), 409

    name = _valid_name(data.get('name'))
    if not name:
        return jsonify({'message': 'Please enter a valid name'}), 400

    # The company must be one of the active companies offered on the sign-up page
    company_code = str(data.get('applicant_type') or '').strip().lower()
    if not Company.query.filter_by(code=company_code, status='active').first():
        return jsonify({'message': 'Please select a valid company'}), 400

    hashed_password = generate_password_hash(data['password'])

    # Self-registration always creates a plain applicant; only a signed-in admin (manage-staff page) can create HR/finance staff
    role = 'applicant'
    if optional_claims().get('role') in ('admin', 'super_admin') and data.get('role') in ('hr', 'finance'):
        role = data['role']

    new_applicant = Applicant(
        name=name,
        phone_number=data.get('phone_number'),
        email=data.get('email'),
        password=hashed_password,
        applicant_type=company_code,
        role=role
    )

    db.session.add(new_applicant)
    db.session.commit()

    return jsonify({'message': 'Applicant created successfully',
                    'applicant':new_applicant.to_dict()}), 201

@applicant.route('/login', methods=['POST'])
def login():

    data = request.get_json()

    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Please provide both email and password'}), 400

    applicant = Applicant.query.filter_by(email=data['email']).first()

    if not applicant:
        return jsonify({'message': 'Applicant does not exist with provided email'}), 404

    if applicant.applicant_status == "suspended":
        return jsonify({'message': 'Your account was suspended, please contact your HR or system admin for more information'}), 404

    if not check_password_hash(applicant.password, data['password']):
        return jsonify({'message': 'Invalid credentials'}), 401

    access_token = create_access_token(
        identity=applicant.id,
        additional_claims={"role":applicant.role}
    )

    response = jsonify({
        'message': 'Logged in successfully',
        'applicant': applicant.to_dict()
    })

    set_access_cookies(response, access_token)

    return response, 200

@applicant.route('/get-applicant-details/<string:id>', methods=['GET'])
@jwt_required()
def get_applicant_details(id):
    from flask_jwt_extended import get_jwt_identity, get_jwt
    
    current_user_id = get_jwt_identity()
    role = get_jwt().get('role')
    
    if role == 'applicant' and current_user_id != id:
        return jsonify({'message': 'Unauthorized to view this applicant'}), 403

    applicant = Applicant.query.get(id)

    if not applicant:
        return jsonify({'message': 'Applicant does not exist'}), 404

    docs = ApplicantDocument.query.filter_by(applicant_id=applicant.id).all()


    response = jsonify({
        'message': 'Success',
        'applicant': applicant.to_dict(),
        'docs': [d.to_dict() for d in docs]
    })

    return response, 200

@applicant.route('/get-all-applicants', methods=['GET'])
@jwt_required()
@role_required("admin")
def get_all_applicant():

    applicants = Applicant.query.all()

    response = jsonify({
        'message': 'Success',
        'applicants': [app.to_dict() for app in applicants]
    })

    return response, 200


@applicant.route('/suspend/<string:id>', methods=['PATCH'])
@jwt_required()
@role_required("admin","hr")
def suspend(id):
    applicant = Applicant.query.get(id)

    if not applicant:
        return jsonify({'message': 'Applicant does not exist'}), 404

    apps = (
        Application.query
        .filter(Application.repayment_status=="unpaid", Application.applicant_id==applicant.id)
        .all()
    )

    if len(apps)>0:
        return jsonify({'message': 'Cannot suspend applicant with unpaid loans'}), 400

    applicant.applicant_status = "suspended"
    db.session.commit()

    return jsonify({'message': 'Applicant account suspended'}), 200
    
    
@applicant.route('/activate/<string:id>', methods=['PATCH'])
@jwt_required()
@role_required("admin","hr")
def activate(id):
    applicant = Applicant.query.get(id)

    if not applicant:
        return jsonify({'message': 'Applicant does not exist'}), 404

    applicant.applicant_status = "active"
    db.session.commit()

    return jsonify({'message': 'Applicant account reactivated'}), 200


@applicant.route('/delete/<string:id>', methods=['DELETE'])
@jwt_required()
@role_required("admin", "super_admin")
def delete(id):
    applicant = Applicant.query.get(id)

    if not applicant:
        return jsonify({'message': 'Applicant does not exist'}), 404

    # Deleting a person also erases their loans (and the repayment history), so an account with loans is suspended, not deleted.
    loans = Application.query.filter_by(applicant_id=id).count()
    if loans:
        return jsonify({'message': f"{applicant.name} has {loans} loan application{'s' if loans != 1 else ''} on record, so the account can't be deleted. Suspend it instead."}), 409

    # Uploaded statements (and their parsed rows) have no cascade, so they go first; their files are removed once the delete succeeds.
    from website.models import StatementUpload, ParsedTransaction
    statements = StatementUpload.query.filter_by(applicant_id=id).all()
    files = [s.filepath for s in statements] + [d.filepath for d in applicant.documents]
    try:
        ParsedTransaction.query.filter_by(applicant_id=id).delete()
        for s in statements:
            db.session.delete(s)
        db.session.delete(applicant)
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Could not delete applicant %s", id)
        return jsonify({'message': 'Could not delete this account. Nothing was changed.'}), 500

    for path in files:
        if path and os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass

    return jsonify({'message': 'Account deleted'}), 200

@applicant.route('/update/<string:id>', methods=['PATCH'])
@jwt_required()
@role_required("admin", "super_admin", "hr", "finance", "applicant")
def update(id):

    applicant = Applicant.query.get(id)

    if not applicant:
        return jsonify({'message': 'Applicant does not exist'}), 404

    # An admin may edit anyone; everyone else (applicant, HR, finance) only their own profile
    if get_jwt().get('role') not in ('admin', 'super_admin') and applicant.id != get_jwt_identity():
        return jsonify({'message': 'You are unauthorized to perform update'}), 403

    data = request.form

    # Check the profile fields before anything is saved
    changes = {}
    for key in PROFILE_FIELDS:
        if key not in data:
            continue
        value = data[key].strip()
        if key in ("name", "email", "phone_number") and not value:
            continue  # a form that sends one of these empty must not blank it
        if key == "name":
            value = _valid_name(value)
            if not value:
                return jsonify({'message': 'Please enter a valid name'}), 400
        if key == "email" and Applicant.query.filter(Applicant.email == value, Applicant.id != id).first():
            return jsonify({'message': 'Another account already uses this email'}), 409
        changes[key] = value

    for field_name,file in request.files.items():

        valid, error = Config.validate_file(file)
        if not valid:
            return {"error": error}, 400

        filename = secure_filename(file.filename)
        try:
            folder, filepath = upload_path(current_app.config["APPLICANT_DOCUMENTS"], applicant.id, field_name, filename)
        except ValueError:
            return {"error": "Invalid file name"}, 400
        os.makedirs(folder, exist_ok=True)

        existing_doc = ApplicantDocument.query.filter_by(
            applicant_id=id,
            filename=filename
        ).first()

        if os.path.exists(filepath) or existing_doc:
            continue
            
        # If they are uploading a new document for this type, delete the old one first
        old_docs = ApplicantDocument.query.filter_by(applicant_id=id, document_type=field_name).all()
        for old_d in old_docs:
            db.session.delete(old_d)
            if os.path.exists(old_d.filepath):
                try:
                    os.remove(old_d.filepath)
                except Exception:
                    pass

        file.save(filepath)

        doc = ApplicantDocument(
            applicant_id=id,
            filename=filename,
            filepath=filepath,
            document_type=field_name,
            filetype=filename.rsplit(".", 1)[1] if "." in filename else "unknown",
            status="pending"
        )

        db.session.add(doc)


    for key, value in changes.items():
        setattr(applicant, key, value)

    db.session.commit()

    return jsonify({
        'message': 'Applicant updated',
        'applicant': applicant.to_dict()
    }), 200

@applicant.route('/forgot-password', methods=['PUT'])
def forgot_password():
    """Email a reset link. The answer is the same whether or not the address has an account, so it cannot be used
    to find out who is registered."""
    data = request.get_json(silent=True) or {}
    email = str(data.get('email') or '').strip()
    if not email:
        return jsonify({'message': 'Please enter your email'}), 400

    account = Applicant.query.filter(func.lower(Applicant.email) == email.lower()).first()
    if account and account.applicant_status != 'suspended' and password_reset.may_send(account.email):
        password_reset.send_reset_email(account)

    return jsonify({'message': 'If an account exists for this email, a password reset link has been sent to it.'}), 200


@applicant.route('/reset-password', methods=['POST'])
def reset_password():
    """Set a new password from the link in the reset email (applicants, HR and finance)."""
    data = request.get_json(silent=True) or {}
    new_password = str(data.get('new_password') or '')
    if not 6 <= len(new_password) <= 128:
        return jsonify({'message': 'Password must be between 6 and 128 characters'}), 400

    account = password_reset.applicant_from_reset_token(str(data.get('token') or ''))
    if not account:
        return jsonify({'message': 'This reset link is invalid or has expired. Please request a new one.'}), 400

    account.password = generate_password_hash(new_password)
    db.session.commit()
    return jsonify({'message': 'Your password has been updated. You can now sign in.'}), 200




@applicant.route('/change-password', methods=['PUT'])
@jwt_required()
def change_password():

    user_id = get_jwt_identity()
    data = request.get_json()

    if not data:
        return jsonify({'message': 'No data provided'}), 400

    old_password = data.get('temp_password')
    new_password = data.get('new_password')
    confirm_new_password = data.get('confirm_new_password')

    if not old_password or not new_password or not confirm_new_password:
        return jsonify({
            'message': 'Please fill in all fields'
        }), 400

    if new_password != confirm_new_password:
        return jsonify({
            "message":"New passwords do not match"
        }), 400

    applicant = Applicant.query.get(user_id)

    if not applicant:
        return jsonify({'message': 'Applicant not found'}), 404

    # Verify old password
    if not check_password_hash(applicant.password, old_password):
        return jsonify({'message': 'Current password is incorrect'}), 401

    # Optional: prevent same password reuse
    if check_password_hash(applicant.password, new_password):
        return jsonify({
            'message': 'New password must be different'
        }), 400

    applicant.password = generate_password_hash(new_password)
    db.session.commit()

    return jsonify({
        'message': 'Password changed successfully'
    }), 200

@applicant.route('/loan-limit/<string:applicant_id>', methods=['PATCH'])
@jwt_required()
@role_required('admin')
def set_loan_limit(applicant_id):
    """Set the most an applicant may borrow in one application. Empty or 0 means no limit."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or 'loan_limit' not in data:
        return jsonify({'message': 'Please send a loan limit.'}), 400

    raw = data['loan_limit']
    try:
        limit = None if raw in (None, '') else int(str(raw).strip())
    except ValueError:
        limit = -1
    if limit is not None and not 0 <= limit < 1_000_000_000:
        return jsonify({'message': 'Please enter a whole number of shillings, 0 or more.'}), 400

    applicant = Applicant.query.get(applicant_id)

    if not applicant:
        return jsonify({'message': 'Applicant does not exist'}), 404

    applicant.loan_limit = limit or None

    db.session.commit()

    return jsonify({
        'message': 'Loan limit updated',
        'applicant': applicant.to_dict()
    }), 200

@applicant.route('/interest-rate/<string:id>', methods=['PATCH'])
@jwt_required()
@role_required('admin')
def set_interest_rate(id):
    data = request.get_json()
    applicant = Applicant.query.get(id)

    if not applicant:
        return jsonify({'message': 'Applicant does not exist'}), 404

    applicant.interest_rate = data['interest_rate']

    db.session.commit()

    return jsonify({
        'message': 'Interest rate updated',
        'applicant': applicant.to_dict()
    }), 200

@applicant.route('/bulk-upload', methods=['POST'])
@jwt_required()
@role_required('admin', 'hr')
def bulk_upload_employees():
    if 'file' not in request.files:
        return jsonify({'message': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400

    filename = file.filename.lower()
    if not (filename.endswith('.csv') or filename.endswith('.xlsx')):
        return jsonify({'message': 'Invalid file format. Please upload CSV or Excel'}), 400

    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(file)
        else:
            df = pd.read_excel(file)
    except Exception as e:
        return jsonify({'message': f'Error reading file: {str(e)}'}), 400

    required_columns = ['name', 'email', 'phone', 'id_number', 'company_code', 'payroll_number']
    
    missing_cols = [col for col in required_columns if col not in df.columns]
    if missing_cols:
        return jsonify({'message': f'Missing required columns: {", ".join(missing_cols)}'}), 400

    created = 0
    skipped_duplicates = 0
    errors = []
    credentials = []

    for index, row in df.iterrows():
        email = str(row['email']).strip() if pd.notna(row['email']) else ''
        name = str(row['name']).strip() if pd.notna(row['name']) else ''
        if not email or not name:
            errors.append({"row": index + 2, "error": "Missing required field: name or email"})
            continue
        name = _valid_name(name)
        if not name:
            errors.append({"row": index + 2, "error": "Invalid name (2-100 characters, no slashes)"})
            continue

        if Applicant.query.filter_by(email=email).first():
            skipped_duplicates += 1
            continue

        phone = str(row['phone']).strip() if pd.notna(row['phone']) else ''
        id_number = str(row['id_number']).strip() if pd.notna(row['id_number']) else None
        payroll_number = str(row['payroll_number']).strip() if pd.notna(row['payroll_number']) else None
        company_code = str(row['company_code']).strip() if pd.notna(row['company_code']) else ''

        raw_password = secrets.token_urlsafe(6)[:8]
        hashed_password = generate_password_hash(raw_password)

        new_applicant = Applicant(
            id=str(uuid.uuid4()),
            name=name,
            email=email,
            phone_number=phone,
            id_number=id_number,
            payroll_number=payroll_number,
            applicant_type=company_code,
            role='applicant',
            password=hashed_password,
            applicant_status='active'
        )
        
        db.session.add(new_applicant)
        created += 1
        credentials.append({
            "name": name,
            "email": email,
            "password": raw_password
        })

    db.session.commit()

    return jsonify({
        "success": True,
        "created": created,
        "skipped_duplicates": skipped_duplicates,
        "errors": errors,
        "credentials": credentials
    }), 200

@applicant.route('/bulk-upload/template', methods=['GET'])
def download_bulk_template():
    si = io.StringIO()
    cw = csv.writer(si)
    cw.writerow(['name', 'email', 'phone', 'id_number', 'company_code', 'payroll_number'])
    
    output = io.BytesIO()
    output.write(si.getvalue().encode('utf-8'))
    output.seek(0)
    
    # Bytes, not send_file(BytesIO): the host's Passenger file wrapper calls fileno() on the buffer and crashes.
    return Response(output.getvalue(), mimetype='text/csv', headers={"Content-Disposition": "attachment; filename=bulk_upload_template.csv"})
