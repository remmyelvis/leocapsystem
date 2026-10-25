"""The public site's editable text.

Admins edit named blocks (contact details, the announcement banner, testimonials, FAQs) as a draft, preview it on the real
pages, then publish. Visitors get only what is published; a block nobody has published keeps the text built into the site.
Every text that went live is kept so it can be brought back, and every change is also a line in the audit trail.

Rich text is not HTML. It is a small plain-text format (paragraphs, **bold**, [links](url), "- " and "1. " lists, "### "
sub-headings, [button: Label](/path), and a few {{tokens}}) that the site turns into its own components, so nothing in it can
ever run. The checks here keep the stored text tidy and the links safe; they are not what makes it safe.
"""
import hashlib
import json
import logging
import os
import re
from datetime import datetime
from functools import wraps

from flask import Blueprint, abort, jsonify, make_response, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from website.extensions import db
from website.models import SiteContent, SiteContentVersion, User
from website.role_decorator import optional_claims, role_required

site_content_bp = Blueprint("site_content", __name__, url_prefix="/api/site-content")

MAX_BODY = 300_000  # bytes of one request


class ContentError(Exception):
    def __init__(self, problems):
        self.problems = problems


# -- small checks -----------------------------------------------------------------------------------------------------

_URL = re.compile(r"^(/(?!/)[^\s]*|https://[^\s]+|mailto:[^\s@]+@[^\s@]+|tel:\+?[0-9]+)$")
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_PHONE = re.compile(r"^\+?[0-9][0-9 ()-]{5,20}$")
_SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
_LINK = re.compile(r"\[([^\]\n]*)\]\(([^)\n]*)\)")
_TOKEN = re.compile(r"\{\{\s*([^{}\n]*?)\s*\}\}")
_BLOCK_LINE = re.compile(r"^\{\{\s*(?:documents-checklist|status-guide)\s*\}\}$")
_BUTTON_LINE = re.compile(r"^(?:\[(?:button|outline):[^\]\n]*\]\([^)\n]*\)\s*)+$")
_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
BLOCK_TOKENS = {"documents-checklist", "status-guide"}  # ready-made blocks: each must stand alone on its line
TOKENS = {"email", "phones", "address"} | BLOCK_TOKENS
FAQ_TOPICS = ["Getting started", "Loans & money", "Your account", "Privacy & contact"]
PRODUCTS = ["Salary Advance", "Personal Loan", "Installment Loan"]
BANNER_TONES = ["info", "warning", "success"]


class _Check:
    """Collects every problem in a block, so the editor can show them all at once."""

    def __init__(self):
        self.problems = []

    def fail(self, where, message):
        self.problems.append(f"{where}: {message}")

    def text(self, value, where, lo=0, hi=200, multiline=False):
        if value is None:
            value = ""
        if not isinstance(value, str):
            self.fail(where, "must be text")
            return ""
        value = value.strip()
        if _CONTROL.search(value) or (not multiline and "\n" in value):
            self.fail(where, "contains characters that are not allowed")
        if len(value) < lo:
            self.fail(where, "is required" if lo == 1 else f"must have at least {lo} characters")
        if len(value) > hi:
            self.fail(where, f"is too long ({len(value)} characters, the limit is {hi})")
        return value

    def url(self, value, where, required=False):
        value = self.text(value, where, 1 if required else 0, 500)
        if value and not _URL.match(value):
            self.fail(where, "must be an address on this site (starting with /) or start with https://, mailto: or tel:")
        return value

    def flag(self, value, where):
        if not isinstance(value, bool):
            self.fail(where, "must be yes or no")
        return bool(value)

    def choice(self, value, where, options):
        if value not in options:
            self.fail(where, "must be one of: " + ", ".join(options))
        return value

    def items(self, value, where, lo, hi):
        if not isinstance(value, list):
            self.fail(where, "must be a list")
            return []
        if not lo <= len(value) <= hi:
            self.fail(where, f"must have between {lo} and {hi} entries (it has {len(value)})")
        return [v for v in value[:hi] if isinstance(v, dict)] if len(value) <= hi else []

    def rich(self, value, where, lo=1, hi=4000):
        """Text in the site's small format: the links must be safe and the {{tokens}} known."""
        value = self.text(value, where, lo, hi, multiline=True)
        for label, url in _LINK.findall(value):
            if not label.strip():
                self.fail(where, f"a link to {url or 'nowhere'} has no text")
            if not _URL.match(url):
                self.fail(where, f"the link \"{label[:30]}\" must point to an address on this site (starting with /) or start with https://, mailto: or tel:")
        for token in _TOKEN.findall(value):
            if token not in TOKENS:
                self.fail(where, "{{" + token + "}} is not a known placeholder (use " + ", ".join("{{" + t + "}}" for t in sorted(TOKENS)) + ")")
        for line in value.splitlines():
            line = line.strip()
            for token in BLOCK_TOKENS & set(_TOKEN.findall(line)):
                if not _BLOCK_LINE.match(line):
                    self.fail(where, "{{" + token + "}} must be on a line by itself")
            if re.search(r"\[(?:button|outline):\s*\]", line):
                self.fail(where, "a button has no text")
            elif re.search(r"\[(?:button|outline):", line) and not _BUTTON_LINE.match(line):
                self.fail(where, "a button must be on its own line, as [button: Label](/page)")
        return value

    def done(self):
        if self.problems:
            raise ContentError(self.problems)


