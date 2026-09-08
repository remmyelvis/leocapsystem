import sys
sys.path.append(r'C:\Users\ELVIS\.gemini\antigravity\scratch\leocap-system\backend')
from website import create_app, db
from website.models import Application, User
from flask_jwt_extended import create_access_token
import traceback

app = create_app()

with app.app_context():
    app_record = Application.query.filter(Application.repayment_status.in_(['defaulted', 'escalated'])).first()
    admin_user = User.query.filter_by(role='admin').first()
    if not app_record:
        print("No defaulted or escalated loans found.")
    elif not admin_user:
        print("No admin user found.")
    else:
        print(f"Testing with application ID: {app_record.id}")
        with app.test_client() as client:
            token = create_access_token(identity=admin_user.id, additional_claims={"role": admin_user.role})
            try:
                res = client.get(f'/api/applications/escalate/{app_record.id}', headers={'Authorization': f'Bearer {token}'})
                print(f"Status: {res.status_code}")
                if res.status_code != 200:
                    print(res.get_data(as_text=True))
                else:
                    print("SUCCESS, bytes length:", len(res.data))
            except Exception as e:
                print("EXCEPTION:")
                traceback.print_exc()
