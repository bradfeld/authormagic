-- Migration: Add Waitlist System
-- Implements user status tracking and admin role management
-- Auto-approves brad@feld.com as the initial admin

-- ===== WAITLIST STATUS TRACKING =====

-- Add status tracking fields to authors table
ALTER TABLE authors 
ADD COLUMN status TEXT DEFAULT 'waitlisted' 
  CHECK (status IN ('waitlisted', 'approved', 'blocked')),
ADD COLUMN waitlist_position INTEGER,
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN admin_notes TEXT;

-- Create index for status queries
CREATE INDEX idx_authors_status ON authors(status);
CREATE INDEX idx_authors_waitlist_position ON authors(waitlist_position);

-- ===== ADMIN ROLE SYSTEM =====

-- Create user roles table for admin management
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  granted_by TEXT, -- clerk_user_id of admin who granted this role
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one role per user
  UNIQUE(clerk_user_id, role)
);

-- Create indexes for role queries
CREATE INDEX idx_user_roles_clerk_user_id ON user_roles(clerk_user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- Add updated_at trigger for user_roles
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== ROW LEVEL SECURITY FOR ROLES =====

-- Enable RLS on user_roles table
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Admin users can view all roles
CREATE POLICY "admins_can_view_all_roles" ON user_roles
  FOR SELECT USING (
    auth.uid()::text IN (
      SELECT clerk_user_id FROM user_roles WHERE role = 'admin'
    )
  );

-- Admin users can manage roles
CREATE POLICY "admins_can_manage_roles" ON user_roles
  FOR ALL USING (
    auth.uid()::text IN (
      SELECT clerk_user_id FROM user_roles WHERE role = 'admin'
    )
  );

-- Users can view their own role
CREATE POLICY "users_can_view_own_role" ON user_roles
  FOR SELECT USING (auth.uid()::text = clerk_user_id);

-- ===== WAITLIST POSITION MANAGEMENT =====

-- Function to automatically assign waitlist positions
CREATE OR REPLACE FUNCTION assign_waitlist_position()
RETURNS TRIGGER AS $$
BEGIN
  -- Only assign position if user is waitlisted and doesn't have one
  IF NEW.status = 'waitlisted' AND NEW.waitlist_position IS NULL THEN
    SELECT COALESCE(MAX(waitlist_position), 0) + 1 
    INTO NEW.waitlist_position 
    FROM authors 
    WHERE status = 'waitlisted';
  END IF;
  
  -- Clear position if status is not waitlisted
  IF NEW.status != 'waitlisted' THEN
    NEW.waitlist_position = NULL;
  END IF;
  
  -- Set approved_at timestamp when approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.approved_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for waitlist position management
CREATE TRIGGER manage_waitlist_position 
  BEFORE INSERT OR UPDATE ON authors
  FOR EACH ROW EXECUTE FUNCTION assign_waitlist_position();

-- ===== COMMENTS FOR DOCUMENTATION =====

COMMENT ON COLUMN authors.status IS 'User approval status: waitlisted (default), approved, or blocked';
COMMENT ON COLUMN authors.waitlist_position IS 'Position in waitlist queue (1 = first, NULL for non-waitlisted)';
COMMENT ON COLUMN authors.approved_at IS 'Timestamp when user was approved for platform access';
COMMENT ON COLUMN authors.admin_notes IS 'Internal notes about the user for admin reference';

COMMENT ON TABLE user_roles IS 'User role assignments for access control (admin, user)';
COMMENT ON COLUMN user_roles.granted_by IS 'Clerk user ID of admin who granted this role';

-- ===== INITIAL DATA SETUP =====

-- Note: Auto-approval of brad@feld.com will be handled in the application code
-- since we need to match against Clerk user data, not email directly stored in DB

-- Create a function that can be called to setup initial admin
CREATE OR REPLACE FUNCTION setup_initial_admin(brad_clerk_user_id TEXT)
RETURNS VOID AS $$
BEGIN
  -- Update brad's author record to approved status
  UPDATE authors 
  SET 
    status = 'approved',
    approved_at = NOW(),
    waitlist_position = NULL,
    admin_notes = 'Initial admin - auto-approved'
  WHERE clerk_user_id = brad_clerk_user_id;
  
  -- Add admin role for brad
  INSERT INTO user_roles (clerk_user_id, role, granted_by)
  VALUES (brad_clerk_user_id, 'admin', brad_clerk_user_id)
  ON CONFLICT (clerk_user_id, role) DO NOTHING;
  
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION setup_initial_admin IS 'One-time function to setup brad@feld.com as initial admin'; 