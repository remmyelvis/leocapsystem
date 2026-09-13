import sys; sys.path.append('.')
from app import app
from website.models import Applicant, db
from flask import g

with app.app_context():
    g.tenant_company = "Nakama"
    try:
        a = Applicant.query.first()
        print(a.name)
    except Exception as e:
        print("Crash:", e)
