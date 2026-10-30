-- What each borrower accepted when applying (see backend/website/agreements.py): the exact loan agreement text they were shown, when,
-- from which address and device, a random reference and a seal. The app creates this table itself at startup (website/__init__.py);
-- run this only if that did not happen (applications are then still accepted, but no acceptance is recorded and the loan page and the
-- debt dossier say "not recorded").
-- Target: PostgreSQL leocapin_main_v1 (as the user the app connects with, or as leocapin_admin and then GRANT the app's user ALL on the
-- table). Safe to run twice. Changes no existing data. No foreign keys on purpose: deleting a loan or a person must never be blocked by it.
CREATE TABLE IF NOT EXISTS agreement_acceptances (
	id VARCHAR(36) NOT NULL,
	application_id VARCHAR(36) NOT NULL,
	applicant_id VARCHAR(36) NOT NULL,
	agreement_key VARCHAR(60) NOT NULL,
	version INTEGER NOT NULL,
	employer VARCHAR(150),
	snapshot JSON NOT NULL,
	text_hash VARCHAR(64) NOT NULL,
	accepted_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	ip_address VARCHAR(64),
	user_agent VARCHAR(300),
	device VARCHAR(80),
	reference VARCHAR(20) NOT NULL,
	seal VARCHAR(64) NOT NULL,
	seal_version INTEGER NOT NULL,
	PRIMARY KEY (id),
	UNIQUE (id),
	UNIQUE (application_id),
	UNIQUE (reference)
);
CREATE INDEX IF NOT EXISTS ix_agreement_acceptances_application_id ON agreement_acceptances (application_id);
CREATE INDEX IF NOT EXISTS ix_agreement_acceptances_applicant_id ON agreement_acceptances (applicant_id);
CREATE INDEX IF NOT EXISTS ix_agreement_acceptances_reference ON agreement_acceptances (reference);
