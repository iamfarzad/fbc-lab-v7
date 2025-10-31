-- Email campaigns table
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  template TEXT NOT NULL,
  target_segment TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, sending, sent, cancelled
  sent_count INTEGER DEFAULT 0,
  total_recipients INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Campaign recipients table
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  conversation_id TEXT,
  email TEXT NOT NULL,
  name TEXT,
  lead_score INTEGER,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed, opened, clicked
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_campaigns_status ON email_campaigns(status);
CREATE INDEX idx_campaigns_created ON email_campaigns(created_at DESC);
CREATE INDEX idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_email ON campaign_recipients(email);
CREATE INDEX idx_campaign_recipients_status ON campaign_recipients(status);

-- Enable RLS
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access campaigns" ON email_campaigns
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access recipients" ON campaign_recipients
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Admin read-only access
CREATE POLICY "Admin read campaigns" ON email_campaigns
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin read recipients" ON campaign_recipients
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================================
-- OPTIONAL: Add updated_at trigger for email_campaigns
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to email_campaigns table
DROP TRIGGER IF EXISTS update_email_campaigns_updated_at ON email_campaigns;
CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- OPTIONAL: Add composite indexes for common queries
-- ============================================================================
-- Index for scheduled campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled 
ON email_campaigns(scheduled_at, status) 
WHERE scheduled_at IS NOT NULL AND status = 'scheduled';

-- Index for active campaigns (sent or sending)
CREATE INDEX IF NOT EXISTS idx_campaigns_active 
ON email_campaigns(status) 
WHERE status IN ('sending', 'sent');

-- Composite index for recipient status lookups
CREATE INDEX IF NOT EXISTS idx_recipients_campaign_status 
ON campaign_recipients(campaign_id, status);

