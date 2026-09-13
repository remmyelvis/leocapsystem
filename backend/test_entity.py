import sys; sys.path.append('.')
from app import app
from website.models import Applicant, db
from flask import g
from sqlalchemy.orm import ORMExecuteState
from sqlalchemy import event

@event.listens_for(db.session, 'do_orm_execute')
def intercept(execute_state: ORMExecuteState):
    if execute_state.is_select:
        for entity in execute_state.statement.get_select_entities():
            entity_class = getattr(entity, 'class_', None)
            print("Intercepted:", entity_class)

with app.app_context():
    g.tenant_company = "Nakama"
    Applicant.query.first()
