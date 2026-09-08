import sys
sys.path.append(r'C:\Users\ELVIS\.gemini\antigravity\scratch\leocap-system\backend')
from website import create_app, db
from website.models import Application
import json

app = create_app()

with app.app_context():
    apps = Application.query.all()
    print(f"Total Applications in DB: {len(apps)}")