def _object(data):
    if not isinstance(data, dict):
        raise ContentError(["The content must be an object"])
    return data


# -- the blocks ---------------------------------------------------------------------------------------------------------

def _contact(data):
    c, d = _Check(), _object(data)
    email = c.text(d.get("email"), "Email", 1, 120)
    if email and not _EMAIL.match(email):
        c.fail("Email", "is not a valid address")
    phones = []
    for i, p in enumerate(c.items(d.get("phones"), "Phone numbers", 1, 4), 1):
        number = c.text(p.get("number"), f"Phone {i}", 1, 25)
        if number and not _PHONE.match(number):
            c.fail(f"Phone {i}", "should be a phone number such as +254 722 000 000")
        phones.append({"number": number})
    address = c.text(d.get("address"), "Address", 1, 200)
    maps = c.url(d.get("maps_url"), "Map link", False)
    if maps and not maps.startswith("https://"):
        c.fail("Map link", "must start with https://")
    c.done()
    return {"email": email, "phones": phones, "address": address, "maps_url": maps}


def _banner(data):
    c, d = _Check(), _object(data)
    enabled = c.flag(d.get("enabled", False), "Show the banner")
    text = c.text(d.get("text"), "Banner text", 1 if enabled else 0, 200)
    label = c.text(d.get("link_label"), "Link text", 0, 40)
    url = c.url(d.get("link_url"), "Link address", False)
    if bool(label) != bool(url):
        c.fail("Link", "needs both the text and the address, or neither")
    tone = c.choice(d.get("tone", "info"), "Colour", BANNER_TONES)
    c.done()
    return {"enabled": enabled, "text": text, "link_label": label, "link_url": url, "tone": tone}


def _testimonials(data):
    c, d = _Check(), _object(data)
    out = []
    for i, t in enumerate(c.items(d.get("items"), "Testimonials", 0, 12), 1):
        where = f"Testimonial {i}"
        product = t.get("product") or ""
        if product:
            c.choice(product, f"{where} product", PRODUCTS)
        out.append({
            "name": c.text(t.get("name"), f"{where} name", 1, 80),
            "role": c.text(t.get("role"), f"{where} role or company", 1, 100),
            "quote": c.text(t.get("quote"), f"{where} quote", 1, 500, multiline=True),
            "consent": c.flag(t.get("consent", False), f"{where} consent"),
            "product": product,
            "outcome": c.text(t.get("outcome"), f"{where} outcome", 0, 80),
        })
    c.done()
    return {"items": out}


def _faq(data):
    c, d = _Check(), _object(data)
    out, seen = [], set()
    for i, f in enumerate(c.items(d.get("items"), "Questions", 1, 60), 1):
        where = f"Question {i}"
        fid = c.text(f.get("id"), f"{where} id", 1, 40)
        if fid and not _SLUG.match(fid):
            c.fail(f"{where} id", "may only have lowercase letters, numbers and hyphens")
        if fid in seen:
            c.fail(f"{where} id", f"\"{fid}\" is used twice")
        seen.add(fid)
        out.append({
            "id": fid,
            "topic": c.choice(f.get("topic"), f"{where} topic", FAQ_TOPICS),
            "q": c.text(f.get("q"), f"{where} question", 1, 200),
            "a": c.rich(f.get("a"), f"{where} answer", 1, 4000),
            "popular": c.flag(f.get("popular", False), f"{where} popular"),
        })
    c.done()
    return {"items": out}


