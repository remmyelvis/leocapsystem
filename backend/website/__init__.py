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
    migrate.init_app(app, db)

    os.makedirs(app.config["APPLICANT_DOCUMENTS"], exist_ok=True)
    os.makedirs(app.config["APPLICATION_DOCUMENTS"], exist_ok=True)
    os.makedirs(app.config["CONFIRMATION_DOCUMENTS"], exist_ok=True)

    CORS(app,
    origins=[
        "https://leocapinvest.co.ke",
        "https://www.leocapinvest.co.ke",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
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

    from website.dashboard import dashboard_bp
    app.register_blueprint(dashboard_bp)

    # Ensure default companies exist within app context
    with app.app_context():
       try:
           seed_default_companies()
       except Exception:
           pass

    
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
