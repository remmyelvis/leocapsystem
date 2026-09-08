import sys
sys.path.append(r'C:\Users\ELVIS\.gemini\antigravity\scratch\leocap-system\backend')
from website import create_app
from website.models import Applicant, User
from flask_jwt_extended import create_access_token

app = create_app()

with app.app_context():
    app_record = Applicant.query.first()
    admin_user = User.query.filter_by(role='admin').first()
    if not app_record:
        print("No applicant found.")
    else:
        print(f"Testing with applicant ID: {app_record.id}")
        with app.test_client() as client:
            token = create_access_token(identity=admin_user.id, additional_claims={"role": admin_user.role})
            res = client.get(f'/api/applicants/{app_record.id}/risk-profile', headers={'Authorization': f'Bearer {token}'})
            print(f"Status: {res.status_code}")
            print(res.get_data(as_text=True))
