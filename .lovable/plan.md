
## Fixing SLA Configuration: Mobile UI + Full System Integration

### Problem Analysis

There are **two separate problems** to fix:

**1. Mobile UI: Dialog too large**
The `PipelineSlaSettings` dialog has no mobile-specific sizing. It needs to be more compact — similar to the reference image: compact inputs, clear hierarchy, and proper button order (Salvar first, Cancelar second).

**2. SLA Settings not affecting anything (the real bug)**
There's a **column name mismatch** between the DB and the RPC function:

```text
DB table (pipeline_sla_settings) has:    warning_hours / critical_hours  (integers, in HOURS)
RPC function (get_sla_pending_leads) reads: warn_after_seconds / overdue_after_seconds (in SECONDS)
```

The RPC `get_sla_pending_leads()` references columns `warn_after_seconds` and `overdue_after_seconds` that **don't exist** in the table. So the sla-checker Edge Function always fails silently and the SLA badges on lead cards never update.

Additionally, the `get_sla_pending_leads()` RPC also references `s.is_active` and `s.notify_assignee`, `s.notify_manager`, which also don't exist in the current schema.

**Current table columns:** `id`, `pipeline_id`, `stage_id`, `warning_hours`, `critical_hours`, `sla_start_field`, `created_at`, `updated_at`

**What's missing in the table:** `is_active`, `notify_assignee`, `notify_manager`, `organization_id`

### Solution

#### Part 1 — Fix the DB mismatch (Migration)

Update the `get_sla_pending_leads()` RPC to read `warning_hours` and `critical_hours` (converting to seconds by multiplying by 3600) instead of the non-existent `warn_after_seconds`/`overdue_after_seconds`. Also fix the `is_active` and `notify_*` column references.

```sql
CREATE OR REPLACE FUNCTION public.get_sla_pending_leads()
RETURNS TABLE (...)
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ...
    (s.warning_hours * 3600)::int as warn_after_seconds,
    (s.critical_hours * 3600)::int as overdue_after_seconds,
    true as notify_assignee,       -- default since column doesn't exist
    true as notify_manager,        -- default since column doesn't exist
    ...
  FROM leads l
  INNER JOIN pipeline_sla_settings s ON s.pipeline_id = l.pipeline_id
  WHERE l.first_response_at IS NULL
    AND (l.sla_last_checked_at IS NULL OR l.sla_last_checked_at < now() - interval '1 minute');
END;
$$;
```

#### Part 2 — Fix the UI (Mobile Compact Dialog)

Redesign `PipelineSlaSettings.tsx` to be more compact and mobile-friendly:

- Use `max-w-[340px]` instead of `sm:max-w-[500px]` for a tighter dialog
- Reduce padding and spacing
- Place inputs and "horas" label inline compactly
- Reorder footer buttons: **Salvar** (primary, orange) first, **Cancelar** second — matching the reference image
- Add a visual divider/preview showing the configured thresholds

#### Part 3 — Deploy sla-checker Edge Function

The `sla-checker` function exists in code but needs to be deployed so it actually runs. It also needs to be scheduled (cron job via `pg_cron` or Supabase scheduler) to run every ~5 minutes.

Add the cron schedule to `supabase/config.toml`:
```toml
[functions.sla-checker]
verify_jwt = false

# In the crons section:
[crons.sla-checker]
schedule = "*/5 * * * *"
function = "sla-checker"
```

### Files to Change

| File | Change |
|---|---|
| `supabase/migrations/new_migration.sql` | Fix `get_sla_pending_leads()` to use `warning_hours * 3600` and `critical_hours * 3600` |
| `supabase/functions/sla-checker/index.ts` | Minor cleanup to ensure it handles the correct field names |
| `supabase/config.toml` | Add sla-checker function config + cron schedule |
| `src/components/pipelines/PipelineSlaSettings.tsx` | Compact mobile-friendly redesign |

### Flow After Fix

```text
Admin sets: warning = 1h, critical = 4h  →  saved as warning_hours=1, critical_hours=4

Every 5 min: sla-checker runs
  → calls get_sla_pending_leads() 
  → RPC converts: 1h×3600 = 3600s warn, 4h×3600 = 14400s overdue
  → for each lead: elapsed > 3600s → sla_status='warning', badge shows ⚠️
  → elapsed > 14400s → sla_status='overdue', badge pulses 🚨
  → notifications sent to assigned broker + manager
```
