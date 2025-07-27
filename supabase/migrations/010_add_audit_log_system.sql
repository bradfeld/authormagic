-- Audit Log System Migration
-- Creates tables for tracking administrative actions, user changes, and system events

-- Create audit_logs table for tracking all administrative actions
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Action details
  action_type VARCHAR(100) NOT NULL, -- e.g., 'user_promote', 'user_demote', 'system_config', etc.
  action_category VARCHAR(50) NOT NULL, -- 'user_management', 'system', 'security', 'configuration'
  action_description TEXT NOT NULL, -- Human-readable description of what happened
  
  -- Who performed the action
  performed_by_user_id VARCHAR(255) NOT NULL, -- Clerk user ID of admin who performed action
  performed_by_email VARCHAR(255), -- Email for easier searching
  performed_by_name VARCHAR(255), -- Name for display purposes
  
  -- What was affected
  target_user_id VARCHAR(255), -- If action affected a specific user
  target_email VARCHAR(255), -- Email of affected user
  target_resource_type VARCHAR(100), -- 'user', 'system', 'configuration', etc.
  target_resource_id VARCHAR(255), -- ID of affected resource
  
  -- Action context
  before_state JSONB, -- State before the action (if applicable)
  after_state JSONB, -- State after the action (if applicable)
  metadata JSONB DEFAULT '{}', -- Additional context (IP address, user agent, etc.)
  
  -- Status and tracking
  status VARCHAR(50) DEFAULT 'completed', -- 'completed', 'failed', 'in_progress'
  error_message TEXT, -- If action failed, store error details
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_logs_performed_by ON audit_logs (performed_by_user_id);
CREATE INDEX idx_audit_logs_target_user ON audit_logs (target_user_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs (action_type);
CREATE INDEX idx_audit_logs_action_category ON audit_logs (action_category);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_status ON audit_logs (status);

-- Composite indexes for common queries
CREATE INDEX idx_audit_logs_category_date ON audit_logs (action_category, created_at DESC);
CREATE INDEX idx_audit_logs_performer_date ON audit_logs (performed_by_user_id, created_at DESC);

-- Create system_events table for automated system events
CREATE TABLE system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event details
  event_type VARCHAR(100) NOT NULL, -- 'health_check', 'backup', 'cleanup', 'maintenance'
  event_category VARCHAR(50) NOT NULL, -- 'monitoring', 'maintenance', 'security', 'performance'
  event_description TEXT NOT NULL,
  
  -- Event context
  service_name VARCHAR(100), -- Which service triggered the event
  severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
  
  -- Event data
  event_data JSONB DEFAULT '{}', -- Structured event data
  metrics JSONB DEFAULT '{}', -- Performance metrics if applicable
  
  -- Status
  status VARCHAR(50) DEFAULT 'completed', -- 'completed', 'failed', 'in_progress'
  error_details TEXT, -- Error information if failed
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for system_events
CREATE INDEX idx_system_events_type ON system_events (event_type);
CREATE INDEX idx_system_events_category ON system_events (event_category);
CREATE INDEX idx_system_events_severity ON system_events (severity);
CREATE INDEX idx_system_events_created_at ON system_events (created_at DESC);
CREATE INDEX idx_system_events_service ON system_events (service_name);

-- Composite indexes
CREATE INDEX idx_system_events_category_severity ON system_events (event_category, severity, created_at DESC);

-- Create security_events table for security-related events
CREATE TABLE security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Security event details
  event_type VARCHAR(100) NOT NULL, -- 'failed_login', 'suspicious_activity', 'unauthorized_access'
  severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  description TEXT NOT NULL,
  
  -- User context (if applicable)
  user_id VARCHAR(255), -- Clerk user ID if known
  user_email VARCHAR(255),
  user_ip_address INET,
  user_agent TEXT,
  
  -- Request context
  request_path VARCHAR(500),
  request_method VARCHAR(10),
  request_headers JSONB DEFAULT '{}',
  
  -- Security analysis
  threat_level VARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  blocked BOOLEAN DEFAULT FALSE, -- Whether the request was blocked
  action_taken VARCHAR(100), -- 'blocked', 'logged', 'alerted', 'escalated'
  
  -- Additional context
  location_data JSONB DEFAULT '{}', -- Geolocation if available
  device_fingerprint VARCHAR(255),
  session_data JSONB DEFAULT '{}',
  
  -- Resolution
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by VARCHAR(255), -- Admin who resolved the issue
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for security_events
CREATE INDEX idx_security_events_type ON security_events (event_type);
CREATE INDEX idx_security_events_severity ON security_events (severity);
CREATE INDEX idx_security_events_user_id ON security_events (user_id);
CREATE INDEX idx_security_events_ip ON security_events (user_ip_address);
CREATE INDEX idx_security_events_created_at ON security_events (created_at DESC);
CREATE INDEX idx_security_events_resolved ON security_events (resolved, created_at DESC);
CREATE INDEX idx_security_events_threat_level ON security_events (threat_level, created_at DESC);

-- Create triggers to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_audit_logs_updated_at
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_events_updated_at
    BEFORE UPDATE ON security_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies for audit tables
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_logs
-- Only admins can read audit logs
CREATE POLICY "Admins can read audit logs" ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.clerk_user_id = auth.uid()::text 
      AND user_roles.role = 'admin'
    )
  );

