from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from website import db
from website.models import Email, Application, HrEmail, User
from website.system_email_utils import send_audited
from website.role_decorator import role_required

send_email_bp = Blueprint('send_email_bp', __name__, url_prefix='/api/application')

@send_email_bp.route('/send-email/<string:email_id>', methods=['POST'])
@jwt_required()
@role_required("admin")
def send_email(email_id):

    email = Email.query.get_or_404(email_id)

    app = Application.query.get(email.application_id)

    attachments = [doc.filepath for doc in email.confirmation_documents]

    success, error = send_audited(
        email.recipient,
        email.subject,
        email.confirmation_text,
        purpose="a saved email", entity_type="Application", entity_id=email.application_id,
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
