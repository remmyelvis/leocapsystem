import os

from flask import Blueprint, request, jsonify, current_app, send_file
from werkzeug.utils import secure_filename
from flask_jwt_extended import jwt_required, get_jwt_identity
from uuid import uuid4

from website.models import Application, ConfirmationDocument, User, Email, Applicant, HrEmail
from website.system_email_utils import send_email_smtp
from website import db, Config
from website.role_decorator import role_required

email_bp = Blueprint('email', __name__, url_prefix='/api/application')

@email_bp.route('/emails/create-email/<string:application_id>', methods=['POST'])
@jwt_required()
@role_required('admin')
def create_email(application_id):
    user_id = get_jwt_identity()
    User.query.get_or_404(user_id)

    if not application_id:
        return {"error": "application_id required"}, 400

    app = Application.query.get_or_404(application_id)
    applicant = Applicant.query.get_or_404(app.applicant_id)

    # ----------------------------
    # FORM DATA (TEXT FIELDS)
    # ----------------------------
    form = request.form

    subject = form.get("subject")
    custom_body = form.get("confirmation_text")  # optional override

    email_id = str(uuid4())

    body = custom_body

    new_email = Email(
        id=email_id,
        application_id=application_id,
        confirmation_text=body,
        recipient=applicant.email,
        subject=subject,
        status="pending"
    )

    db.session.add(new_email)

    # ----------------------------
    # FILE UPLOADS (MULTIPART)
    # ----------------------------
    files = request.files.getlist("files")

    attachments = []

    if files:
        folder = os.path.join(
            current_app.config["CONFIRMATION_DOCUMENTS"],
            f"{applicant.name}_{email_id}"
        )
        os.makedirs(folder, exist_ok=True)

        for file in files:
            valid, error = Config.validate_file_confirm(file)
            if not valid:
                return {"error": error}, 400

            filename = secure_filename(file.filename)
            unique_name = f"{applicant.name}_{filename}"
            filepath = os.path.join(folder, unique_name)

            existing_doc = ConfirmationDocument.query.filter_by(
                email_id=email_id,
                filename=filename
            ).first()

            if os.path.exists(filepath) or existing_doc:
                continue

            file.save(filepath)
            attachments.append(filepath)

            doc = ConfirmationDocument(
                email_id=email_id,
                filename=filename,
                filepath=filepath,
                filetype=filename.rsplit(".", 1)[1]
            )
            db.session.add(doc)

    # ----------------------------
    # SEND EMAIL
    # ----------------------------
    success, error = send_email_smtp(
        new_email.recipient,
        new_email.subject,
        new_email.confirmation_text,
        attachments=attachments,
        isHrEmail=False
    )

    new_email.status = "sent" if success else "failed"

    db.session.commit()

    return jsonify({
        "message": "Email created successfully",
        "email": new_email.to_dict()
    }), 201
    
    
@email_bp.route('/emails/get-email/<string:email_id>', methods=['GET'])
@jwt_required()
def get_email(email_id):
    if not email_id:
        return {"error":"Email id required"}, 400

    email = Email.query.get_or_404(email_id)

    response = {
        "email": {
            "id": email.id,
            "application_id": email.application_id,
            "recipient": email.recipient,
            "subject": email.subject,
            "confirmation_text": email.confirmation_text,
            "status": email.status,
            "documents": [
                {
                    "name": doc.filename,
                    "url": doc.filepath
                }
                for doc in email.confirmation_documents
            ]

    }
    }

    return jsonify(response), 200

@email_bp.route('/emails/get-emails-per-application/<string:application_id>', methods=['GET'])
@jwt_required()
def get_emails_per_application(application_id):
    if not application_id:
        return {"error":"Email id required"}, 400

    emails = Email.query.filter_by(application_id=application_id).all()
    return jsonify([e.to_dict() for e in emails])

@email_bp.route('/emails/get-hr-email/<string:email_id>', methods=['GET'])
@jwt_required()
def get_hr_email(email_id):
    if not email_id:
        return {"error":"Email id required"}, 400

    email = HrEmail.query.get_or_404(email_id)

    return jsonify(email.to_dict()), 200

@email_bp.route('/emails/get-hr-emails-per-application/<string:application_id>', methods=['GET'])
@jwt_required()
def get_hr_emails_per_application(application_id):
    if not application_id:
        return {"error":"Email id required"}, 400

    emails = HrEmail.query.filter_by(application_id=application_id).all()
    return jsonify([e.to_dict() for e in emails])


@email_bp.route('/emails/delete-email/<string:email_id>', methods=['DELETE'])
@jwt_required()
def delete_email(email_id):
    if not email_id:
        return {"error": "Email id required"}, 400

    email = Email.query.get_or_404(email_id)

    db.session.delete(email)
    db.session.commit()

    return {"message": "Email deleted"}, 200


