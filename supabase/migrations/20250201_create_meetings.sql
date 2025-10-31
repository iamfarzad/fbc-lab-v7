-- Meetings table for scheduling and tracking consultations
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT,
  lead_email TEXT NOT NULL,
  lead_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, confirmed, cancelled, completed, no_show
  meeting_link TEXT,
  location TEXT,
  timezone TEXT DEFAULT 'UTC',
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Meeting participants table
CREATE TABLE IF NOT EXISTS meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'attendee', -- organizer, attendee
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined, tentative
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_meetings_conversation ON meetings(conversation_id);
CREATE INDEX idx_meetings_email ON meetings(lead_email);
CREATE INDEX idx_meetings_scheduled ON meetings(scheduled_at);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meeting_participants_meeting ON meeting_participants(meeting_id);
CREATE INDEX idx_meeting_participants_email ON meeting_participants(email);

-- Enable RLS
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access meetings" ON meetings
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access participants" ON meeting_participants
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Admin read-only access
CREATE POLICY "Admin read meetings" ON meetings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin read participants" ON meeting_participants
  FOR SELECT TO authenticated
  USING (true);

