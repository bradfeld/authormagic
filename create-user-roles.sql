-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  granted_by TEXT NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_clerk_user_id ON user_roles(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Enable Row Level Security
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for security
CREATE POLICY "user_roles_select" ON user_roles
  FOR SELECT USING (
    auth.uid()::text = clerk_user_id OR 
    EXISTS (SELECT 1 FROM user_roles WHERE clerk_user_id = auth.uid()::text AND role = 'admin')
  );

CREATE POLICY "user_roles_insert" ON user_roles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE clerk_user_id = auth.uid()::text AND role = 'admin')
  );

CREATE POLICY "user_roles_update" ON user_roles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE clerk_user_id = auth.uid()::text AND role = 'admin')
  );

CREATE POLICY "user_roles_delete" ON user_roles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE clerk_user_id = auth.uid()::text AND role = 'admin')
  );

-- Add helpful comments
COMMENT ON TABLE user_roles IS 'User role assignments for authorization';
COMMENT ON COLUMN user_roles.clerk_user_id IS 'Clerk user ID from authentication';
COMMENT ON COLUMN user_roles.role IS 'User role: admin or user';
COMMENT ON COLUMN user_roles.granted_by IS 'Clerk user ID of who granted this role'; 