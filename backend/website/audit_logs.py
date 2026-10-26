from datetime import datetime, time, timedelta, timezone
from flask import Blueprint, request, jsonify, g, has_request_context
from sqlalchemy import cast, or_, String
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from website import db
from website.models import AuditLog, AuditAction, User, Applicant
from website.role_decorator import role_required

audit_logs = Blueprint('audit_logs', __name__, url_prefix='/api/audit-logs')

RETENTION_DAYS = 30  # logs newer than this cannot be deleted


def _get_actor_info():
    """Extract actor identity, email, and role from JWT claims or database."""
    try:
        identity = get_jwt_identity()
    except Exception:
        identity = None

    if not identity:
        return "anonymous", None, None

    claims = get_jwt() or {}
    role = claims.get("role")
    email = None

    # Check User (admin / staff)
    user = User.query.get(identity)
    if user:
        email = user.email
        role = role or user.role
        return user.id, email, role

    # Check Applicant
    app_user = Applicant.query.get(identity)
    if app_user:
        email = app_user.email
        role = role or app_user.role
        return app_user.id, email, role

    return str(identity), email, role


def _record_audit_log(
    action: AuditAction,
    description: str,
    entity_type: str = "AuditLog",
    entity_id: str = None,
    actor_id: str = None,
    actor_email: str = None,
    actor_role: str = None,
    old_values: dict = None,
    new_values: dict = None,
    status: str = "success",
    error_message: str = None,
    endpoint: str = None,
    http_method: str = None,
    commit: bool = False
):
    """Helper to instantiate and optionally commit an AuditLog entry."""
    resolved_endpoint = endpoint or request.path
    resolved_method = http_method or request.method

    log_entry = AuditLog(
        action=action,
        description=description,
        endpoint=resolved_endpoint,
        http_method=resolved_method,
        status=status,
        error_message=error_message,
        actor_id=actor_id or "unknown",
        actor_email=actor_email,
        actor_role=actor_role,
        entity_type=entity_type,
        entity_id=entity_id,
        old_values=old_values,
        new_values=new_values
    )
    db.session.add(log_entry)
    if has_request_context():
        g.audit_recorded = True  # the audit hook then leaves this request alone: this entry is the detailed one
    if commit:
        db.session.commit()
    return log_entry


def _readable(query):
    """The log rows as plain columns. The action is read as text: the live table holds old rows whose action is no longer
    one of AuditAction (or that use a label the database's enum type lacks), and loading those as AuditLog objects
    answered 500 for any page that contained one."""
    return query.with_entities(
        AuditLog.id, cast(AuditLog.action, String).label("action"), AuditLog.description, AuditLog.endpoint,
        AuditLog.http_method, AuditLog.status, AuditLog.error_message, AuditLog.actor_id, AuditLog.actor_email,
        AuditLog.actor_role, AuditLog.entity_type, AuditLog.entity_id, AuditLog.old_values, AuditLog.new_values,
        AuditLog.created_at,
    )


def _row_dict(row):
    data = row._asdict()
    data["action"] = (data["action"] or "").split(".")[-1].lower()
    data["created_at"] = data["created_at"].isoformat() if data["created_at"] else None
    return data


