# Database upgrade scripts (PostgreSQL `leocapin_main_v1`)

SQL to bring the live loan-app database in line with `backend/website/models.py`. Kept outside `backend/` so the deploy never uploads it to the public API folder.

**Target: PostgreSQL `leocapin_main_v1` only.** Never run these on `leocapin_leocapconsult` (the consultancy site's MariaDB).

| File | What it does |
|---|---|
| `01_precheck_readonly.sql` | Read-only. Row counts and a check that every money value in `applications` is a clean number. All "bad" counts must be 0. |
| `02_loan_app_upgrade.sql` | Creates 5 tables, adds 11 columns, converts 8 money columns from text to `numeric(12,2)`. One transaction (all or nothing), re-runnable, drops nothing. |
| `03_verify_schema_readonly.sql` | Read-only. Compares the live schema with the models. Expect 0 rows. |
| `04_disbursement_date.sql` | Adds `applications.disbursement_date` (the app also does this itself at startup). |
| `05_site_content.sql` | Creates the two tables for the editable public pages (the app also does this itself at startup). Only needed if that did not happen. |

## Important: who owns the tables

The loan-app tables belong to `leocapin_admin`, but cPanel's phpPgAdmin signs in as `leocapin`, which cannot alter them ("must be owner of relation"). Read-only scripts (01, 03) run fine there; the upgrade (02) must run as `leocapin_admin`. Without SSH, the way that worked is `server_runner/`: upload `zz_run_db_upgrade.py` + `zz_db_upgrade.sql` to the API app folder and run the script from cPanel's Setup Python App ("Execute python script"). It reads `DATABASE_URL` from `website/.env` itself (no credentials printed), refuses any database other than `leocapin_main_v1`, and commits only if its own checks pass. Move both files out of the web folder afterwards.

**Status:** applied to the live database on 2026-10-15 (112 applications, row counts unchanged, 03 verification returned no differences). Snapshot copies `bak_20261015_*` were created beforehand and can be dropped once the new code is confirmed working.

## Running them (cPanel, no SSH)

1. cPanel → Databases → `leocapin_main_v1` → Advanced → **Open phpPgAdmin**. Confirm the database name at the top.
2. Back up first (cPanel Backup, or phpPgAdmin → Export).
3. SQL tab: paste `01_precheck_readonly.sql`, untick "Paginate results", Execute. Fix anything non-zero.
4. Paste and run `02_loan_app_upgrade.sql`. If any statement fails nothing is applied; read the error.
5. Paste and run `03_verify_schema_readonly.sql`. Expect 0 rows.
6. Only then deploy the new backend code (it seeds default companies on startup and needs the new tables).

Tested against a local PostgreSQL 14 copy of the live schema: precheck, failing run (rolls back), successful run, re-run, and the repo models reading/writing the result. The live server is PostgreSQL 10.23; everything used is available there. Run in a quiet period: the type conversion briefly locks `applications`.