# key -> (title, what it is, check). Adding a block is adding a line here and its check above.
BLOCKS = {
    "contact": ("Contact details", "Email, phone numbers and address shown in the header, the footer, the contact section, the sign-in pages and the FAQs.", _contact),
    "banner": ("Announcement banner", "A short notice across the top of the public pages, for example planned maintenance.", _banner),
    "testimonials": ("Testimonials", "Client quotes. Only quotes marked as agreed by the client are ever shown to visitors.", _testimonials),
    "faq": ("FAQs", "The questions and answers on the FAQ page.", _faq),
}


def _public_view(key, data):
    """What a visitor (or a preview) may see of a block. A testimonial without the client's agreement never leaves the server."""
    if key == "testimonials" and isinstance(data, dict):
        return {"items": [t for t in data.get("items", []) if t.get("consent")]}
    return data


# -- helpers --------------------------------------------------------------------------------------------------------------

def editors_only(fn):
    """Admins only, and never in the demo (the demo shows the site, it does not edit it)."""
    guarded = jwt_required()(role_required("admin", "super_admin")(fn))

    @wraps(fn)
    def outer(*args, **kwargs):
        if os.getenv("DEMO_MODE") == "True":
            abort(404)
        return guarded(*args, **kwargs)
    return outer


def _block(key):
    if key not in BLOCKS:
        abort(404)
    return BLOCKS[key]


def _who():
    user = User.query.get(get_jwt_identity())
    return user.email if user else "unknown"


def _iso(moment):
    return moment.isoformat() + "Z" if moment else None


def _row(key):
    row = SiteContent.query.get(key)
    if row is None:
        row = SiteContent(key=key, version=0)
        db.session.add(row)
    return row


def _status(row):
    if row is None:
        return "built-in"
    return "draft" if row.draft is not None else ("published" if row.published is not None else "built-in")


def _summary(key, row):
    title, about, _ = BLOCKS[key]
    return {"key": key, "title": title, "about": about, "status": _status(row), "version": row.version if row else 0,
            "draft_by": row.draft_by if row else None, "draft_at": _iso(row.draft_at) if row else None,
            "published_by": row.published_by if row else None, "published_at": _iso(row.published_at) if row else None}


def _detail(key, row):
    return {**_summary(key, row), "draft": row.draft if row else None, "published": row.published if row else None}


def _body():
    if request.content_length and request.content_length > MAX_BODY or len(request.get_data()) > MAX_BODY:
        abort(413)
    payload = request.get_json(silent=True)
    return payload if isinstance(payload, dict) else {}


def _checked(key, data):
    try:
        return BLOCKS[key][2](data)
    except ContentError as why:
        response = jsonify({"message": f"Please fix {len(why.problems)} thing{'s' if len(why.problems) != 1 else ''} before saving.", "errors": why.problems})
        response.status_code = 400
        abort(response)


# -- what visitors get ----------------------------------------------------------------------------------------------------

@site_content_bp.route("", methods=["GET"])
def public_content():
    """Published blocks for everyone. An admin can add ?draft=1 to see their drafts (the preview on the real pages)."""
    preview = request.args.get("draft") == "1" and optional_claims().get("role") in ("admin", "super_admin") and os.getenv("DEMO_MODE") != "True"
    blocks = {}
    try:
        for row in SiteContent.query.all():
            data = row.draft if preview and row.draft is not None else row.published
            if row.key in BLOCKS and data is not None:
                blocks[row.key] = _public_view(row.key, data)
    except Exception:
        logging.exception("Could not read the site content; the pages will use their built-in text")
        db.session.rollback()
        blocks = {}
    payload = json.dumps({"blocks": blocks}, sort_keys=True, separators=(",", ":"))
    response = make_response(payload, 200)
    response.mimetype = "application/json"
    if preview:
        response.headers["Cache-Control"] = "no-store"
        return response
    response.set_etag(hashlib.sha1(payload.encode()).hexdigest())
    response.headers["Cache-Control"] = "public, max-age=60"
    return response.make_conditional(request)


