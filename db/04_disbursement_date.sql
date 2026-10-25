-- The date a loan was disbursed, entered by hand (Applicant page -> Loan Applications -> Add date).
-- The app adds this column itself at startup (website/__init__.py); run this only if that did not happen.
-- Target: PostgreSQL leocapin_main_v1 (as leocapin_admin, who owns the table). Safe to run twice. Changes no data.
ALTER TABLE applications ADD COLUMN IF NOT EXISTS disbursement_date TIMESTAMP;
