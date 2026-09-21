path = "backend/website/company.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

endpoint_code = """
import tempfile
from werkzeug.utils import secure_filename
from website.system_email_utils import send_email_smtp
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

    # 2. Uploaded MOU and Proposal
    files_to_check = ["mou_file", "proposal_file"]
    for f_key in files_to_check:
        if f_key in request.files:
            file_obj = request.files[f_key]
            if file_obj and file_obj.filename != '':
                filename = secure_filename(file_obj.filename)
                # Save to a temporary file
                fd, temp_path = tempfile.mkstemp(suffix="_" + filename)
                os.close(fd)
                file_obj.save(temp_path)
                attachment_paths.append(temp_path)
                temp_files.append(temp_path)

    try:
        send_email_smtp(recipient=to_email, subject=subject, body=message, isHrEmail=False, attachments=attachment_paths)
    except Exception as e:
        for t in temp_files:
            if os.path.exists(t):
                os.remove(t)
        return jsonify({"error": str(e)}), 500

    # Cleanup temp files
    for t in temp_files:
        if os.path.exists(t):
            os.remove(t)

    return jsonify({"message": "Onboarding email sent successfully"}), 200
"""

content += endpoint_code

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched company.py with onboard endpoint.")
