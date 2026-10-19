from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
from functools import wraps
from flask import jsonify

def role_required(*roles):
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()

            claims = get_jwt()
            user_role = claims.get("role")

            if user_role not in roles:
                return jsonify({'error': 'You are not authorized to access this content'}), 403

            return fn(*args, **kwargs)
        return decorator
    return wrapper


def optional_claims():
    """JWT claims of the signed-in user, or {} for a visitor. A stale or invalid token counts as a visitor, so public
    pages (sign-up) don't answer 401/422, which the frontend reads as an ended session."""
    try:
        verify_jwt_in_request(optional=True)
        return get_jwt() or {}
    except Exception:
        return {}


def can_access_applicant(owner_id):
    """Admins: anyone. Everyone else: themselves. HR/finance: also applicants of their own company."""
    role = get_jwt().get("role")
    uid = get_jwt_identity()
    if role in ("admin", "super_admin") or owner_id == uid:
        return True
    if role in ("hr", "finance"):
        from website.models import Applicant
        owner, me = Applicant.query.get(owner_id), Applicant.query.get(uid)
        return bool(owner and me and owner.applicant_type == me.applicant_type)
    return False


def can_access_application(application):
    """Same rule for a loan: its owner, an admin, or HR/finance of the loan's company."""
    if get_jwt().get("role") in ("admin", "super_admin") or application.applicant_id == get_jwt_identity():
        return True
    return can_access_applicant(application.applicant_id)
