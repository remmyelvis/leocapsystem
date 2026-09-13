import sys; sys.path.append('.')
from dotenv import load_dotenv
load_dotenv()
from app import app
from website.models import Application
with app.test_request_context('/api/applications/get-all'):
    from flask import g
    g.tenant_company = 'Nakama'
    try:
        print(len(Application.query.all()))
    except Exception as e:
        print("CRASH:", repr(e))
