"""
Tests for app.py. Run:  .venv\\Scripts\\python test_api.py

Part 1 needs no database: input checks, CORS and error handling.
Part 2 runs only when server/.env exists: it saves an enquiry and events through
the real API into your MySQL tables inside a transaction, reads them back, and
then rolls back — so no test rows are left in your data.
"""
import json
import sys

import pymysql

import app as api

passed = failed = 0


def check(label, cond, got=None):
    global passed, failed
    if cond:
        passed += 1
        print("  PASS  " + label)
    else:
        failed += 1
        print("  FAIL  " + label + ("" if got is None else f"   got: {got!r}"))


GOOD = {
    "name": "Test Visitor", "countryCode": "+91", "mobile": "98765 43210", "email": "",
    "goal": "retirement", "investmentRange": "5000-10000", "contactMethod": "whatsapp",
    "contactTime": "evening", "consent": True, "language": "mr",
    "pageUrl": "http://127.0.0.1:5500/index.html", "referrer": "", "utmSource": "instagram",
    "utmMedium": "", "utmCampaign": "", "sessionId": "0123456789abcdef0123456789abcdef",
}
ORIGIN = "http://127.0.0.1:5500"


def post(client, path, body, **kw):
    return client.post(path, data=body if isinstance(body, str) else json.dumps(body),
                       headers={"Origin": ORIGIN, **kw.pop("headers", {})},
                       content_type=kw.pop("content_type", "application/json"))


def fresh_client():
    api._hits.clear()                      # rate-limit state is per process
    return api.app.test_client()


print("\n[1] Input checks, CORS and errors (no database)")
c = fresh_client()

row, errors = api.validate_enquiry(dict(GOOD))
check("valid enquiry passes", errors == {}, errors)
check("mobile stored as digits only", row["mobile"] == "9876543210", row["mobile"])
check("empty optional email stored as NULL", row["email"] is None)
check("language kept", row["language"] == "mr")

for field, value, key in [("mobile", "12345", "mobile"), ("mobile", "5876543210", "mobile"),
                          ("countryCode", "+999", "countryCode"), ("goal", "lottery", "goal"),
                          ("consent", False, "consent"), ("consent", "true", "consent"),
                          ("name", "A", "name"), ("email", "not-an-email", "email"),
                          ("investmentRange", "1-crore", "investmentRange")]:
    _, errs = api.validate_enquiry({**GOOD, field: value})
    check(f"rejects {field}={value!r}", key in errs, errs)

_, errs = api.validate_enquiry({**GOOD, "contactMethod": "email", "email": ""})
check("email contact without an email is rejected", "email" in errs, errs)
_, errs = api.validate_enquiry({**GOOD, "countryCode": "+44", "mobile": "7700900123"})
check("non-Indian number accepted with its own rule", errs == {}, errs)
row, _ = api.validate_enquiry({**GOOD, "sessionId": "<script>"})
check("malformed session id dropped", row["session_id"] is None)

r = post(c, "/api/enquiry", {**GOOD, "mobile": "1"})
check("bad enquiry → HTTP 422 with field errors", r.status_code == 422 and "mobile" in r.get_json()["errors"], r.status_code)
r = post(c, "/api/enquiry", "not json")
check("non-JSON body → HTTP 400", r.status_code == 400, r.status_code)
r = post(c, "/api/event", {"type": "delete_everything"}, content_type="text/plain")
check("unknown event type → HTTP 400", r.status_code == 400, r.status_code)

ev = api.validate_event({"type": "cta_click", "label": "Hero.CTA2", "device": "phone", "language": "xx"})
check("event label normalised, bad device/language dropped",
      ev["label"] == "hero.cta2" and ev["device"] is None and ev["language"] is None, ev)

r = c.options("/api/enquiry", headers={"Origin": ORIGIN, "Access-Control-Request-Method": "POST",
                                       "Access-Control-Request-Headers": "Content-Type"})
check("CORS preflight allows Live Server", r.headers.get("Access-Control-Allow-Origin") == ORIGIN,
      r.headers.get("Access-Control-Allow-Origin"))