def _parse_datetime(date_str, is_end=False):
    """Parse date/datetime string into a datetime object."""
    if not date_str:
        return None
    date_str = str(date_str).strip()
    formats = [
        "%Y-%m-%d",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M",
        "%Y-%m-%d %H:%M:%S",
        "%Y/%m/%d",
        "%d-%m-%Y",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            if fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y"):
                dt = datetime.combine(dt.date(), time.max if is_end else time.min)
            return dt
        except ValueError:
            continue
    raise ValueError(f"Invalid date format '{date_str}'. Expected YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS.")


# -------------------------------------------------------------------------
# 1. Viewing all audit logs with filter queries
# -------------------------------------------------------------------------
@audit_logs.route('/get-all', methods=['GET'])
@jwt_required()
@role_required("admin")
def get_all_audit_logs():
    """
    Get audit logs with optional filters:
      - start_date / from_date (created_at >= start_date)
      - end_date / to_date (created_at <= end_date)
      - status (success / failure)
      - action (create, view, update, delete, login, etc.)
      - http_method (GET, POST, PATCH, DELETE, etc.)
      - actor_role (admin, applicant, hr, finance, etc.)
      - page & page_size for pagination
    """
    query = AuditLog.query
    applied_filters = {}

    # Filter: Date range (created_at)
    start_date_param = request.args.get("start_date") or request.args.get("from_date")
    end_date_param = request.args.get("end_date") or request.args.get("to_date")

    if start_date_param:
        try:
            start_dt = _parse_datetime(start_date_param, is_end=False)
            query = query.filter(AuditLog.created_at >= start_dt)
            applied_filters["start_date"] = start_date_param
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

    if end_date_param:
        try:
            end_dt = _parse_datetime(end_date_param, is_end=True)
            query = query.filter(AuditLog.created_at <= end_dt)
            applied_filters["end_date"] = end_date_param
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

    if start_date_param and end_date_param:
        if start_dt > end_dt:
            return jsonify({"error": "start_date cannot be after end_date"}), 400

    # Filter: status
    status_param = request.args.get("status")
    if status_param:
        query = query.filter(AuditLog.status == status_param.strip().lower())
        applied_filters["status"] = status_param.strip().lower()

    # Filter: action
    action_param = request.args.get("action")
    if action_param:
        action_clean = action_param.strip()
        action_enum = None
        try:
            action_enum = AuditAction(action_clean.lower())
        except ValueError:
            try:
                action_enum = AuditAction[action_clean.upper()]
            except KeyError:
                pass

        if not action_enum:
            valid_actions = [a.value for a in AuditAction]
            return jsonify({
                "error": f"Invalid action '{action_param}'. Allowed values: {valid_actions}"
            }), 400

        query = query.filter(cast(AuditLog.action, String) == action_enum.name)
        applied_filters["action"] = action_enum.value

    # Filter: http_method
    http_method_param = request.args.get("http_method")
    if http_method_param:
        query = query.filter(AuditLog.http_method == http_method_param.strip().upper())
        applied_filters["http_method"] = http_method_param.strip().upper()

    # Filter: actor_role
    actor_role_param = request.args.get("actor_role")
    if actor_role_param:
        query = query.filter(AuditLog.actor_role == actor_role_param.strip().lower())
        applied_filters["actor_role"] = actor_role_param.strip().lower()

    # Filter: who / what (exact entity id, part of the actor's email) and free-text search over the readable columns
    actor_email_param = (request.args.get("actor_email") or "").strip()
    if actor_email_param:
        query = query.filter(AuditLog.actor_email.ilike(f"%{actor_email_param}%"))
        applied_filters["actor_email"] = actor_email_param
    entity_id_param = (request.args.get("entity_id") or "").strip()
    if entity_id_param:
        query = query.filter(AuditLog.entity_id == entity_id_param)
        applied_filters["entity_id"] = entity_id_param
    search = (request.args.get("q") or "").strip()
    if search:
        like = f"%{search}%"
        query = query.filter(or_(
            AuditLog.description.ilike(like), AuditLog.actor_email.ilike(like), AuditLog.endpoint.ilike(like),
            AuditLog.entity_type.ilike(like), AuditLog.entity_id.ilike(like), AuditLog.error_message.ilike(like),
        ))
        applied_filters["q"] = search

    # Newest first, or ?order=asc to read what happened from the start (the id keeps rows of the same second in a fixed order)
    order = request.args.get("order", "desc")
    if order not in ("asc", "desc"):
        return jsonify({"error": "order must be asc or desc."}), 400
    query = query.order_by(AuditLog.created_at.asc() if order == "asc" else AuditLog.created_at.desc(), AuditLog.id)

    # Pagination
    page = request.args.get("page", default=1, type=int)
    page_size = request.args.get("page_size", default=50, type=int)
    page_size = min(max(page_size, 1), 500)

    pagination = _readable(query).paginate(
        page=page,
        per_page=page_size,
        error_out=False
    )

    return jsonify({
        "message": "Audit logs retrieved successfully",
        "data": [_row_dict(row) for row in pagination.items],
        "pagination": {
            "page": pagination.page,
            "page_size": pagination.per_page,
            "total_pages": pagination.pages,
            "total_records": pagination.total,
            "has_next": pagination.has_next,
            "has_prev": pagination.has_prev
        }
    }), 200


# -------------------------------------------------------------------------
# 2. Viewing one audit log by id
# -------------------------------------------------------------------------
@audit_logs.route('/get-one/<string:log_id>', methods=['GET'])
@jwt_required()
@role_required("admin")
def get_audit_log(log_id):
    """View a single audit log entry by ID."""
    log = _readable(AuditLog.query.filter_by(id=log_id)).first()
    if not log:
        return jsonify({"error": "Audit log not found"}), 404

    return jsonify({
        "message": "Audit log retrieved successfully",
        "data": _row_dict(log)
    }), 200


# -------------------------------------------------------------------------
# 3. Delete audit logs by date range
# -------------------------------------------------------------------------
@audit_logs.route('/delete-by-date', methods=['DELETE'])
@jwt_required()
@role_required("admin")
def delete_audit_logs_by_date():
    """
    Delete audit logs matching a date range.
    Accepts start_date and end_date in query parameters or JSON request body.
    """
    data = request.get_json(silent=True) or {}

    start_date_param = data.get("start_date") or data.get("from_date") or request.args.get("start_date") or request.args.get("from_date")
    end_date_param = data.get("end_date") or data.get("to_date") or request.args.get("end_date") or request.args.get("to_date")

    if not start_date_param or not end_date_param:
        return jsonify({
            "error": "Both 'start_date' and 'end_date' are required to delete audit logs by date range."
        }), 400

    try:
        start_dt = _parse_datetime(start_date_param, is_end=False)
        end_dt = _parse_datetime(end_date_param, is_end=True)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    if start_dt > end_dt:
        return jsonify({
            "error": "'start_date' cannot be after 'end_date'."
        }), 400

    # The log is only worth anything if it cannot be wiped right after the event: keep the recent past.
    newest_deletable = datetime.utcnow() - timedelta(days=RETENTION_DAYS)
    if end_dt > newest_deletable:
        return jsonify({
            "error": f"Audit logs from the last {RETENTION_DAYS} days are kept. Choose an end date on or before "
                     f"{newest_deletable.strftime('%Y-%m-%d')}."
        }), 400

    # Delete records within range
    deleted_count = (
        AuditLog.query
        .filter(AuditLog.created_at >= start_dt, AuditLog.created_at <= end_dt)
        .delete(synchronize_session=False)
    )

    # Record audit trail of the deletion before committing
    actor_id, actor_email, actor_role = _get_actor_info()
    _record_audit_log(
        action=AuditAction.DELETE,
        description=f"Deleted {deleted_count} audit logs between {start_date_param} and {end_date_param}",
        entity_type="AuditLog",
        actor_id=actor_id,
        actor_email=actor_email,
        actor_role=actor_role,
        new_values={
            "start_date": str(start_date_param),
            "end_date": str(end_date_param),
            "deleted_count": deleted_count
        }
    )

    db.session.commit()

    return jsonify({
        "message": f"Successfully deleted {deleted_count} audit log(s).",
        "deleted_count": deleted_count
    }), 200