@email_bp.route('/emails/edit-email/<string:email_id>', methods=['PATCH'])
@jwt_required()
@role_required("admin")
def edit_email(email_id):
    if not email_id:
        return {"error": "Email id required"}, 400

    email = Email.query.get(email_id)

    app = Application.query.get(email.application_id)

    applicant = Applicant.query.get(app.applicant_id)

    data = request.form

    if "files" in request.files:
        files = request.files.getlist("files")

        folder = os.path.join(current_app.config["CONFIRMATION_DOCUMENTS"], f"{applicant.name}_{email_id}")
        os.makedirs(folder, exist_ok=True)

        for file in files:
            valid, error = Config.validate_file_confirm(file)
            if not valid:
                return {"error": error}, 400

            filename = secure_filename(file.filename)
            unique_name = f"{applicant.name}_{filename}"

            filepath = os.path.join(folder, unique_name)

            existing_doc = ConfirmationDocument.query.filter_by(
                email_id=email_id,
                filename=filename
            ).first()

            if os.path.exists(filepath) or existing_doc:
                continue

            file.save(filepath)

            doc = ConfirmationDocument(
                email_id=email_id,
                filename=filename,
                filepath=filepath,
                filetype=filename.rsplit(".", 1)[1]
            )

            db.session.add(doc)

    for key, value in data.items():
        if hasattr(email, key) and key != id and key != "application_id":
            setattr(email, key, value)
    db.session.commit()

    return jsonify({
        'message': 'Email updated',
        'email': email.to_dict()
    }), 200


@email_bp.route('/emails/confirmation-document/<string:email_id>', methods=['POST'])
@jwt_required()
@role_required('admin')
def upload_confirmation_document(email_id):
    user_id = get_jwt_identity()

    User.query.get(user_id)

    if not email_id:
        return {"error":"Email id required"}, 400

    email = Email.query.get(email_id)

    app = Application.query.get(email.application_id)

    applicant = Applicant.query.get(app.applicant_id)

    if "files" in request.files:
        files = request.files.getlist("files")

        folder = os.path.join(current_app.config["CONFIRMATION_DOCUMENTS"], f"{applicant.name}_{email_id}")
        os.makedirs(folder, exist_ok=True)

        for file in files:
            valid, error = Config.validate_file_confirm(file)
            if not valid:
                return {"error": error}, 400

            filename = secure_filename(file.filename)
            unique_name = f"{applicant.name}_{filename}"

            filepath = os.path.join(folder, unique_name)

            existing_doc = ConfirmationDocument.query.filter_by(
                email_id=email_id,
                filename=filename
            ).first()

            if os.path.exists(filepath) or existing_doc:
                continue

            file.save(filepath)

            doc = ConfirmationDocument(
                email_id=email_id,
                filename=filename,
                filepath=filepath,
                filetype=filename.rsplit(".", 1)[1]
            )

            db.session.add(doc)
    db.session.commit()

    return jsonify({
        "Message": "Documents uploaded successfully"
    }), 201

@email_bp.route("/emails/confirmation-document/get-by-email/<string:email_id>", methods=["GET"])
@jwt_required()
def get_documents_by_email(email_id):
    if not email_id:
        return {"error":"email id required"}, 400

    docs = ConfirmationDocument.query.filter_by(email_id=email_id).all()
    return jsonify([d.to_dict() for d in docs])

@email_bp.route("/emails/confirmation-document/get-one/<string:doc_id>", methods=["GET"])
@jwt_required()
def get_confirmation_document(doc_id):
    if not doc_id:
        return {"error":"document_id required"}, 400

    doc = ConfirmationDocument.query.filter_by(id=doc_id).first()

    if doc is None:
        return {"error": "document not found"}, 404

    return jsonify(doc.to_dict())

@email_bp.route("/emails/confirmation-document/download/<string:doc_id>", methods=["GET"])
@jwt_required()
def download_confirmation_document(doc_id):
    if not doc_id:
        return {"error":"document_id required"}, 400

    doc = ConfirmationDocument.query.get_or_404(doc_id)
    return send_file(doc.filepath, as_attachment=True)

@email_bp.route("/emails/confirmation-document/delete/<string:doc_id>", methods=["DELETE"])
@jwt_required()
@role_required("admin")
def delete_confirmation_document(doc_id):
    user_id = get_jwt_identity()

    User.query.get_or_404(user_id)

    if not doc_id:
        return {"error": "Document id required"}, 400

    doc = ConfirmationDocument.query.get_or_404(doc_id)

    if os.path.exists(doc.filepath):
        os.remove(doc.filepath)

    email = Email.query.get_or_404(doc.email_id)

    app = Application.query.get_or_404(email.application_id)

    app.loan_status = "processing"

    db.session.delete(doc)
    db.session.commit()

    return {"message": "Document deleted"}