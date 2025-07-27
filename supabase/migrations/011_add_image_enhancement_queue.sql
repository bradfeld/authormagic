-- Image Enhancement Queue Migration
-- Creates a background job queue for enhancing secondary book images

-- Create image_enhancement_queue table for background image processing
CREATE TABLE image_enhancement_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Book identification
  isbn VARCHAR(20) NOT NULL, -- ISBN of book that needs image enhancement
  title VARCHAR(500) NOT NULL, -- Book title for logging/debugging
  author VARCHAR(500), -- Book author for context
  
  -- Source information
  source VARCHAR(50) NOT NULL, -- 'isbn-db', 'google-books', etc.
  search_context JSONB DEFAULT '{}', -- Original search terms that found this book
  
  -- Job processing details
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'skipped'
  priority INTEGER DEFAULT 5, -- 1 = highest, 10 = lowest priority
  attempts INTEGER DEFAULT 0, -- Number of processing attempts
  max_attempts INTEGER DEFAULT 3, -- Maximum retry attempts
  
  -- Enhancement data
  current_image_url TEXT, -- Current image URL (may be null/broken)
  enhanced_image_url TEXT, -- New enhanced image URL after processing
  enhancement_metadata JSONB DEFAULT '{}', -- Additional enhancement details
  
  -- Error tracking
  last_error TEXT, -- Last error message if failed
  error_history JSONB DEFAULT '[]', -- Array of previous errors
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When to process this job
  started_at TIMESTAMP WITH TIME ZONE, -- When processing started
  completed_at TIMESTAMP WITH TIME ZONE, -- When processing completed
  
  -- Optional parent context (for grouping related enhancements)
  parent_search_id UUID, -- Link to original search that generated this job
  edition_group_id TEXT -- Edition group this book belongs to
);

-- Create indexes for efficient job processing
CREATE INDEX idx_image_queue_status ON image_enhancement_queue (status);
CREATE INDEX idx_image_queue_priority ON image_enhancement_queue (priority, created_at);
CREATE INDEX idx_image_queue_scheduled ON image_enhancement_queue (scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_image_queue_isbn ON image_enhancement_queue (isbn);
CREATE INDEX idx_image_queue_attempts ON image_enhancement_queue (attempts, max_attempts);

-- Composite indexes for job processing
CREATE INDEX idx_image_queue_ready_jobs ON image_enhancement_queue (status, priority, scheduled_for) 
  WHERE status = 'pending' AND scheduled_for <= NOW();
CREATE INDEX idx_image_queue_failed_retry ON image_enhancement_queue (status, attempts, max_attempts)
  WHERE status = 'failed' AND attempts < max_attempts;

-- Create job processing statistics view
CREATE OR REPLACE VIEW image_enhancement_stats AS
SELECT 
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_jobs,
  COUNT(*) FILTER (WHERE status = 'processing') as processing_jobs,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
  COUNT(*) FILTER (WHERE status = 'skipped') as skipped_jobs,
  COUNT(*) FILTER (WHERE status = 'failed' AND attempts < max_attempts) as retryable_jobs,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) FILTER (WHERE status = 'completed') as avg_processing_time_seconds,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as jobs_last_24h,
  COUNT(*) FILTER (WHERE completed_at > NOW() - INTERVAL '24 hours' AND status = 'completed') as completed_last_24h
FROM image_enhancement_queue;

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_image_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_image_queue_updated_at
  BEFORE UPDATE ON image_enhancement_queue
  FOR EACH ROW EXECUTE FUNCTION update_image_queue_updated_at();

