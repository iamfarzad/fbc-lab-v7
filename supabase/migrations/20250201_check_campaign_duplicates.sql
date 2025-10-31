-- Check for duplicate campaign recipients
-- Run this before applying the unique constraint migration
-- This is a read-only diagnostic query

-- ============================================================================
-- DIAGNOSTIC: Find duplicate campaign recipients
-- ============================================================================
SELECT 
  campaign_id,
  email,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY created_at) as recipient_ids,
  array_agg(status ORDER BY created_at) as statuses,
  array_agg(created_at ORDER BY created_at) as created_times
FROM campaign_recipients
GROUP BY campaign_id, email
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, campaign_id;

-- ============================================================================
-- SUMMARY: Count total duplicates
-- ============================================================================
SELECT 
  COUNT(DISTINCT (campaign_id, email)) as duplicate_groups,
  SUM(cnt - 1) as total_duplicate_rows
FROM (
  SELECT campaign_id, email, COUNT(*) as cnt
  FROM campaign_recipients
  GROUP BY campaign_id, email
  HAVING COUNT(*) > 1
) duplicates;

-- ============================================================================
-- SUGGESTED CLEANUP (review before running):
-- ============================================================================
-- If you want to keep the most recent recipient and delete older duplicates:
/*
DELETE FROM campaign_recipients
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (PARTITION BY campaign_id, email ORDER BY created_at DESC) as rn
    FROM campaign_recipients
  ) ranked
  WHERE rn > 1
);
*/

