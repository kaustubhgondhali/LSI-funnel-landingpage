"""
Lord Sai — SIP Landing Page
setup_db.py — one-time MySQL setup. Run it with setup.bat.

  1. builds the `lordsai_sip` database from database/01_create_database.sql
  2. creates a MySQL user `lordsai_app` that can only read and add rows
  3. writes server/.env with that user's details, for app.py to use

You are asked for your MySQL admin (root) password once. It is used for this
setup only and is never saved. Safe to run again: no data is deleted, and the
app user's password is renewed and written to .env again.
"""
import argparse
import getpass
import os
import secrets
import sys
from pathlib import Path

import pymysql

HERE = Path(__file__).parent
SCHEMA = HERE.parent / "database" / "01_create_database.sql"
APP_USER = "lordsai_app"
DB_NAME = "lordsai_sip"


def statements(sql):
    """Split the SQL file into single statements (it has no ';' inside a statement)."""
    lines = [ln for ln in sql.splitlines() if not ln.lstrip().startswith("--")]
    return [s.strip() for s in "\n".join(lines).split(";") if s.strip()]


def read_env(path):
    values = {}
    if path.exists():
        for ln in path.read_text(encoding="utf-8").splitlines():
            if "=" in ln and not ln.lstrip().startswith("#"):
                k, v = ln.split("=", 1)
                values[k.strip()] = v.strip()
    return values


def main():
    ap = argparse.ArgumentParser(description="Create the Lord Sai SIP database and its API user.")
    ap.add_argument("--host", help="MySQL host (default 127.0.0.1)")
    ap.add_argument("--port", type=int, help="MySQL port (default 3306)")
    ap.add_argument("--admin", help="MySQL admin user (default root)")
    ap.add_argument("--env-file", default=str(HERE / ".env"), help="where to write the settings")
    args = ap.parse_args()

    print("\nLord Sai SIP - MySQL setup")
    print("-------------------------")
    host = args.host or input("MySQL host [127.0.0.1]: ").strip() or "127.0.0.1"
    port = args.port or int(input("MySQL port [3306]: ").strip() or 3306)
    admin = args.admin or input("MySQL admin user [root]: ").strip() or "root"
    password = os.environ.get("MYSQL_PWD")
    if password is None:
        password = getpass.getpass(f"Password for '{admin}' (hidden while you type): ")

    try:
        conn = pymysql.connect(host=host, port=port, user=admin, password=password,
                               charset="utf8mb4", autocommit=True, connect_timeout=8)
    except pymysql.MySQLError as exc:
        sys.exit(f"\nCould not connect to MySQL: {exc.args[-1]}\n"
                 "Check the password, and that the MySQL80 service is running.")

    local = host in ("127.0.0.1", "localhost", "::1")
    user_hosts = ["localhost", "127.0.0.1"] if local else ["%"]
    app_password = secrets.token_urlsafe(24)

    with conn, conn.cursor() as cur:
        for st in statements(SCHEMA.read_text(encoding="utf-8")):
            # The file's user lines carry a placeholder password for people running it
            # by hand in Workbench; here the user is created below with a random one.
            if st.upper().startswith(("CREATE USER", "ALTER USER", "GRANT")):
                continue
            cur.execute(st)
        print(f"  [ok] database `{DB_NAME}`: 6 tables (enquiries, events + 4 lookups) and 4 report views")

        for uh in user_hosts:
            cur.execute("CREATE USER IF NOT EXISTS %s@%s IDENTIFIED BY %s", (APP_USER, uh, app_password))
            cur.execute("ALTER USER %s@%s IDENTIFIED BY %s", (APP_USER, uh, app_password))
            # Least privilege: the website can add rows and read them back — never change or delete
            cur.execute(f"GRANT SELECT, INSERT ON `{DB_NAME}`.* TO %s@%s", (APP_USER, uh))
        print(f"  [ok] MySQL user `{APP_USER}` (can only read and add rows)")

    env_path = Path(args.env_file)
    old = read_env(env_path)
    origins = old.get("ALLOWED_ORIGINS",
                      "http://127.0.0.1:5500,http://localhost:5500,https://kaustubhgondhali.github.io")
    env_path.write_text(
        "# Written by setup_db.py — keep this file private (it is ignored by git).\n"
        f"DB_HOST={host}\nDB_PORT={port}\nDB_NAME={DB_NAME}\n"
        f"DB_USER={APP_USER}\nDB_PASSWORD={app_password}\n"
        f"ALLOWED_ORIGINS={origins}\n"
        f"PORT={old.get('PORT', '5000')}\n",
        encoding="utf-8")
    print(f"  [ok] settings saved to {env_path}")
    print("\nDone. Start the API with start.bat, then submit the form on the page.\n")


if __name__ == "__main__":
    main()
