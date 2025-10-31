-- Fix meetings schema: backfill data, add constraints, triggers, and indexes
-- This migration safely upgrades the meetings table to match the new schema

-- ============================================================================
-- 1. BACKFILL scheduled_at FROM existing meeting_date + meeting_time
-- ============================================================================
UPDATE meetings 
SET scheduled_at = (
  (meeting_date::text || ' ' || meeting_time::text)::timestamp
)::timestamptz
WHERE scheduled_at IS NULL 
  AND meeting_date IS NOT NULL 
  AND meeting_time IS NOT NULL;

-- Also handle case where we only have meeting_date
UPDATE meetings 
SET scheduled_at = meeting_date::timestamptz
WHERE scheduled_at IS NULL 
  AND meeting_date IS NOT NULL 
  AND meeting_time IS NULL;

-- ============================================================================
-- 2. BACKFILL lead_email FROM lead_id (if lead_id exists)
-- ============================================================================
-- meetings.lead_id references leads.id, so get email from leads table
UPDATE meetings m
SET lead_email = l.email
FROM leads l
WHERE m.lead_email IS NULL
  AND m.lead_id IS NOT NULL
  AND l.id::text = m.lead_id::text
  AND l.email IS NOT NULL;

-- Also try getting lead_name from leads table
UPDATE meetings m
SET lead_name = COALESCE(m.lead_name, l.name, l.first_name || ' ' || l.last_name)
FROM leads l
WHERE m.lead_id IS NOT NULL
  AND l.id::text = m.lead_id::text
  AND (l.name IS NOT NULL OR l.first_name IS NOT NULL);

-- Map meeting_url to meeting_link if meeting_link is null
UPDATE meetings 
SET meeting_link = meeting_url
WHERE meeting_link IS NULL 
  AND meeting_url IS NOT NULL;

-- Map description from notes if description is null
UPDATE meetings 
SET description = notes
WHERE description IS NULL 
  AND notes IS NOT NULL;

-- ============================================================================
-- 3. MIGRATE attendees JSON TO meeting_participants table
-- ============================================================================
-- If existing meetings have attendees as JSON, migrate to normalized table
-- Only migrate if meeting_participants doesn't already have entries for this meeting
INSERT INTO meeting_participants (meeting_id, email, name, role, status, created_at)
SELECT 
  m.id,
  COALESCE(
    (participant->>'email')::text,
    (participant->>'email_address')::text
  ) as email,
  COALESCE(
    (participant->>'name')::text,
    (participant->>'first_name')::text || ' ' || (participant->>'last_name')::text,
    'Unknown'
  ) as name,
  COALESCE(
    (participant->>'role')::text,
    'attendee'
  ) as role,
  COALESCE(
    (participant->>'status')::text,
    'pending'
  ) as status,
  COALESCE(
    (participant->>'created_at')::timestamptz,
    m.created_at,
    now()
  ) as created_at
FROM meetings m,
  jsonb_array_elements(COALESCE(m.attendees::jsonb, '[]'::jsonb)) as participant
WHERE m.attendees IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM meeting_participants mp 
    WHERE mp.meeting_id = m.id
  )
  AND COALESCE(
    (participant->>'email')::text,
    (participant->>'email_address')::text
  ) IS NOT NULL -- Only insert if we have an email
  AND COALESCE(
    (participant->>'email')::text,
    (participant->>'email_address')::text
  ) != ''; -- Skip empty emails

-- ============================================================================
-- 4. SET DEFAULT VALUES FOR required fields that might be NULL
-- ============================================================================
-- Set default timezone if null
UPDATE meetings 
SET timezone = 'UTC'
WHERE timezone IS NULL;

-- Set default status if null
UPDATE meetings 
SET status = 'scheduled'
WHERE status IS NULL;

-- Set default duration if null
UPDATE meetings 
SET duration_minutes = 30
WHERE duration_minutes IS NULL;

-- Set default created_at if null
UPDATE meetings 
SET created_at = COALESCE(created_at, now())
WHERE created_at IS NULL;

-- Set default updated_at if null
UPDATE meetings 
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

-- ============================================================================
-- 5. ADD NOT NULL CONSTRAINTS (after backfill)
-- ============================================================================
-- Only add NOT NULL if column doesn't already have it and we've backfilled

