import os
import re
import pytesseract
from PIL import Image
import threading
from flask import Blueprint, request, jsonify, current_app, send_file
from werkzeug.utils import secure_filename
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from website import db
from website.models import ApplicantDocument, Applicant, Application
from website.models import User
from website.config import Config
from website.role_decorator import role_required

applicant_documents = Blueprint("applicant_documents", __name__, url_prefix='/api/applicant')

@applicant_documents.route('/documents/<string:applicant_id>', methods=['POST'])
@jwt_required()
def upload_applicant_documents(applicant_id):

    applicant = Applicant.query.get(applicant_id)

    if not applicant:
        return {"error":"Applicant does not exist with provided id"}, 404
    
    files = request.files.items()
    
    folder = os.path.join(current_app.config["APPLICANT_DOCUMENTS"], f"{applicant.name}")
    os.makedirs(folder, exist_ok=True)

    for field_name, file in files:

        valid, error = Config.validate_file(file)
        if not valid:
            return {"error": error}, 400

        filename = secure_filename(file.filename)
        unique_name = f"{applicant.name}_{field_name}_{filename}"

        filepath = os.path.join(folder, unique_name)

        existing_doc = ApplicantDocument.query.filter_by(
            applicant_id=applicant_id,
            filename=filename
        ).first()

        if os.path.exists(filepath) or existing_doc:
            continue

        file.save(filepath)

        # [NEW] E-KYC OCR Verification for National ID
        ocr_match = None
        if "national id" in field_name.lower():
            try:
                img = Image.open(filepath)
                text = pytesseract.image_to_string(img)
                numbers = re.findall(r'\d{6,9}', text)
                if applicant.id_number and applicant.id_number in numbers:
                    ocr_match = True
                    print(f"E-KYC SUCCESS: Found ID {applicant.id_number} on document!")
                elif applicant.id_number:
                    ocr_match = False
                    print(f"E-KYC FAILED: ID {applicant.id_number} not found in {numbers}")
            except Exception as e:
                print(f"E-KYC Skipped (OCR Error): {e}")

        doc = ApplicantDocument(
            applicant_id=applicant_id,
            filename=filename,
            filepath=filepath,
            document_type=field_name,
            filetype=filename.rsplit(".", 1)[1]
        )

        db.session.add(doc)

    db.session.commit()

    return jsonify({
        "Message":"Documents uploaded successfully"
    }), 201

@applicant_documents.route("/documents/update-doc/<string:doc_id>", methods=["PUT"])
@jwt_required()
@role_required("applicant")
def update_applicant_document(doc_id):
    applicant_id = get_jwt_identity()

    applicant = Applicant.query.get_or_404(applicant_id)

    if not doc_id:
        return {"error":"document_id required"}, 400

    doc = ApplicantDocument.query.get_or_404(doc_id)

    if "file" in request.files:
        file = request.files["file"]

        valid, error = Config.validate_file(file)
        if not valid:
            return {"error": error}, 400

        if os.path.exists(doc.filepath):
            os.remove(doc.filepath)

        filename = secure_filename(file.filename)
        unique_name = f"{applicant.name}_{filename}"

        folder = os.path.join(
            current_app.config["APPLICANT_DOCUMENTS"],
            applicant.name
        )
        os.makedirs(folder, exist_ok=True)

        filepath = os.path.join(folder, unique_name)
        file.save(filepath)


        doc.filename = filename
        doc.filepath = filepath
        doc.filetype = filename.rsplit(".", 1)[1]

    db.session.commit()

    return jsonify(doc.to_dict())


@applicant_documents.route("/documents/get-by-applicant/<string:applicant_id>", methods=["GET"])
@jwt_required()
def get_documents_by_applicant(applicant_id):
    if not applicant_id:
        return {"error":"applicant_id required"}, 400

    docs = ApplicantDocument.query.filter_by(applicant_id=applicant_id).all()
    return jsonify([d.to_dict() for d in docs])

@applicant_documents.route("/documents/get-one/<string:doc_id>", methods=["GET"])
@jwt_required()
def get_applicant_document(doc_id):
    if not doc_id:
        return {"error":"document_id required"}, 400

    doc = ApplicantDocument.query.filter_by(id=doc_id).first()

    if doc is None:
        return {"error": "document not found"}, 404

    return jsonify(doc.to_dict())

@applicant_documents.route("/documents/download/<string:doc_id>", methods=["GET"])
@jwt_required()
def download_applicant_document(doc_id):
    if not doc_id:
        return {"error":"document_id required"}, 400

    doc = ApplicantDocument.query.get_or_404(doc_id)
    return send_file(doc.filepath, as_attachment=True)

@applicant_documents.route("/documents/delete/<string:doc_id>", methods=["DELETE"])
@jwt_required()
def delete_applicant_document(doc_id):

    doc = ApplicantDocument.query.get_or_404(doc_id)

    if os.path.exists(doc.filepath):
        os.remove(doc.filepath)

    db.session.delete(doc)
    db.session.commit()

    return {"message": "Document deleted"}
@applicant_documents.route('/documents/verify/<string:doc_id>', methods=['POST'])
@jwt_required()
@role_required("admin", "hr", "finance", "super_admin")
def verify_document(doc_id):
    from website.system_email_utils import send_email_smtp
    import os
    data = request.get_json()
    status = data.get('status')
    comment = data.get('comment', '')

    doc = ApplicantDocument.query.get(doc_id)
    if not doc:
        return jsonify({'error': 'Document not found'}), 404

    applicant = Applicant.query.get(doc.applicant_id)

    if status == 'rejected':
        # Delete file
        if os.path.exists(doc.filepath):
            try:
                os.remove(doc.filepath)
            except:
                pass
        
        # Send Email
        html_content = f"""
        <p>Dear {applicant.name},</p>
        <p>Your uploaded document (<strong>{doc.document_type}</strong>) has been reviewed and rejected.</p>
        <p><strong>Reason:</strong> {comment}</p>
        <p>Please log in to your portal and re-upload the correct document.</p>
        <p>Regards,<br>LeoCap Team</p>
        """
        try:
            send_email_smtp(applicant.email, "Document Rejected - Action Required", html_content)
        except Exception as e:
            print("Email failed", e)
            
        db.session.delete(doc)
        db.session.commit()
        return jsonify({'message': 'Document rejected and deleted'}), 200

    elif status == 'accepted':
        doc.status = 'accepted'
        doc.admin_comment = comment
        db.session.commit()
        return jsonify({'message': 'Document accepted'}), 200

    return jsonify({'error': 'Invalid status'}), 400
