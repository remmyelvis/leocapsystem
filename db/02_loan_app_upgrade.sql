-- Loan app upgrade for PostgreSQL leocapin_main_v1.
-- Brings the live schema in line with backend/website/models.py. Run ONLY on leocapin_main_v1,
-- never on leocapin_leocapconsult (consultancy site). Take a backup first. Run 01_precheck_readonly.sql
-- first and make sure every "bad" count is 0.
--
-- All-or-nothing: one transaction. If any statement fails, nothing is applied.
-- Re-runnable: uses IF NOT EXISTS, and the type casts are no-ops on already-converted columns.
-- Existing data is kept; nothing is dropped.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. New tables (definitions generated from the SQLAlchemy models for PostgreSQL)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
	id VARCHAR(36) NOT NULL,
	name VARCHAR(150) NOT NULL,
	code VARCHAR(50) NOT NULL,
	hr_email VARCHAR(120),
	contact_person VARCHAR(100),
	contact_phone VARCHAR(50),
	interest_rate FLOAT NOT NULL,
	processing_fee_rate FLOAT NOT NULL,
	access_fee_rate FLOAT NOT NULL,
	legal_fee FLOAT NOT NULL,
	repayment_cycle VARCHAR(50) NOT NULL,
	status VARCHAR(50) NOT NULL,
	bank_name VARCHAR(100),
	bank_account_number VARCHAR(100),
	bank_branch VARCHAR(100),
	notes TEXT,
	created_at TIMESTAMP WITHOUT TIME ZONE,
	PRIMARY KEY (id),
	UNIQUE (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_companies_code ON companies (code);

CREATE TABLE IF NOT EXISTS statement_uploads (
	id VARCHAR(36) NOT NULL,
	applicant_id VARCHAR(36) NOT NULL,
	filename VARCHAR(255) NOT NULL,
	filepath VARCHAR(500) NOT NULL,
	source VARCHAR(50),
	password VARCHAR(255),
	is_parsed BOOLEAN,
	parsing_error TEXT,
	uploaded_at TIMESTAMP WITHOUT TIME ZONE,
	PRIMARY KEY (id),
	UNIQUE (id),
	FOREIGN KEY(applicant_id) REFERENCES applicants (id)
);

CREATE TABLE IF NOT EXISTS application_audits (
	id VARCHAR(36) NOT NULL,
	application_id VARCHAR(36) NOT NULL,
	application_old_loan_amount FLOAT NOT NULL,
	application_new_loan_amount FLOAT NOT NULL,
	application_old_repayment_amount FLOAT NOT NULL,
	application_new_repayment_amount FLOAT NOT NULL,
	field_name VARCHAR(100) NOT NULL,
	old_status VARCHAR(255),
	new_status VARCHAR(255) NOT NULL,
	changed_by_email VARCHAR(120) NOT NULL,
	changed_by_role VARCHAR(36) NOT NULL,
	changed_by_company VARCHAR(36) NOT NULL,
	changed_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	notes TEXT,
	PRIMARY KEY (id),
	FOREIGN KEY(application_id) REFERENCES applications (id)
);

CREATE TABLE IF NOT EXISTS parsed_transactions (
	id VARCHAR(36) NOT NULL,
	applicant_id VARCHAR(36) NOT NULL,
	statement_id VARCHAR(36) NOT NULL,
	date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	description VARCHAR(500) NOT NULL,
	reference VARCHAR(100),
	money_in FLOAT,
	money_out FLOAT,
	balance FLOAT,
	category VARCHAR(100),
	is_internal_transfer BOOLEAN,
	created_at TIMESTAMP WITHOUT TIME ZONE,
	PRIMARY KEY (id),
	UNIQUE (id),
	FOREIGN KEY(applicant_id) REFERENCES applicants (id),
	FOREIGN KEY(statement_id) REFERENCES statement_uploads (id)
);

CREATE TABLE IF NOT EXISTS transaction_keyword_mappings (
	id VARCHAR(36) NOT NULL,
	keyword VARCHAR(100) NOT NULL,
	category VARCHAR(100) NOT NULL,
	added_by VARCHAR(36),
	created_at TIMESTAMP WITHOUT TIME ZONE,
	PRIMARY KEY (id),
	UNIQUE (id),
	UNIQUE (keyword)
);

-- ---------------------------------------------------------------------------
-- 2. New columns on existing tables (all nullable except outstanding_balance)
-- ---------------------------------------------------------------------------
ALTER TABLE applications
	ADD COLUMN IF NOT EXISTS duration_months INTEGER,
	ADD COLUMN IF NOT EXISTS loan_product VARCHAR(100),
	ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC(12, 2) NOT NULL DEFAULT 0;
-- the models set this in Python only, so drop the temporary DB default
ALTER TABLE applications ALTER COLUMN outstanding_balance DROP DEFAULT;

ALTER TABLE applicant_documents
	ADD COLUMN IF NOT EXISTS admin_comment TEXT,
	ADD COLUMN IF NOT EXISTS application_id VARCHAR(36) REFERENCES applications (id),
	ADD COLUMN IF NOT EXISTS status VARCHAR(50);

ALTER TABLE statement_entries
	ADD COLUMN IF NOT EXISTS application_id VARCHAR(36) REFERENCES applications (id),
	ADD COLUMN IF NOT EXISTS external_reference VARCHAR(100) UNIQUE,
	ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100) UNIQUE;

