

# Fix: Distribution must respect member availability schedule

## Problem
The `handle_lead_intake` function (latest version from migration `20260217`) selects the next round-robin member like this:

```text
SELECT rrm.user_id INTO v_next_user_id
FROM round_robin_members rrm
JOIN users u ON u.id = rrm.user_id
WHERE rrm.round_robin_id = v_queue.id
  AND u.is_active = true          ← only checks if user account is active
ORDER BY rrm.leads_count ASC NULLS FIRST, rrm.position ASC
LIMIT 1;
```

It does **not** call `public.is_member_available(user_id)`, which checks the `member_availability` table for day-of-week and time-of-day. So leads get distributed to members even when they are outside their configured schedule.

The `is_member_available()` function already exists and works correctly — it was used in older versions of the distribution logic but got lost in a rewrite.

## Fix (single SQL migration)

Add `AND public.is_member_available(rrm.user_id)` to the member selection query in `handle_lead_intake`. This is the only change needed:

```sql
SELECT rrm.user_id INTO v_next_user_id
FROM round_robin_members rrm
JOIN users u ON u.id = rrm.user_id
WHERE rrm.round_robin_id = v_queue.id
  AND u.is_active = true
  AND public.is_member_available(rrm.user_id)   ← ADD THIS
ORDER BY rrm.leads_count ASC NULLS FIRST, rrm.position ASC
LIMIT 1;
```

The full function will be recreated via `CREATE OR REPLACE` with this single-line addition. No other files or tables need changes.

## Impact
- Members outside their configured schedule will be skipped
- If **no** member is available, the existing fallback logic kicks in (assigns to admin or sends to pool)
- The `is_member_available` function already returns `true` when no availability is configured, so members without schedules remain eligible (no breaking change)

