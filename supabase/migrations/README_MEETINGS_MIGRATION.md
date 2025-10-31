# Meetings Schema Migration Guide

## Overview

This migration (`20250201_fix_meetings_schema.sql`) safely upgrades your existing `meetings` table to match the new schema required by the admin panel, while preserving all existing data.

## What This Migration Does

### 1. **Data Backfill**
- ✅ Backfills `scheduled_at` from `meeting_date` + `meeting_time`
- ✅ Backfills `lead_email` from `leads` table via `lead_id` FK
- ✅ Backfills `lead_name` from `leads` table
- ✅ Maps `meeting_url` → `meeting_link`
- ✅ Maps `notes` → `description`
- ✅ Migrates `attendees` JSON → `meeting_participants` table (normalized)

### 2. **Default Values**
- Sets defaults for: `timezone`, `status`, `duration_minutes`, `created_at`, `updated_at`

### 3. **Constraints**
- Adds NOT NULL constraints (only after successful backfill)
- Checks for existing NULLs before adding constraints
- Handles edge cases gracefully

### 4. **Automation**
- ✅ Adds `updated_at` trigger (auto-updates on row changes)
- Uses shared function `update_updated_at_column()` (also used by email_campaigns)

### 5. **Performance**
- ✅ Composite index: `(scheduled_at, status)` for upcoming meetings queries
- ✅ Composite index: `(scheduled_at DESC, status)` for date range queries
- ✅ Participant indexes: `(meeting_id, status)` and `(email, status)`

### 6. **Optional Enhancements**
- Adds `created_by` and `updated_by` audit columns
- Adds helpful table/column comments

## Before Running

### Check Your Data

Run these queries to see what needs migration:

```sql
-- Check for meetings needing scheduled_at backfill
SELECT id, meeting_date, meeting_time, scheduled_at 
FROM meetings 
WHERE scheduled_at IS NULL 
  AND (meeting_date IS NOT NULL OR meeting_time IS NOT NULL);

-- Check for meetings needing lead_email backfill
SELECT id, lead_id, lead_email 
FROM meetings 
WHERE lead_email IS NULL AND lead_id IS NOT NULL;

-- Check for attendees JSON that needs migration
SELECT id, attendees 
FROM meetings 
WHERE attendees IS NOT NULL 
  AND jsonb_array_length(attendees::jsonb) > 0;
```

## Running the Migration

### Option 1: Via Supabase Dashboard
1. Open Supabase Dashboard → SQL Editor
2. Copy/paste the entire migration file
3. Run it
4. Check for any NOTICE messages (these are informational, not errors)

### Option 2: Via Supabase CLI
```bash
supabase db push
```

## After Migration

### Verify Success

```sql
-- Should return 0 (all scheduled_at backfilled)
SELECT COUNT(*) FROM meetings WHERE scheduled_at IS NULL;

-- Check participant migration
SELECT 
  COUNT(DISTINCT m.id) as meetings_with_participants,
  COUNT(mp.id) as total_participants
FROM meetings m
LEFT JOIN meeting_participants mp ON mp.meeting_id = m.id
WHERE m.attendees IS NOT NULL;

-- Verify triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'meetings';

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'meetings' 
ORDER BY indexname;
```

## What If Something Fails?

### Partial Backfill
If some rows can't be backfilled (e.g., `lead_id` doesn't exist in `leads` table):
- The migration will NOT add NOT NULL constraints to those columns
- You'll see a NOTICE message with the count
- Manually backfill or set defaults, then re-run the constraint section

### Rollback (if needed)
```sql
-- Remove NOT NULL constraints (if added)
ALTER TABLE meetings ALTER COLUMN scheduled_at DROP NOT NULL;
ALTER TABLE meetings ALTER COLUMN lead_email DROP NOT NULL;

-- Remove triggers
DROP TRIGGER IF EXISTS update_meetings_updated_at ON meetings;
```

## Next Steps

1. ✅ **Run the migration** (see above)
2. ✅ **Verify data** using the queries above
3. ✅ **Test admin panel** - meetings calendar should work
4. ⏳ **Optional: Update API code** to populate `created_by`/`updated_by` if you want audit trails
5. ⏳ **Future: Build reminder function** (Edge Function + cron job)

## Common Questions

**Q: Will this break existing code that uses `meeting_date`/`meeting_time`?**  
A: No - the migration adds new columns but doesn't remove old ones. You can gradually migrate your code.

**Q: What if `lead_id` doesn't match any lead?**  
A: The migration handles this gracefully - `lead_email` stays NULL, and NOT NULL constraint won't be added.

**Q: Can I keep using `attendees` JSON column?**  
A: Yes, but it's better to use `meeting_participants` table for normalized data. The migration copies data once.

**Q: What about `meeting_type` column?**  
A: The new schema doesn't include it. If you need it, you can add it manually:
```sql
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_type TEXT;
```

## Schema Comparison

| Old Schema | New Schema | Migration Action |
|-----------|-----------|------------------|
| `meeting_date` + `meeting_time` | `scheduled_at` | Combined & backfilled |
| `lead_id` (FK) | `lead_email` (TEXT) | Backfilled from `leads` table |
| `meeting_url` | `meeting_link` | Mapped |
| `notes` | `description` | Mapped |
| `attendees` (JSON) | `meeting_participants` (table) | Migrated to normalized table |

## Performance Notes

The composite indexes significantly speed up:
- Calendar queries: "Show upcoming meetings"
- Admin dashboard: "Meetings this month"
- Participant lookups: "Who's attending meeting X?"

All queries in `app/api/admin/meetings/route.ts` will benefit from these indexes.

