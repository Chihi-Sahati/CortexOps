-- CortexOps Database Initialization Script
-- Runs on first PostgreSQL container startup

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create full-text search configuration for Arabic and English
-- (Optional: customize for your language needs)

-- Function to automatically update search_vector for workflows
CREATE OR REPLACE FUNCTION workflow_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update search_vector for workflow nodes
CREATE OR REPLACE FUNCTION workflow_node_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.type, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the default user for development
-- Password: "admin123" (bcrypt hashed)
-- In production, remove this and use proper registration
-- INSERT INTO users (id, email, username, "passwordHash", "fullName", role, "isActive", "createdAt", "updatedAt")
-- VALUES (
--   'default-user',
--   'admin@cortexops.dev',
--   'admin',
--   '$2b$10$placeholder_hash_change_me',
--   'Admin User',
--   'admin',
--   true,
--   NOW(),
--   NOW()
-- ) ON CONFLICT (id) DO NOTHING;
