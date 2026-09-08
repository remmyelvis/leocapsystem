import sys
sys.path.append(r'C:\Users\ELVIS\.gemini\antigravity\scratch\leocap-system\backend')
from website import create_app, db
from website.models import Application
from flask_jwt_extended import create_access_token

app = create_app()

with app.app_context():
    app_record = Application.query.filter(Application.repayment_status.in_(['defaulted', 'escalated'])).first()
    if not app_record:
        print("No defaulted or escalated loans found.")
    else:
        print(f"Testing with application ID: {app_record.id}")
        # Need to mock a JWT or just use test_client
        with app.test_client() as client:
            token = create_access_token(identity="1")
            res = client.get(f'/api/applications/escalate/{app_record.id}', headers={'Authorization': f'Bearer {token}'})
            print(f"Status: {res.status_code}")
            if res.status_code != 200:
                print(res.get_data(as_text=True))
