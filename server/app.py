"""
Lord Sai — SIP Landing Page
app.py — the small API between the landing page and MySQL.

  POST /api/enquiry   saves an enquiry form submission   → 201 {"ok": true, "id": 12}
  POST /api/event     saves an anonymous visit or click  → 204
  GET  /api/health    reports whether MySQL is reachable

Settings come from server/.env (written by setup.bat). Run locally with
start.bat, or:  .venv\\Scripts\\python app.py
"""
import json
import os
import re
import threading
import time
from collections import defaultdict, deque
from contextlib import closing
from pathlib import Path

import pymysql
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix

load_dotenv(Path(__file__).with_name(".env"))

DB = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", ""),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "lordsai_sip"),
    "charset": "utf8mb4",
    "connect_timeout": 5,
}

# Pages allowed to call this API. Live Server is allowed by default; add the
# GitHub Pages address (and your own domain) in .env when you go live.
ALLOWED_ORIGINS = [o.strip() for o in os.getenv(
    "ALLOWED_ORIGINS", "http://127.0.0.1:5500,http://localhost:5500").split(",") if o.strip()]

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024          # an enquiry is well under 2 KB
CORS(app, resources={r"/api/*": {"origins": ALLOWED_ORIGINS}},
     methods=["GET", "POST", "OPTIONS"], allow_headers=["Content-Type"])
if os.getenv("TRUST_PROXY") == "1":                    # set on hosts that sit behind a proxy (Render, Railway)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1)


def connect():
    return pymysql.connect(autocommit=False, **DB)


# --- Allowed values — these mirror the <select>/<radio> options in index.html ---
COUNTRY_CODES = {"+91", "+971", "+966", "+968", "+974", "+965", "+65", "+60",
                 "+44", "+1", "+61", "+64", "+27", "+49", "+33", "+31"}
GOALS = {"wealth", "education", "retirement", "tax", "home", "other"}
RANGES = {"upto-2500", "2500-5000", "5000-10000", "10000-25000", "above-25000", "undecided"}
METHODS = {"phone", "whatsapp", "email"}
TIMES = {"morning", "afternoon", "evening"}
LANGUAGES = {"en", "hi", "mr"}
EVENT_TYPES = {"page_view", "pdf_open", "whatsapp_click", "cta_click"}
DEVICES = {"mobile", "tablet", "desktop"}

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
SESSION_RE = re.compile(r"^[a-f0-9]{32}$")
LABEL_RE = re.compile(r"^[a-z0-9._-]{1,60}$")


def text(value, limit):
    """A trimmed string cut to `limit` characters, or None when empty."""
    if value is None:
        return None
    value = str(value).strip()[:limit]
    return value or None


def source_fields(data):
    """Where the visit came from — shared by enquiries and events."""
    session = str(data.get("sessionId") or "")
    return {
        "page_url": text(data.get("pageUrl"), 500),
        "referrer": text(data.get("referrer"), 500),
        "utm_source": text(data.get("utmSource"), 100),
        "utm_medium": text(data.get("utmMedium"), 100),
        "utm_campaign": text(data.get("utmCampaign"), 100),
        "session_id": session if SESSION_RE.match(session) else None,
    }


def validate_enquiry(data):
    """Re-check everything the browser checked — the browser can't be trusted.
    Returns (row, errors); errors maps a form field name to a short reason."""
    errors = {}

    name = str(data.get("name") or "").strip()
    if not 2 <= len(name) <= 100:
        errors["name"] = "Name must be 2 to 100 characters."

    code = str(data.get("countryCode") or "")
    if code not in COUNTRY_CODES:
        errors["countryCode"] = "Unknown country code."

    mobile = re.sub(r"\D", "", str(data.get("mobile") or ""))
    mobile_ok = re.fullmatch(r"[6-9]\d{9}", mobile) if code == "+91" else re.fullmatch(r"\d{6,14}", mobile)
    if not mobile_ok:
        errors["mobile"] = "Invalid mobile number."

    email = str(data.get("email") or "").strip()
    if email and (len(email) > 254 or not EMAIL_RE.match(email)):
        errors["email"] = "Invalid email address."

    goal = data.get("goal")
    if goal not in GOALS:
        errors["goal"] = "Choose a goal."

    rng = data.get("investmentRange") or None
    if rng is not None and rng not in RANGES:
        errors["investmentRange"] = "Unknown investment range."

    method = data.get("contactMethod")
    if method not in METHODS:
        errors["contactMethod"] = "Choose a contact method."
    elif method == "email" and not email:
        errors["email"] = "An email address is needed to be contacted by email."

    when = data.get("contactTime") or None
    if when is not None and when not in TIMES:
        errors["contactTime"] = "Unknown contact time."

    if data.get("consent") is not True:
        errors["consent"] = "Consent is required."

    lang = data.get("language")
    row = {
        "name": name, "country_code": code, "mobile": mobile, "email": email or None,
        "goal": goal, "investment_range": rng, "contact_method": method, "contact_time": when,
        "consent": 1, "language": lang if lang in LANGUAGES else "en",
        **source_fields(data),
    }
    return row, errors


