import os
from flask import Blueprint, request, jsonify, current_app, send_file
from werkzeug.utils import secure_filename
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from website import db
from website.models import ApplicantDocument, Applicant, Application, ApplicationDocument
from website.models import User
from website.config import Config
from website.role_decorator import role_required

documents = Blueprint("documents", __name__, url_prefix='/api/application')

@documents.route('/documents/<string:application_id>', methods=['POST'])
@jwt_required()
@role_required('applicant')
def upload_document(application_id):

    applicant_id = get_jwt_identity()

    applicant = Applicant.query.get(applicant_id)

    if not applicant:
        return {"error":"Applicant with provided id does not exist"}, 404

    if not application_id:
        return {"error":"application_id required"}, 400

    Application.query.get_or_404(application_id)

    data = request.form

    files = request.files.items()

    folder = os.path.join(current_app.config["APPLICATION_DOCUMENTS"], f"{applicant.name}_{application_id}")
    os.makedirs(folder, exist_ok=True)

    for field_name, file in files:
        valid, error = Config.validate_file(file)
        if not valid:
            return {"error": error}, 400

        filename = secure_filename(file.filename)
        unique_name = f"{applicant.name}_{field_name}_{filename}"

        filepath = os.path.join(folder, unique_name)

        existing_doc = ApplicationDocument.query.filter_by(
            application_id=application_id,
            filename=filename
        ).first()

        if os.path.exists(filepath) or existing_doc:
            continue

        file.save(filepath)

        doc = ApplicationDocument(
            application_id=application_id,
            filename=filename,
            filepath=filepath,
            document_passcode=request.form.get(f"{field_name}_passcode"),
            document_type=field_name,
            filetype=filename.rsplit(".", 1)[1]
        )

        db.session.add(doc)

    db.session.commit()

    return jsonify({
        "Message": "Documents uploaded successfully"
    }), 201

@documents.route("/documents/update-doc/<string:doc_id>", methods=["PUT"])
@jwt_required()
@role_required('applicant')
def update_document(doc_id):
    applicant_id = get_jwt_identity()

    applicant = Applicant.query.get_or_404(applicant_id)

    if not doc_id:
        return {"error":"document_id required"}, 400

    doc = ApplicationDocument.query.get_or_404(doc_id)

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
            current_app.config["APPLICATION_DOCUMENTS"],
            f"{applicant.name}_{doc.application_id}"
        )
        os.makedirs(folder, exist_ok=True)

        filepath = os.path.join(folder, unique_name)
        file.save(filepath)


        doc.filename = filename
        doc.filepath = filepath
        doc.filetype = filename.rsplit(".", 1)[1]

    db.session.commit()

    return jsonify(doc.to_dict())


@documents.route("/documents/get-by-application/<string:application_id>", methods=["GET"])
@jwt_required()
def get_documents_by_application(application_id):
    if not application_id:
        return {"error":"application_id required"}, 400

    docs = ApplicationDocument.query.filter_by(application_id=application_id).all()
    return jsonify([d.to_dict() for d in docs])

@documents.route("/documents/get-one/<string:doc_id>", methods=["GET"])
@jwt_required()
def get_document(doc_id):
    if not doc_id:
        return {"error":"document_id required"}, 400

    doc = ApplicationDocument.query.filter_by(id=doc_id).first()

    if doc is None:
        return {"error": "document not found"}, 404

    return jsonify(doc.to_dict())

@documents.route("/documents/download/<string:doc_id>", methods=["GET"])
@jwt_required()
def download_document(doc_id):
    if not doc_id:
        return {"error":"document_id required"}, 400

    doc = ApplicationDocument.query.get_or_404(doc_id)
    
    # ---------------------------
    # SECURITY PATCH: IDOR Protection
    # ---------------------------
    applicant_id = get_jwt_identity()
    role = get_jwt().get("role")
    
    if role not in ["admin"]:
        app_obj = Application.query.get(doc.application_id)
        if app_obj:
            if role in ["hr", "finance"]:
                current_user = Applicant.query.get(applicant_id)
                if not current_user or app_obj.company != current_user.applicant_type:
                    return {"error": "Unauthorized access to document"}, 403
            elif role == "applicant":
                if app_obj.applicant_id != applicant_id:
                    return {"error": "Unauthorized access to document"}, 403

    return send_file(doc.filepath, as_attachment=True)

@documents.route("/documents/delete/<string:doc_id>", methods=["DELETE"])
@jwt_required()
def delete_document(doc_id):

    doc = ApplicationDocument.query.get_or_404(doc_id)

    if os.path.exists(doc.filepath):
        os.remove(doc.filepath)

    db.session.delete(doc)
    db.session.commit()

    return {"message": "Document deleted"}