-- For scheduled_at: make NOT NULL after backfill
-- Note: We check if any NULLs remain first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM meetings WHERE scheduled_at IS NULL
  ) THEN
    -- Only alter if the constraint doesn't already exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'meetings' 
      AND constraint_name LIKE '%scheduled_at%'
      AND constraint_type = 'CHECK'
    ) THEN
      ALTER TABLE meetings 
        ALTER COLUMN scheduled_at SET NOT NULL;
    END IF;
  ELSE
    RAISE NOTICE 'Cannot add NOT NULL to scheduled_at: % rows still NULL', 
      (SELECT COUNT(*) FROM meetings WHERE scheduled_at IS NULL);
  END IF;
END $$;

-- For lead_email: make NOT NULL after backfill (but only if we have data)
-- This is optional since the constraint might already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM meetings WHERE lead_email IS NULL
  ) THEN
    -- Only add constraint if it doesn't exist
    BEGIN
      ALTER TABLE meetings 
        ALTER COLUMN lead_email SET NOT NULL;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'lead_email NOT NULL constraint may already exist or failed';
    END;
  ELSE
    RAISE NOTICE 'Cannot add NOT NULL to lead_email: % rows still NULL', 
      (SELECT COUNT(*) FROM meetings WHERE lead_email IS NULL);
  END IF;
END $$;

-- For timezone: already has DEFAULT, safe to make NOT NULL
ALTER TABLE meetings 
  ALTER COLUMN timezone SET DEFAULT 'UTC';

-- For status: already has DEFAULT, safe to make NOT NULL  
ALTER TABLE meetings 
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'scheduled';

-- For duration_minutes: already has DEFAULT, safe to make NOT NULL
ALTER TABLE meetings 
  ALTER COLUMN duration_minutes SET NOT NULL,
  ALTER COLUMN duration_minutes SET DEFAULT 30;

-- ============================================================================
-- 6. ADD updated_at TRIGGER (auto-update on row change)
-- ============================================================================
-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to meetings table
DROP TRIGGER IF EXISTS update_meetings_updated_at ON meetings;
CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. ADD COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================================================
-- Index for upcoming meetings query (used in calendar)
CREATE INDEX IF NOT EXISTS idx_meetings_upcoming 
ON meetings(scheduled_at, status) 
WHERE scheduled_at >= now() - interval '1 day' 
  AND status IN ('scheduled', 'confirmed');

-- Index for meetings by date range + status (used in admin dashboard)
CREATE INDEX IF NOT EXISTS idx_meetings_date_status 
ON meetings(scheduled_at DESC, status);

-- Index for lead lookup (if lead_email is commonly queried)
-- Already exists from previous migration, but ensure it's there
CREATE INDEX IF NOT EXISTS idx_meetings_lead_email ON meetings(lead_email);

-- Index for conversation_id lookups (linking meetings to conversations)
CREATE INDEX IF NOT EXISTS idx_meetings_conversation ON meetings(conversation_id);

-- ============================================================================
-- 8. ADD AUDIT COLUMNS (optional - for tracking who made changes)
-- ============================================================================
-- These are optional but useful if you want to track admin users
ALTER TABLE meetings 
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- Add comment explaining these columns
COMMENT ON COLUMN meetings.created_by IS 'User ID or email who created this meeting';
COMMENT ON COLUMN meetings.updated_by IS 'User ID or email who last updated this meeting';

-- ============================================================================
-- 9. OPTIMIZE meeting_participants INDEXES
-- ============================================================================
-- Composite index for common participant queries
CREATE INDEX IF NOT EXISTS idx_participants_meeting_status 
ON meeting_participants(meeting_id, status);

-- Index for finding participants by email across all meetings
CREATE INDEX IF NOT EXISTS idx_participants_email_status 
ON meeting_participants(email, status);

-- ============================================================================
-- 10. ADD HELPFUL COMMENTS
-- ============================================================================
COMMENT ON TABLE meetings IS 'Meetings table for scheduling and tracking consultations. Auto-updates updated_at on row changes.';
COMMENT ON TABLE meeting_participants IS 'Normalized participants table linked to meetings. Migrated from meetings.attendees JSON column.';
COMMENT ON COLUMN meetings.scheduled_at IS 'Combined date and time (migrated from meeting_date + meeting_time)';
COMMENT ON COLUMN meetings.lead_email IS 'Direct email reference (migrated from lead_id FK where possible)';

