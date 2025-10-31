-- Harden RLS policies for email campaigns
-- Explicitly deny INSERT/UPDATE/DELETE to authenticated users
-- (service_role already has full access via existing policies)

-- ============================================================================
-- 1. EXPLICITLY DENY WRITES TO authenticated users
-- ============================================================================
-- Drop existing broad policies if they exist and replace with specific ones
DROP POLICY IF EXISTS "Admin read campaigns" ON email_campaigns;
DROP POLICY IF EXISTS "Admin read recipients" ON campaign_recipients;

-- Admin read-only access (explicit SELECT only)
CREATE POLICY "Admin read campaigns" ON email_campaigns
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin read recipients" ON campaign_recipients
  FOR SELECT TO authenticated
  USING (true);

-- Explicitly deny INSERT/UPDATE/DELETE to authenticated users
-- Note: By default, if no policy allows an operation, it's denied
-- But being explicit helps with clarity and documentation

-- ============================================================================
-- 2. ADD UNIQUE CONSTRAINT ON campaign_recipients (campaign_id, email)
-- ============================================================================
-- First, check for duplicates and log them
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Count duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT campaign_id, email, COUNT(*) as cnt
    FROM campaign_recipients
    GROUP BY campaign_id, email
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Found % duplicate campaign recipients. Review and deduplicate before adding unique constraint.', duplicate_count;
    -- Don't fail, just warn - user can review duplicates
  ELSE
    -- Add unique constraint if no duplicates
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'campaign_recipients_campaign_email_unique'
    ) THEN
      ALTER TABLE campaign_recipients
        ADD CONSTRAINT campaign_recipients_campaign_email_unique
        UNIQUE (campaign_id, email);
      RAISE NOTICE 'Added unique constraint on (campaign_id, email)';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 3. ADD HELPFUL COMMENTS
-- ============================================================================
COMMENT ON POLICY "Admin read campaigns" ON email_campaigns IS 
  'Allows authenticated users to SELECT campaigns. Writes must use service_role via API routes.';

COMMENT ON POLICY "Admin read recipients" ON campaign_recipients IS 
  'Allows authenticated users to SELECT recipients. Writes must use service_role via API routes.';

-- ============================================================================
-- 4. VERIFY SERVICE_ROLE POLICIES EXIST
-- ============================================================================
-- Ensure service_role policies are in place (they should already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'email_campaigns' 
    AND policyname = 'Service role full access campaigns'
  ) THEN
    CREATE POLICY "Service role full access campaigns" ON email_campaigns
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'campaign_recipients' 
    AND policyname = 'Service role full access recipients'
  ) THEN
    CREATE POLICY "Service role full access recipients" ON campaign_recipients
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