ALTER TABLE users
	ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
	ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP WITHOUT TIME ZONE;

-- Backfill the model defaults for rows that existed before these columns
UPDATE applications SET loan_product = '1_month_flat' WHERE loan_product IS NULL;
UPDATE applications SET duration_months = 1 WHERE duration_months IS NULL;
UPDATE applicant_documents SET status = 'pending' WHERE status IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Money columns: text -> numeric(12,2). Aborts the whole script if any value is not
--    a clean number (see 01_precheck_readonly.sql, check 3).
-- ---------------------------------------------------------------------------
ALTER TABLE applications ALTER COLUMN amount_applied DROP DEFAULT;
ALTER TABLE applications ALTER COLUMN processing_fees DROP DEFAULT;
ALTER TABLE applications ALTER COLUMN access_fees DROP DEFAULT;
ALTER TABLE applications ALTER COLUMN legal_fees DROP DEFAULT;
ALTER TABLE applications ALTER COLUMN disbursement_amount DROP DEFAULT;
ALTER TABLE applications ALTER COLUMN repayment_amount DROP DEFAULT;
ALTER TABLE applications ALTER COLUMN late_payment_fee DROP DEFAULT;
ALTER TABLE applications ALTER COLUMN collection_fee DROP DEFAULT;

ALTER TABLE applications
	ALTER COLUMN amount_applied TYPE NUMERIC(12, 2) USING amount_applied::numeric(12, 2),
	ALTER COLUMN processing_fees TYPE NUMERIC(12, 2) USING processing_fees::numeric(12, 2),
	ALTER COLUMN access_fees TYPE NUMERIC(12, 2) USING access_fees::numeric(12, 2),
	ALTER COLUMN legal_fees TYPE NUMERIC(12, 2) USING legal_fees::numeric(12, 2),
	ALTER COLUMN disbursement_amount TYPE NUMERIC(12, 2) USING disbursement_amount::numeric(12, 2),
	ALTER COLUMN repayment_amount TYPE NUMERIC(12, 2) USING repayment_amount::numeric(12, 2),
	ALTER COLUMN late_payment_fee TYPE NUMERIC(12, 2) USING late_payment_fee::numeric(12, 2),
	ALTER COLUMN collection_fee TYPE NUMERIC(12, 2) USING collection_fee::numeric(12, 2);

COMMIT;