-- Only admins can insert audit logs (typically done via service functions)
CREATE POLICY "Admins can insert audit logs" ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.clerk_user_id = auth.uid()::text 
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for system_events
-- Only admins can read system events
CREATE POLICY "Admins can read system events" ON system_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.clerk_user_id = auth.uid()::text 
      AND user_roles.role = 'admin'
    )
  );

-- Service role can insert system events
CREATE POLICY "Service can insert system events" ON system_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- RLS Policies for security_events
-- Only admins can read security events
CREATE POLICY "Admins can read security events" ON security_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.clerk_user_id = auth.uid()::text 
      AND user_roles.role = 'admin'
    )
  );

-- Only admins can update security events (for resolution)
CREATE POLICY "Admins can update security events" ON security_events
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.clerk_user_id = auth.uid()::text 
      AND user_roles.role = 'admin'
    )
  );

-- Service role can insert security events
CREATE POLICY "Service can insert security events" ON security_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Create helper function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_action_type VARCHAR(100),
  p_action_category VARCHAR(50),
  p_action_description TEXT,
  p_performed_by_user_id VARCHAR(255),
  p_performed_by_email VARCHAR(255) DEFAULT NULL,
  p_performed_by_name VARCHAR(255) DEFAULT NULL,
  p_target_user_id VARCHAR(255) DEFAULT NULL,
  p_target_email VARCHAR(255) DEFAULT NULL,
  p_target_resource_type VARCHAR(100) DEFAULT NULL,
  p_target_resource_id VARCHAR(255) DEFAULT NULL,
  p_before_state JSONB DEFAULT NULL,
  p_after_state JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_status VARCHAR(50) DEFAULT 'completed',
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO audit_logs (
    action_type, action_category, action_description,
    performed_by_user_id, performed_by_email, performed_by_name,
    target_user_id, target_email, target_resource_type, target_resource_id,
    before_state, after_state, metadata, status, error_message
  ) VALUES (
    p_action_type, p_action_category, p_action_description,
    p_performed_by_user_id, p_performed_by_email, p_performed_by_name,
    p_target_user_id, p_target_email, p_target_resource_type, p_target_resource_id,
    p_before_state, p_after_state, p_metadata, p_status, p_error_message
  )
  RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the log_audit_event function
GRANT EXECUTE ON FUNCTION log_audit_event TO authenticated;
GRANT EXECUTE ON FUNCTION log_audit_event TO service_role;

-- Create view for recent admin activity
CREATE OR REPLACE VIEW recent_admin_activity AS
SELECT 
  al.id,
  al.action_type,
  al.action_category,
  al.action_description,
  al.performed_by_user_id,
  al.performed_by_email,
  al.performed_by_name,
  al.target_user_id,
  al.target_email,
  al.status,
  al.created_at,
  -- Add relative time for easy display
  CASE 
    WHEN al.created_at > NOW() - INTERVAL '1 hour' THEN 'Just now'
    WHEN al.created_at > NOW() - INTERVAL '1 day' THEN 
      EXTRACT(HOUR FROM NOW() - al.created_at) || ' hours ago'
    ELSE 
      EXTRACT(DAY FROM NOW() - al.created_at) || ' days ago'
  END as time_ago
FROM audit_logs al
WHERE al.created_at > NOW() - INTERVAL '30 days'
ORDER BY al.created_at DESC
LIMIT 100;

-- Grant access to the view
GRANT SELECT ON recent_admin_activity TO authenticated;

-- Create view for security summary
CREATE OR REPLACE VIEW security_events_summary AS
SELECT 
  event_type,
  severity,
  COUNT(*) as event_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_week_count,
  MAX(created_at) as last_occurrence,
  COUNT(*) FILTER (WHERE resolved = false) as unresolved_count
FROM security_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY event_type, severity
ORDER BY event_count DESC;

-- Grant access to the security summary view
GRANT SELECT ON security_events_summary TO authenticated; 