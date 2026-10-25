"""The demo's own endpoints. They exist only when DEMO_MODE is True (create_app registers this blueprint then, and only then),
so the live API cannot route to any of them. Everything here works on the fictional demo data."""
import os
import subprocess
import sys
import time
from datetime import datetime

from flask import Blueprint, abort, current_app, jsonify

from website.models import AuditLog
from website.role_decorator import optional_claims

demo_bp = Blueprint("demo", __name__, url_prefix="/api/demo")

RESET_COOLDOWN = 180  # seconds between two resets


@demo_bp.before_request
def only_on_a_demo_database():
    """The same guard the data builder uses: these endpoints answer only where DEMO_MODE is True AND the database is a demo one
    (so even a live server that was started with DEMO_MODE=True by mistake answers 404 here)."""
    try:
        from demo_data import assert_demo_target
        assert_demo_target(current_app.config["SQLALCHEMY_DATABASE_URI"])
    except Exception:
        abort(404)


def mark_pdfs_as_samples():
    """Every PDF the demo makes gets a faint diagonal SAMPLE behind its text, so a demo document can never pass for a real one.
    reportlab builds all of the platform's PDFs through SimpleDocTemplate.build, so one wrapper covers them all."""
    from reportlab.platypus import SimpleDocTemplate

    if getattr(SimpleDocTemplate.build, "marks_samples", False):
        return
    original = SimpleDocTemplate.build

    def stamp(canvas, doc):
        width, height = doc.pagesize
        canvas.saveState()
        canvas.setFont("Helvetica-Bold", 110)
        canvas.setFillColorRGB(0.8, 0.1, 0.1, alpha=0.09)
        canvas.translate(width / 2, height / 2)
        canvas.rotate(35)
        canvas.drawCentredString(0, -35, "SAMPLE")
        canvas.restoreState()

    def build(self, flowables, onFirstPage=None, onLaterPages=None, **options):
        def first(canvas, doc):
            stamp(canvas, doc)
            if onFirstPage:
                onFirstPage(canvas, doc)

        def later(canvas, doc):
            stamp(canvas, doc)
            if onLaterPages:
                onLaterPages(canvas, doc)
        return original(self, flowables, onFirstPage=first, onLaterPages=later, **options)

    build.marks_samples = True
    SimpleDocTemplate.build = build


@demo_bp.route("/personas", methods=["GET"])
def personas():
    """The people a presenter can sign in as, with the shared demo password, so the picker can sign in with one click."""
    from demo_data import people as P
    from website.models import Company

    names = {c.code: c.name for c in Company.query.all()}
    out = []
    for key, portal, blurb in P.PERSONAS:
        who = P.account(key)
        out.append({**who, "key": key, "portal": portal, "company": names.get(who["company"]), "blurb": blurb})
    return jsonify({"password": P.PASSWORD, "personas": out}), 200


@demo_bp.route("/guide", methods=["GET"])
def guide():
    """The presenter's stories, with the person to sign in as and links found in the database (see demo_data/guide.py)."""
    from demo_data import guide as G, people as P

    sign_in = {key: portal for key, portal, _ in P.PERSONAS}

    def who(key):
        person = P.account(key)
        return {"key": key, "name": person["name"], "title": person["title"], "email": person["email"], "portal": sign_in[key]}

    stories = G.build()
    for story in stories:
        story["who"] = who(story["who"])
        for link in story["links"]:
            link["who"] = who(link["who"])
    return jsonify({"stories": stories}), 200


# -- the daily job -----------------------------------------------------------------------------------------------------

def _mail(row):
    values = row.new_values or {}
    description = row.description or ""
    return {"id": row.id, "to": values.get("to"), "subject": values.get("subject"), "body": values.get("body"),
            "purpose": description[len("Emailed "):description.rfind(" to ")] if description.startswith("Emailed ") else "an email",
            "sent_at": row.created_at.isoformat() + "Z" if row.created_at else None}


def _mails(since=None, limit=100):
    """The emails the platform 'sent' (nothing is delivered in the demo, but it keeps the whole message), newest first."""
    query = AuditLog.query.filter(AuditLog.description.like("Emailed %")).order_by(AuditLog.created_at.desc())
    if since:
        query = query.filter(AuditLog.created_at >= since)
    return [_mail(r) for r in query.limit(500) if (r.new_values or {}).get("body")][:limit]


@demo_bp.route("/run-daily-job", methods=["POST"])
def run_daily_job():
    """Run the real daily job now, the one the scheduler runs every morning, and say what it did."""
    started = datetime.utcnow()
    reply = current_app.test_client().post("/api/cron/reminders", headers={"X-Cron-Secret": os.getenv("CRON_SECRET", "")})
    result = reply.get_json(silent=True) or {}
    if reply.status_code != 200:
        return jsonify({"message": "The daily job could not run", "detail": result.get("error")}), 502
    mails = _mails(since=started)
    return jsonify({"emails_sent": result.get("emails_sent", 0), "delinquent_marked": result.get("delinquent_marked", 0),
                    "emails": [{"to": m["to"], "subject": m["subject"]} for m in mails]}), 200


@demo_bp.route("/inbox", methods=["GET"])
def inbox():
    return jsonify({"emails": _mails()}), 200


# -- resetting the data ------------------------------------------------------------------------------------------------
# A reset takes about a minute, so it runs as its own process: the web request answers at once, and no table is locked by a
# web worker while the tables are dropped and rebuilt. The process writes its progress to a log, which says how it is going.

def _paths():
    root = os.path.dirname(current_app.root_path)
    return root, os.path.join(root, "tmp", "demo_reset.log")


def _reset_state():
    """(state, seconds since the log last changed): idle, running, done or failed."""
    _, log = _paths()
    if not os.path.exists(log):
        return "idle", None
    age = time.time() - os.path.getmtime(log)
    text = open(log, errors="replace").read()
    if "Done:" in text:
        return "done", age
    if "Refused" in text or "Traceback" in text or age > 600:
        return "failed", age
    return "running", age


@demo_bp.route("/status", methods=["GET"])
def status():
    state, age = _reset_state()
    return jsonify({"reset": state, "seconds_ago": None if age is None else int(age)}), 200


@demo_bp.route("/reset", methods=["POST"])
def reset():
    """Rebuild the demo data. For a signed-in admin only, and not twice within a few minutes."""
    if optional_claims().get("role") not in ("admin", "super_admin"):
        return jsonify({"message": "Sign in as an admin to reset the demo."}), 403
    state, age = _reset_state()
    if state == "running":
        return jsonify({"message": "A reset is already running.", "reset": state}), 409
    if age is not None and age < RESET_COOLDOWN:
        return jsonify({"message": f"The demo was reset {int(age)} seconds ago. Try again in {int(RESET_COOLDOWN - age)} seconds."}), 429

    root, log = _paths()
    os.makedirs(os.path.dirname(log), exist_ok=True)
    python = os.path.join(sys.prefix, "bin", "python")
    with open(log, "w") as out:
        subprocess.Popen([python if os.path.exists(python) else sys.executable, "-u", os.path.join(root, "demo_seeder.py")], cwd=root,
                         stdout=out, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, start_new_session=True, close_fds=True)
    return jsonify({"message": "Rebuilding the demo data. This takes about a minute.", "reset": "running"}), 202
