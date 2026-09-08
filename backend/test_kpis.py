import sys
sys.path.append(r'C:\Users\ELVIS\.gemini\antigravity\scratch\leocap-system\backend')
from website import create_app, db
from website.dashboard import get_dashboard_kpis
import json
from flask import Request

app = create_app()

with app.test_request_context('/api/dashboard/kpis'):
    res = get_dashboard_kpis()
    if isinstance(res, tuple):
        res, code = res
    if hasattr(res, 'get_json'):
        print(res.get_json())
    else:
        print(res)
