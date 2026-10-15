"""One-off: run zz_db_upgrade.sql on leocapin_main_v1 using the app's own DATABASE_URL.
Prints no credentials. Refuses any other database. Commits only if all checks pass."""
import os
import sys
from dotenv import dotenv_values
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url

HERE = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.environ.get("RUN_ENV_PATH", os.path.join(HERE, "website", ".env"))
EXPECT_DB = os.environ.get("RUN_EXPECT_DB", "leocapin_main_v1")

url = make_url(dotenv_values(ENV_PATH)["DATABASE_URL"])
print("target database:", url.database, "| driver:", url.drivername)
if url.database != EXPECT_DB:
    sys.exit("ABORT: expected database %s, refusing to run" % EXPECT_DB)

MONEY = ["amount_applied", "processing_fees", "access_fees", "legal_fees",
         "disbursement_amount", "repayment_amount", "late_payment_fee", "collection_fee"]
NEW_TABLES = ["companies", "statement_uploads", "application_audits",
              "parsed_transactions", "transaction_keyword_mappings"]
NEW_COLS = {"applications": ["duration_months", "loan_product", "outstanding_balance"],
            "applicant_documents": ["admin_comment", "application_id", "status"],
            "statement_entries": ["application_id", "external_reference", "idempotency_key"],
            "users": ["reset_token", "reset_token_expiry"]}
COUNT_TABLES = ["applications", "applicant_documents", "statement_entries", "users", "applicants"]

raw = create_engine(url).raw_connection()
cur = raw.cursor()
try:
    cur.execute("set lock_timeout = '15s'")

    def scalar(sql):
        cur.execute(sql)
        return cur.fetchone()[0]

    before = {t: scalar("select count(*) from " + t) for t in COUNT_TABLES}
    print("row counts before:", before)

    bad = {c: scalar("select count(*) from applications where %s::text !~ '^\\s*-?[0-9]+(\\.[0-9]+)?\\s*$'" % c)
           for c in MONEY}
    print("bad money values:", bad)
    if any(bad.values()):
        raise RuntimeError("precheck failed: non-numeric money values")

    cur.execute(open(os.path.join(HERE, "zz_db_upgrade.sql")).read())
    print("upgrade statements executed (not yet committed)")

    after = {t: scalar("select count(*) from " + t) for t in COUNT_TABLES}
    print("row counts after:", after)
    if before != after:
        raise RuntimeError("row counts changed")
    for t in NEW_TABLES:
        if not scalar("select count(*) from information_schema.tables where table_schema='public' and table_name='%s'" % t):
            raise RuntimeError("missing new table " + t)
    for t, cols in NEW_COLS.items():
        for c in cols:
            if not scalar("select count(*) from information_schema.columns where table_schema='public' and table_name='%s' and column_name='%s'" % (t, c)):
                raise RuntimeError("missing column %s.%s" % (t, c))
    for c in MONEY:
        ty = scalar("select data_type from information_schema.columns where table_schema='public' and table_name='applications' and column_name='%s'" % c)
        if ty != "numeric":
            raise RuntimeError("%s is %s, expected numeric" % (c, ty))
    raw.commit()
    print("ALL CHECKS PASSED - COMMITTED")
except Exception as e:
    raw.rollback()
    print("FAILED, ROLLED BACK, no changes made:", type(e).__name__, str(e).splitlines()[0])
    sys.exit(1)
finally:
    raw.close()