def validate_event(data):
    etype = data.get("type")
    if etype not in EVENT_TYPES:
        return None
    label = str(data.get("label") or "").strip().lower()
    lang, device = data.get("language"), data.get("device")
    return {
        "event_type": etype,
        "label": label if LABEL_RE.match(label) else None,
        "language": lang if lang in LANGUAGES else None,
        "device": device if device in DEVICES else None,
        **source_fields(data),
    }


ENQUIRY_SQL = """
INSERT INTO enquiries
  (name, country_code, mobile, email, goal, investment_range, contact_method,
   contact_time, consent, language, page_url, referrer, utm_source, utm_medium,
   utm_campaign, session_id)
VALUES
  (%(name)s, %(country_code)s, %(mobile)s, %(email)s, %(goal)s, %(investment_range)s,
   %(contact_method)s, %(contact_time)s, %(consent)s, %(language)s, %(page_url)s,
   %(referrer)s, %(utm_source)s, %(utm_medium)s, %(utm_campaign)s, %(session_id)s)
"""

EVENT_SQL = """
INSERT INTO events
  (event_type, label, language, device, page_url, referrer, utm_source, utm_medium,
   utm_campaign, session_id)
VALUES
  (%(event_type)s, %(label)s, %(language)s, %(device)s, %(page_url)s, %(referrer)s,
   %(utm_source)s, %(utm_medium)s, %(utm_campaign)s, %(session_id)s)
"""


def insert_enquiry(conn, row):
    with conn.cursor() as cur:
        cur.execute(ENQUIRY_SQL, row)
        return cur.lastrowid


def insert_event(conn, row):
    with conn.cursor() as cur:
        cur.execute(EVENT_SQL, row)
        return cur.lastrowid


# --- Simple per-address rate limit (memory only — addresses are never stored) ---
_hits = defaultdict(deque)
_hits_lock = threading.Lock()


def too_many(bucket, limit, window=600):
    key, now = (bucket, request.remote_addr or "?"), time.monotonic()
    with _hits_lock:
        q = _hits[key]
        while q and now - q[0] > window:
            q.popleft()
        if len(q) >= limit:
            return True
        q.append(now)
        return False


@app.post("/api/enquiry")
def enquiry():
    if too_many("enquiry", 5):
        return jsonify(ok=False, error="too_many_requests"), 429
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(ok=False, error="invalid_json"), 400
    row, errors = validate_enquiry(data)
    if errors:
        return jsonify(ok=False, errors=errors), 422
    try:
        with closing(connect()) as conn:
            new_id = insert_enquiry(conn, row)
            conn.commit()
    except pymysql.MySQLError:
        app.logger.exception("Could not save enquiry")
        return jsonify(ok=False, error="database_unavailable"), 503
    return jsonify(ok=True, id=new_id), 201


@app.post("/api/event")
def event():
    # Sent as text/plain by navigator.sendBeacon, so read the body directly
    if too_many("event", 120):
        return "", 429
    try:
        data = json.loads(request.get_data(cache=False, as_text=True) or "null")
    except ValueError:
        data = None
    row = validate_event(data) if isinstance(data, dict) else None
    if row is None:
        return jsonify(ok=False, error="invalid_event"), 400
    try:
        with closing(connect()) as conn:
            insert_event(conn, row)
            conn.commit()
    except pymysql.MySQLError:
        app.logger.exception("Could not save event")
        return jsonify(ok=False, error="database_unavailable"), 503
    return "", 204


@app.get("/api/health")
def health():
    try:
        with closing(connect()) as conn, conn.cursor() as cur:
            cur.execute("SELECT 1")
        return jsonify(ok=True, database="connected")
    except pymysql.MySQLError as exc:
        return jsonify(ok=False, database="unavailable", reason=exc.args[-1] if exc.args else ""), 503


if __name__ == "__main__":
    if not DB["user"]:
        raise SystemExit("No database settings found. Run setup.bat first (it creates server/.env).")
    from waitress import serve
    host, port = os.getenv("HOST", "127.0.0.1"), int(os.getenv("PORT", "5000"))
    print(f"Lord Sai SIP API running on http://{host}:{port}")
    print(f"  database : {DB['user']}@{DB['host']}:{DB['port']}/{DB['database']}")
    print(f"  pages allowed to call it: {', '.join(ALLOWED_ORIGINS)}")
    print("  check it : http://127.0.0.1:%d/api/health   (Ctrl+C to stop)" % port)
    serve(app, host=host, port=port)
