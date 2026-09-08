import  os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    JWT_SECRET_KEY = os.environ.get('SECRET_KEY', 'default-insecure-secret-key-for-dev-only')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=2)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_TOKEN_LOCATION = ["cookies", "headers"]
    JWT_COOKIE_SECURE = False
    JWT_ACCESS_COOKIE_PATH = "/"
    JWT_COOKIE_CSRF_PROTECT = False
    JWT_COOKIE_SECURE = True          # MUST be True for cross-origin cookies
    JWT_COOKIE_SAMESITE = "None"      # MUST be added to allow cross-origin

    db_url = os.environ.get('DATABASE_URL', '')
    SQLALCHEMY_DATABASE_URI = db_url

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    if "sqlite" in db_url:
        SQLALCHEMY_ENGINE_OPTIONS = {}
    else:
        SQLALCHEMY_ENGINE_OPTIONS = {
            'pool_size': 2,
            'max_overflow': 3,
            'pool_timeout': 30,
            'pool_recycle': 300,
            'pool_pre_ping': True,
        }

    APPLICANT_DOCUMENTS = os.path.join(BASE_DIR, "applicant_documents")
    APPLICATION_DOCUMENTS = os.path.join(BASE_DIR, "application_documents")
    CONFIRMATION_DOCUMENTS = os.path.join(BASE_DIR, "confirmation_documents")

    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10MB

    ALLOWED_EXTENSIONS = {"pdf", "xlsx", "xls"}

    ALLOWED_EXTENSIONS_FOR_CONFIRMATION = {"jpg", "png", "jpeg", "pdf"}


    @staticmethod
    def allowed_file(filename: str) -> bool:
        if "." not in filename:
            return False
        ext = filename.rsplit(".", 1)[1].lower()
        return ext in Config.ALLOWED_EXTENSIONS

    @staticmethod
    def validate_file(file) -> tuple[bool, str]:
        """
        Returns (is_valid, error_message)
        """
        if file.filename == "":
            return False, "Empty filename"

        if not Config.allowed_file(file.filename):
            return False, "Invalid file type"

        return True, ""

    @staticmethod
    def allowed_file_confirm(filename: str) -> bool:
        if "." not in filename:
            return False
        ext = filename.rsplit(".", 1)[1].lower()
        return ext in Config.ALLOWED_EXTENSIONS_FOR_CONFIRMATION

    @staticmethod
    def validate_file_confirm(file) -> tuple[bool, str]:
        """
        Returns (is_valid, error_message)
        """
        if file.filename == "":
            return False, "Empty filename"

        if not Config.allowed_file_confirm(file.filename):
            return False, "Invalid file type"

        return True, ""


