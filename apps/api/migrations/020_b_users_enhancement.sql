-- Migration: 024_users_enhancement
-- Description: Enhance users table with additional fields for full user management

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS title VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Tokyo';
ALTER TABLE users ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'ja_JP';
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS about_me TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS system_modstamp UUID DEFAULT uuid_generate_v4();

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_users_manager ON users(tenant_id, manager_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(tenant_id, display_name) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(tenant_id, username) WHERE username IS NOT NULL;

-- Update display_name for existing users (concat first_name and last_name)
UPDATE users
SET display_name = COALESCE(
    CASE
        WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN first_name || ' ' || last_name
        WHEN first_name IS NOT NULL THEN first_name
        ELSE last_name
    END,
    email
)
WHERE display_name IS NULL;

-- Update username for existing users (use email prefix)
UPDATE users
SET username = SPLIT_PART(email, '@', 1)
WHERE username IS NULL;

-- Add comments
COMMENT ON COLUMN users.display_name IS 'Full display name (auto-generated from first/last name)';
COMMENT ON COLUMN users.username IS 'Unique username within tenant';
COMMENT ON COLUMN users.manager_id IS 'Manager user for reporting hierarchy';
COMMENT ON COLUMN users.timezone IS 'User timezone for date/time display';
COMMENT ON COLUMN users.locale IS 'User locale for formatting';

-- OWD Setting
INSERT INTO org_wide_defaults (tenant_id, object_name, internal_access, external_access)
SELECT id, 'User', 'PublicReadOnly', 'Private'
FROM tenants
ON CONFLICT (tenant_id, object_name) DO NOTHING;
