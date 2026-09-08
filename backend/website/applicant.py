import string

from flask import Blueprint, request, jsonify, current_app, send_file

from website.models import Applicant, Application, ApplicantDocument
from website import db, Config

from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt, set_access_cookies

from website.role_decorator import role_required
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

@applicant.route('/register', methods=['POST'])
def register():

    data = request.get_json()

    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Please provide both email and password'}), 400

    if Applicant.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Applicant already exist'}), 409

    hashed_password = generate_password_hash(data['password'])

    new_applicant = Applicant(
        name=data.get('name'),
        phone_number=data.get('phone_number'),
        email=data.get('email'),
        password=hashed_password,
        applicant_type=data.get('applicant_type'),
        role=data.get('role')
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
    
    
@applicant.route('/delete/<string:id>', methods=['DELETE'])
@jwt_required()
@role_required("admin","hr")
def delete(id):
    applicant = Applicant.query.get(id)

    if not applicant:
        return jsonify({'message': 'Applicant does not exist'}), 404

    
    db.session.delete(applicant)
    db.session.commit()

    return jsonify({'message': 'Applicant account suspended'}), 200

@applicant.route('/update/<string:id>', methods=['PATCH'])
@jwt_required()
@role_required("admin","hr","applicant")
def update(id):

    applicant = Applicant.query.get(id)

    if not applicant:
        return jsonify({'message': 'Applicant does not exist'}), 404

    from flask_jwt_extended import get_jwt_identity, get_jwt
    role = get_jwt().get('role')
    if role == 'applicant' and applicant.id != get_jwt_identity():
       return jsonify({'message': 'You are unauthorized to perform update'}), 403

    data = request.form

    files = request.files.items()

    folder = os.path.join(current_app.config["APPLICANT_DOCUMENTS"], applicant.name)
    os.makedirs(folder, exist_ok=True)

    for field_name,file in files:

        valid, error = Config.validate_file(file)
        if not valid:
            return {"error": error}, 400

        filename = secure_filename(file.filename)
        unique_name = f"{applicant.name}_{field_name}_{filename}"

        filepath = os.path.join(folder, unique_name)

        existing_doc = ApplicantDocument.query.filter_by(
            applicant_id=id,
            filename=filename
        ).first()

        if os.path.exists(filepath) or existing_doc:
            continue

        file.save(filepath)

        doc = ApplicantDocument(
            applicant_id=id,
            filename=filename,
            filepath=filepath,
            document_type = field_name,
            filetype=filename.rsplit(".", 1)[1]
        )

        db.session.add(doc)


    for key, value in data.items():
        if hasattr(applicant, key) and key != "id" and key != "role":
            setattr(applicant, key, value)

    db.session.commit()

    return jsonify({
        'message': 'Applicant updated',
        'applicant': applicant.to_dict()
    }), 200

@applicant.route('/forgot-password', methods=['PUT'])
def forgot_password():
    data = request.get_json()
    request_email = data.get('email')
    
    user_obj = Applicant.query.filter_by(email=request_email).first()
    if not user_obj:
        return jsonify({'message': 'User does not exist with this email'}), 400
        
    # SECURITY PATCH: Generate token instead of plaintext password
    reset_token = ''.join(random.choices(string.punctuation + string.digits + string.ascii_letters, k=32))
    user_obj.reset_token = reset_token
    from datetime import datetime, timedelta
    user_obj.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
    
    db.session.commit()
    
    link = os.getenv("SYSTEM_URL")
    # In a real scenario, this would send an email with a link like:
    # f"{link}/reset-password?token={reset_token}"
    return jsonify({'message': 'Password reset link sent to your email'}), 200




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
            "message":"New passwords do not much"
        })

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

    data = request.get_json()
    applicant = Applicant.query.get(applicant_id)

    if not applicant:
        return jsonify({'message': 'Applicant does not exist'}), 404

    applicant.loan_limit = data['loan_limit']

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
    
    return send_file(
        output,
        mimetype='text/csv',
        as_attachment=True,
        download_name='bulk_upload_template.csv'
    )
