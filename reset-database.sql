-- Script to empty all tables in the database
-- WARNING: This will delete ALL data. Use with caution!

-- Disable triggers and constraints temporarily
SET session_replication_role = 'replica';

-- Delete all data from tables (in correct order to respect foreign keys)
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE envelopes CASCADE;
TRUNCATE TABLE households CASCADE;
TRUNCATE TABLE profiles CASCADE;

-- Re-enable triggers and constraints
SET session_replication_role = 'origin';

-- Verify tables are empty
SELECT 'profiles' as table_name, COUNT(*) as row_count FROM profiles
UNION ALL
SELECT 'households', COUNT(*) FROM households
UNION ALL
SELECT 'envelopes', COUNT(*) FROM envelopes
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions;