r = c.options("/api/enquiry", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
check("CORS refuses other websites", r.headers.get("Access-Control-Allow-Origin") is None,
      r.headers.get("Access-Control-Allow-Origin"))

c = fresh_client()
codes = [post(c, "/api/enquiry", {**GOOD, "mobile": "1"}).status_code for _ in range(6)]
check("6th enquiry in 10 minutes from one address → HTTP 429", codes[-1] == 429 and 429 not in codes[:5], codes)

# Database down → honest 503, never a fake success
real_connect = api.connect
api.connect = lambda: (_ for _ in ()).throw(pymysql.err.OperationalError(2003, "Can't connect"))
api.app.logger.disabled = True            # the expected error would otherwise print a traceback
c = fresh_client()
r = post(c, "/api/enquiry", GOOD)
check("database unreachable → HTTP 503, not success", r.status_code == 503 and r.get_json()["ok"] is False, r.status_code)
api.app.logger.disabled = False
api.connect = real_connect


if not api.DB["user"]:
    print("\n[2] Skipped — no server/.env yet (run setup.bat).")
else:
    print(f"\n[2] Round trip through MySQL ({api.DB['user']}@{api.DB['host']}/{api.DB['database']}), rolled back")
    conn = api.connect()

    class NoCommit:
        """Hands the routes one shared connection whose commit/close do nothing,
        so everything below can be rolled back at the end."""
        def __init__(self, inner): self.inner = inner
        def cursor(self, *a, **k): return self.inner.cursor(*a, **k)
        def commit(self): pass
        def close(self): pass

    api.connect = lambda: NoCommit(conn)
    try:
        c = fresh_client()
        r = post(c, "/api/enquiry", GOOD)
        body = r.get_json()
        check("enquiry saved → HTTP 201 with an id", r.status_code == 201 and body["ok"] and body["id"] > 0, (r.status_code, body))

        with conn.cursor(pymysql.cursors.DictCursor) as cur:
            cur.execute("SELECT * FROM enquiries WHERE id = %s", (body["id"],))
            saved = cur.fetchone()
        check("row has the submitted values",
              saved and saved["mobile"] == "9876543210" and saved["goal"] == "retirement"
              and saved["contact_method"] == "whatsapp" and saved["language"] == "mr"
              and saved["utm_source"] == "instagram" and saved["status"] == "new", saved)

        hindi = {**GOOD, "name": "राहुल पाटील", "mobile": "9123456780"}
        r = post(c, "/api/enquiry", hindi)
        with conn.cursor() as cur:
            cur.execute("SELECT name FROM enquiries WHERE id = %s", (r.get_json()["id"],))
            got = cur.fetchone()[0]
        check("Devanagari names stored intact (utf8mb4)", got == "राहुल पाटील", got)

        for etype, label in [("page_view", ""), ("pdf_open", "chart-button"), ("whatsapp_click", "floating"), ("cta_click", "hero.cta2")]:
            r = post(c, "/api/event", {"type": etype, "label": label, "sessionId": GOOD["sessionId"], "device": "mobile"},
                     content_type="text/plain;charset=UTF-8")
            check(f"event {etype} saved → HTTP 204", r.status_code == 204, r.status_code)

        with conn.cursor(pymysql.cursors.DictCursor) as cur:
            cur.execute("SELECT * FROM v_daily_summary WHERE day = CURDATE()")
            today = cur.fetchone()
            cur.execute("SELECT button, clicks FROM v_button_clicks")
            buttons = {r["button"]: r["clicks"] for r in cur.fetchall()}
            cur.execute("SELECT COUNT(*) AS n FROM v_new_enquiries WHERE name = 'Test Visitor'")
            listed = cur.fetchone()["n"]
        check("v_daily_summary counts today's visit, clicks and enquiries",
              today and today["visitors"] >= 1 and today["pdf_opens"] >= 1 and today["whatsapp_clicks"] >= 1
              and today["enquiry_button_clicks"] >= 1 and today["enquiries"] >= 2, today)
        check("v_button_clicks lists each button", {"chart-button", "floating", "hero.cta2"} <= set(buttons), buttons)
        check("v_new_enquiries lists the new lead", listed >= 1, listed)

        with conn.cursor() as cur:
            try:
                cur.execute("DELETE FROM enquiries WHERE id = %s", (body["id"],))
                check("API user cannot delete rows (least privilege)", False, "DELETE was allowed")
            except pymysql.err.OperationalError as exc:
                check("API user cannot delete rows (least privilege)", exc.args[0] == 1142, exc.args)
    finally:
        conn.rollback()
        conn.close()
        api.connect = real_connect
    print("  (rolled back — no test rows were kept)")

print(f"\n  {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
