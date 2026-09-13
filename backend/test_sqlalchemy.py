import sys; sys.path.append('.')
from dotenv import load_dotenv
load_dotenv()
from app import app
from website.models import Application, db
from sqlalchemy.orm import ORMExecuteState
from sqlalchemy import event

with app.test_request_context('/'):
    stmt = db.select(Application)
    for desc in stmt.column_descriptions:
        print(desc['type'])
        print(desc['entity'])