-- Function to add books to enhancement queue (prevents duplicates)
CREATE OR REPLACE FUNCTION enqueue_image_enhancement(
  p_isbn VARCHAR(20),
  p_title VARCHAR(500),
  p_author VARCHAR(500) DEFAULT NULL,
  p_source VARCHAR(50) DEFAULT 'isbn-db',
  p_search_context JSONB DEFAULT '{}',
  p_priority INTEGER DEFAULT 5,
  p_parent_search_id UUID DEFAULT NULL,
  p_edition_group_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_job_id UUID;
  v_existing_job_id UUID;
BEGIN
  -- Check if job already exists for this ISBN (prevent duplicates)
  SELECT id INTO v_existing_job_id 
  FROM image_enhancement_queue 
  WHERE isbn = p_isbn 
    AND status IN ('pending', 'processing', 'completed');
  
  -- If job exists and is not failed, return existing job ID
  IF v_existing_job_id IS NOT NULL THEN
    RETURN v_existing_job_id;
  END IF;
  
  -- Create new enhancement job
  INSERT INTO image_enhancement_queue (
    isbn, title, author, source, search_context, priority,
    parent_search_id, edition_group_id
  ) VALUES (
    p_isbn, p_title, p_author, p_source, p_search_context, p_priority,
    p_parent_search_id, p_edition_group_id
  ) RETURNING id INTO v_job_id;
  
  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get next jobs to process
CREATE OR REPLACE FUNCTION get_next_enhancement_jobs(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  job_id UUID,
  isbn VARCHAR(20),
  title VARCHAR(500),
  author VARCHAR(500),
  source VARCHAR(50),
  priority INTEGER,
  attempts INTEGER
) AS $$
BEGIN
  RETURN QUERY
  UPDATE image_enhancement_queue 
  SET 
    status = 'processing',
    started_at = NOW(),
    attempts = attempts + 1
  WHERE id IN (
    SELECT ieq.id 
    FROM image_enhancement_queue ieq
    WHERE ieq.status = 'pending'
      AND ieq.scheduled_for <= NOW()
      AND ieq.attempts < ieq.max_attempts
    ORDER BY ieq.priority ASC, ieq.created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED  -- Prevent race conditions
  )
  RETURNING id, isbn, title, author, source, priority, attempts;
END;
$$ LANGUAGE plpgsql;

-- Function to mark job as completed
CREATE OR REPLACE FUNCTION complete_enhancement_job(
  p_job_id UUID,
  p_enhanced_image_url TEXT,
  p_enhancement_metadata JSONB DEFAULT '{}'
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE image_enhancement_queue 
  SET 
    status = 'completed',
    enhanced_image_url = p_enhanced_image_url,
    enhancement_metadata = p_enhancement_metadata,
    completed_at = NOW()
  WHERE id = p_job_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to mark job as failed
CREATE OR REPLACE FUNCTION fail_enhancement_job(
  p_job_id UUID,
  p_error_message TEXT,
  p_reschedule_after_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
  v_attempts INTEGER;
  v_max_attempts INTEGER;
BEGIN
  -- Get current attempt count
  SELECT attempts, max_attempts 
  INTO v_attempts, v_max_attempts
  FROM image_enhancement_queue 
  WHERE id = p_job_id;
  
  -- Update job with error
  UPDATE image_enhancement_queue 
  SET 
    status = CASE 
      WHEN v_attempts >= v_max_attempts THEN 'failed'
      ELSE 'pending'  -- Reset to pending for retry
    END,
    last_error = p_error_message,
    error_history = error_history || jsonb_build_array(jsonb_build_object(
      'error', p_error_message,
      'attempt', v_attempts,
      'timestamp', NOW()
    )),
    scheduled_for = CASE 
      WHEN v_attempts >= v_max_attempts THEN scheduled_for  -- Don't reschedule if max attempts reached
      ELSE NOW() + INTERVAL '1 minute' * p_reschedule_after_minutes  -- Reschedule for retry
    END
  WHERE id = p_job_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE image_enhancement_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can read all enhancement queue data
CREATE POLICY "Admins can read image enhancement queue" ON image_enhancement_queue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.clerk_user_id = auth.uid()::text 
      AND user_roles.role = 'admin'
    )
  );

-- Service role can manage all queue operations
CREATE POLICY "Service can manage image enhancement queue" ON image_enhancement_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users (API routes) can insert and update queue jobs
CREATE POLICY "API can manage image enhancement queue" ON image_enhancement_queue
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT ON image_enhancement_stats TO authenticated;
GRANT EXECUTE ON FUNCTION enqueue_image_enhancement TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_enhancement_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION complete_enhancement_job TO authenticated;
GRANT EXECUTE ON FUNCTION fail_enhancement_job TO authenticated;

-- Grant service role permissions
GRANT ALL ON image_enhancement_queue TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role; 