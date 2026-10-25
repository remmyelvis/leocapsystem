import os

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import timedelta
from website.config import Config
from website.extensions import db, migrate


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    jwt = JWTManager(app)

    db.init_app(app)
    from website import system_email_utils
    system_email_utils.init_email_audit(app)
    migrate.init_app(app, db)

    os.makedirs(app.config["APPLICANT_DOCUMENTS"], exist_ok=True)
    os.makedirs(app.config["APPLICATION_DOCUMENTS"], exist_ok=True)
    os.makedirs(app.config["CONFIRMATION_DOCUMENTS"], exist_ok=True)

    CORS(app,
    origins=[
        "https://leocapinvest.co.ke",
        "https://www.leocapinvest.co.ke",
        "https://app.leocapinvest.co.ke",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ] + [o.strip() for o in os.getenv("CORS_EXTRA_ORIGINS", "").split(",") if o.strip()],
    supports_credentials=True,
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"]
    )

    # from .views import view
    from website.auth import auth
    from website.application import application
    from website.application_documents import documents
    from website.applicant import applicant
    from website.system_emails import email_bp
    from website.send_email import send_email_bp
    from website.applicant_documents import applicant_documents
    from website.reports import reports
    from website.company import company_bp, seed_default_companies
    from website.loan_calculator import loan_calc_bp
    from website.statement_service import statement_bp
    from website.cron import cron_bp

    app.register_blueprint(cron_bp)
    app.register_blueprint(auth)
    app.register_blueprint(application)
    app.register_blueprint(documents)
    app.register_blueprint(applicant)
    app.register_blueprint(email_bp)
    app.register_blueprint(send_email_bp)
    app.register_blueprint(applicant_documents)
    app.register_blueprint(reports)
    app.register_blueprint(company_bp)
    app.register_blueprint(loan_calc_bp)
    app.register_blueprint(statement_bp)

    from website.statement_analysis import statement_analysis_bp
    from website.dashboard import dashboard_bp
    from website.audit_logs import audit_logs
    app.register_blueprint(statement_analysis_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(audit_logs)

    from website.audit_hook import register_audit_hook
    register_audit_hook(app)

    if os.getenv("DEMO_MODE") == "True":  # the demo's own tools (who to sign in as, ...); the live API never routes to them
        from website.demo import demo_bp
        app.register_blueprint(demo_bp)

    # Ensure default companies exist within app context
    with app.app_context():
       try:
           seed_default_companies()
       except Exception:
           pass

    # Columns added to `applications` after the live database was created: add each once, so deploying needs no manual SQL
    # (db/04_disbursement_date.sql is the same change for running by hand)
    with app.app_context():
        from sqlalchemy import inspect, text
        # a brand-new database has no table yet: its tables are created with every column, so there is nothing to add
        for column, ddl in ((("employer_name", "VARCHAR(150)"), ("disbursement_date", "TIMESTAMP")) if inspect(db.engine).has_table("applications") else ()):
            try:
                if column not in {c["name"] for c in inspect(db.engine).get_columns("applications")}:
                    db.session.execute(text(f"ALTER TABLE applications ADD COLUMN {column} {ddl}"))
                    db.session.commit()
            except Exception:
                db.session.rollback()
                # another worker may have added it a moment ago; only complain if it is still missing
                if column not in {c["name"] for c in inspect(db.engine).get_columns("applications")}:
                    app.logger.exception("Could not add applications.%s", column)

    
    from flask import request, g
    from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity

    @app.before_request
    def set_tenant_context():
       g.tenant_company = None
       if request.method == "OPTIONS":
           return
           
       try:
           verify_jwt_in_request(optional=True)
           jwt = get_jwt()
           if jwt and jwt.get("role") in ["hr", "finance"]:
               from website.models import Applicant
               applicant_id = get_jwt_identity()
               if applicant_id:
                   applicant = Applicant.query.get(applicant_id)
                   if applicant:
                       g.tenant_company = applicant.applicant_type
       except Exception as e:
           pass

    return app
