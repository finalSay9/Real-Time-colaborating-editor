-- Each service owns its own database — this enforces the
-- database-per-service rule at the infrastructure level
CREATE DATABASE auth_db;
CREATE DATABASE document_db;

-- Grant the admin user access to both
GRANT ALL PRIVILEGES ON DATABASE auth_db TO admin;
GRANT ALL PRIVILEGES ON DATABASE document_db TO admin;