# -- what admins do ---------------------------------------------------------------------------------------------------------

@site_content_bp.route("/admin", methods=["GET"])
@editors_only
def admin_list():
    rows = {r.key: r for r in SiteContent.query.all()}
    return jsonify({"blocks": [_summary(k, rows.get(k)) for k in BLOCKS]}), 200


@site_content_bp.route("/admin/<string:key>", methods=["GET"])
@editors_only
def admin_block(key):
    _block(key)
    return jsonify(_detail(key, SiteContent.query.get(key))), 200


@site_content_bp.route("/<string:key>/draft", methods=["PUT"])
@editors_only
def save_draft(key):
    _block(key)
    body = _body()
    clean = _checked(key, body.get("data"))
    row = _row(key)
    seen = body.get("expected_draft_at")  # what the editor was looking at; a different value means someone else saved since
    if seen is not None and seen != _iso(row.draft_at):
        return jsonify({"message": "Someone else changed this draft while you were editing. Reload the page to see their changes."}), 409
    row.draft, row.draft_by, row.draft_at = clean, _who(), datetime.utcnow()
    db.session.commit()
    return jsonify(_detail(key, row)), 200


@site_content_bp.route("/<string:key>/publish", methods=["POST"])
@editors_only
def publish(key):
    _block(key)
    row = SiteContent.query.get(key)
    if row is None or row.draft is None:
        return jsonify({"message": "There are no unpublished changes to publish."}), 400
    clean = _checked(key, row.draft)  # checked again: what goes live is always checked
    who, now = _who(), datetime.utcnow()
    row.version = (row.version or 0) + 1
    row.published, row.published_by, row.published_at = clean, who, now
    row.draft, row.draft_by, row.draft_at = None, None, None
    db.session.add(SiteContentVersion(key=key, version=row.version, action="publish", data=clean, by_email=who, created_at=now))
    db.session.commit()
    return jsonify(_detail(key, row)), 200


@site_content_bp.route("/<string:key>/discard", methods=["POST"])
@editors_only
def discard(key):
    _block(key)
    row = SiteContent.query.get(key)
    if row is not None and row.draft is not None:
        row.draft, row.draft_by, row.draft_at = None, None, None
        db.session.commit()
    return jsonify(_detail(key, row)), 200


@site_content_bp.route("/<string:key>/reset", methods=["POST"])
@editors_only
def reset(key):
    """Back to the text built into the site (the published text and any draft are removed; the history keeps them)."""
    _block(key)
    row = SiteContent.query.get(key)
    if row is None or (row.published is None and row.draft is None):
        return jsonify(_detail(key, row)), 200
    who, now = _who(), datetime.utcnow()
    if row.published is not None:
        row.version = (row.version or 0) + 1
        db.session.add(SiteContentVersion(key=key, version=row.version, action="reset", data=None, by_email=who, created_at=now))
    row.published = row.draft = None
    row.published_by = row.published_at = row.draft_by = row.draft_at = None
    db.session.commit()
    return jsonify(_detail(key, row)), 200


@site_content_bp.route("/<string:key>/history", methods=["GET"])
@editors_only
def history(key):
    _block(key)
    rows = SiteContentVersion.query.filter_by(key=key).order_by(SiteContentVersion.version.desc()).limit(40).all()
    return jsonify({"versions": [{"version": r.version, "action": r.action, "by": r.by_email, "at": _iso(r.created_at), "restorable": r.data is not None} for r in rows]}), 200


@site_content_bp.route("/<string:key>/restore/<int:version>", methods=["POST"])
@editors_only
def restore(key, version):
    """Bring an earlier published text back as the draft. It is not published until an admin publishes it."""
    _block(key)
    old = SiteContentVersion.query.filter_by(key=key, version=version).first()
    if old is None or old.data is None:
        return jsonify({"message": "That version cannot be restored."}), 404
    clean = _checked(key, old.data)  # the rules may have changed since: an old text that no longer passes is refused with the reasons
    row = _row(key)
    row.draft, row.draft_by, row.draft_at = clean, _who(), datetime.utcnow()
    db.session.commit()
    return jsonify(_detail(key, row)), 200
