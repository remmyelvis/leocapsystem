-- READ-ONLY pre-checks. Run on leocapin_main_v1 (PostgreSQL) BEFORE 02_loan_app_upgrade.sql.
-- Never run any of these files on leocapin_leocapconsult (the consultancy site's MariaDB).
-- Safe to run: SELECT only.

-- 1. Are we on the right database? Expect the loan-app tables (applicants, applications, ...).
select table_name from information_schema.tables where table_schema = 'public' order by 1;

-- 2. Row counts (note them down; compare after the upgrade).
select 'applicants' t, count(*) from applicants
union all select 'applications', count(*) from applications
union all select 'applicant_documents', count(*) from applicant_documents
union all select 'statement_entries', count(*) from statement_entries
union all select 'users', count(*) from users
union all select 'audit_logs', count(*) from audit_logs;

-- 3. Money columns that are NOT clean numbers. EVERY count must be 0, otherwise the
--    upgrade will abort (and roll back) at the text -> numeric conversion.
select 'amount_applied' col, count(*) bad from applications where amount_applied !~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$'
union all select 'processing_fees', count(*) from applications where processing_fees !~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$'
union all select 'access_fees', count(*) from applications where access_fees !~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$'
union all select 'legal_fees', count(*) from applications where legal_fees !~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$'
union all select 'disbursement_amount', count(*) from applications where disbursement_amount !~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$'
union all select 'repayment_amount', count(*) from applications where repayment_amount !~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$'
union all select 'late_payment_fee', count(*) from applications where late_payment_fee !~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$'
union all select 'collection_fee', count(*) from applications where collection_fee !~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$';

-- 4. If any count in (3) is not 0, list the offending rows (id + value) so they can be fixed by hand.
--    Example for one column; repeat for the others that showed a non-zero count:
-- select id, amount_applied from applications where amount_applied !~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$';

-- 5. Values too large for numeric(12,2) (>= 10 billion). Expect 0 rows.
select id from applications
where amount_applied ~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$' and abs(amount_applied::numeric) >= 10000000000;
