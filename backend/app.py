import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from website import create_app
import logging

app = create_app()
print("LIVE DB_URL:", app.config.get("SQLALCHEMY_DATABASE_URI"), flush=True)

logging.basicConfig(
    filename='app.log',
    level=logging.DEBUG,
    format='%(asctime)s %(levelname)s %(message)s'
)

from flask import render_template, send_file
from website.models import Applicant
from website.statement_service import StatementPDFGenerator
from flask import render_template, send_file, send_from_directory
from flask_jwt_extended import create_access_token

FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist'))


@app.route('/debug-routes')
def debug_routes():
    rules = []
    for rule in app.url_map.iter_rules():
        rules.append(f"{rule} : {rule.methods}")
    return '<br>'.join(rules)

@app.route('/test-portal')
def test_portal():
    from website.models import User
    admin = User.query.filter_by(role="admin").first()
    admin_id = admin.id if admin else "admin-tester"
    admin_token = create_access_token(identity=admin_id, additional_claims={"role": "admin"})
    return render_template('index.html', admin_token=admin_token)

@app.route('/')
@app.route('/<path:path>')
def serve_frontend(path=""):
    # Avoid conflicting with API or test-portal routes
    if path.startswith('api/') or path.startswith('test-portal') or path.startswith('download-sample-statement'):
        return "Not found", 404
        
    if path != "" and os.path.exists(os.path.join(FRONTEND_DIST, path)):
        return send_from_directory(FRONTEND_DIST, path)
    return send_from_directory(FRONTEND_DIST, 'index.html')

@app.route('/download-sample-statement')
def download_sample_statement():
    with app.app_context():
        # Check if sample applicant in DB or generate on-the-fly
        applicant = Applicant.query.first()
        if not applicant:
            applicant = Applicant(
                id="sample-applicant-001",
                name="Jane Wanjiku Mwangi",
                id_number="31245678",
                kra_pin="A012345678Z",
                phone_number="+254712345678",
                email="jane.mwangi@example.com",
                role="applicant",
                applicant_type="nakama",
                payroll_number="NK-409",
                loan_limit=150000,
                interest_rate=10.0,
                created_at=datetime(2025, 1, 15)
            )
        pdf_buffer = StatementPDFGenerator.generate_statement_pdf(applicant)
        return send_file(
            pdf_buffer,
            mimetype="application/pdf",
            as_attachment=False,
            download_name="Sample_Statement_Jane_Mwangi.pdf"
        )

if __name__ == '__main__':
    with app.app_context():
        from website.extensions import db
        db.create_all()
    app.run(debug=False, port=5000)