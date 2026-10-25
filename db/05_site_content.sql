-- The editable text of the public pages (Admin -> Site content). The app creates these two tables itself at startup
-- (website/__init__.py); run this only if that did not happen (the editor then answers with an error and the public
-- pages simply keep showing their built-in text).
-- Target: PostgreSQL leocapin_main_v1 (as the user the app connects with, or as leocapin_admin and then GRANT the app's user
-- ALL on both tables and on the sequence site_content_versions_id_seq). Safe to run twice. Changes no existing data.
CREATE TABLE IF NOT EXISTS site_content (
	key VARCHAR(60) NOT NULL,
	draft JSON,
	published JSON,
	version INTEGER NOT NULL,
	draft_by VARCHAR(120),
	draft_at TIMESTAMP WITHOUT TIME ZONE,
	published_by VARCHAR(120),
	published_at TIMESTAMP WITHOUT TIME ZONE,
	PRIMARY KEY (key)
);
CREATE TABLE IF NOT EXISTS site_content_versions (
	id SERIAL NOT NULL,
	key VARCHAR(60) NOT NULL,
	version INTEGER NOT NULL,
	action VARCHAR(20) NOT NULL,
	data JSON,
	by_email VARCHAR(120),
	created_at TIMESTAMP WITHOUT TIME ZONE,
	PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS ix_site_content_versions_key ON site_content_versions (key);
