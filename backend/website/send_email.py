from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from website import db
from website.models import Email, Application, HrEmail, User
from website.system_email_utils import send_email_smtp
from website.role_decorator import role_required

send_email_bp = Blueprint('send_email_bp', __name__, url_prefix='/api/application')

@send_email_bp.route('/send-email/<string:email_id>', methods=['POST'])
@jwt_required()
@role_required("admin")
def send_email(email_id):

    email = Email.query.get_or_404(email_id)

    app = Application.query.get(email.application_id)

    attachments = [doc.filepath for doc in email.confirmation_documents]

    success, error = send_email_smtp(
        email.recipient,
        email.subject,
        email.confirmation_text,
        attachments=attachments,
        isHrEmail=False
    )

    if success:
        email.status = "sent"
    else:
        email.status = "failed"
        
    db.session.commit()

    return jsonify({
        "message": "Email sent",
        "email_id": email.id
    }), 202

@send_email_bp.route('/send-hr-email/<string:application_id>', methods=['POST'])
@jwt_required()
def send_hr_email(application_id):

    data = request.get_json()

    hr_user = User.query.filter_by(role = "hr").first()

    new_hr_email = HrEmail(
        application_id = application_id,
        recipient = hr_user.email_bp,
        subject = data.get('subject'),
        body = data.get('body')
    )

    success, error = send_email_smtp(
        new_hr_email.recipient,
        new_hr_email.subject,
        new_hr_email.body,
        isHrEmail=True
    )

    if success:
        new_hr_email.status = "sent"
    else:
        new_hr_email.status = "failed"

    db.session.add(new_hr_email)
    db.session.commit()

    return jsonify({
        "message": "Email sent",
        "email_id": new_hr_email.id
    }), 202