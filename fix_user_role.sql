-- Fix user role to allow model training
-- Run this SQL in your MySQL database

USE digital_channels_db;

-- Check current user
SELECT id, email, role, is_active FROM users WHERE email = 'admin@ahadubank.com';

-- Update to super_admin (allows training models)
UPDATE users 
SET role = 'super_admin' 
WHERE email = 'admin@ahadubank.com';

-- Verify the change
SELECT id, email, role, is_active FROM users WHERE email = 'admin@ahadubank.com';

-- Done! User can now train models
