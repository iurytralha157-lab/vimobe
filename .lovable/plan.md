

# Fix: WhatsApp Sessions/Conversations Invisible Due to RLS Recursion

## Root Cause

The current RLS policies create a circular dependency chain:

```text
whatsapp_sessions SELECT policy
  → inline subquery on whatsapp_session_access (triggers RLS)
    → whatsapp_session_access SELECT policy "Users can view own access grants"
      → inline subquery on whatsapp_sessions (triggers RLS)
        → INFINITE RECURSION → Postgres error → empty results
```

The same pattern exists for `whatsapp_conversations` and `whatsapp_messages` -- their policies contain inline subqueries on `whatsapp_sessions`, which triggers `whatsapp_sessions` RLS, which triggers `whatsapp_session_access` RLS, which references `whatsapp_sessions` again.

SECURITY DEFINER functions like `user_has_session_access()` and `can_access_whatsapp_session()` already exist and were designed to break this cycle, but the current live policies use inline subqueries instead of these functions.

## Evidence

- The `whatsapp_session_access` table for Nexo Imoveis has ZERO rows, so the recursion always fails before resolving
- Fernando Silva (admin), Fernando Freitas (user), Fernando Matos (user) all report empty screens
- The database has 9 sessions and 2,277 conversations for this org, but none are visible
- No data integrity issues -- all owner_user_ids and organization_ids are valid

## Fix: Single Migration

Drop all current WhatsApp RLS policies and recreate them using the existing SECURITY DEFINER functions to prevent cross-table recursion.

### Tables affected:
1. **whatsapp_sessions** -- Replace inline subquery with `user_has_session_access(id)` 
2. **whatsapp_session_access** -- Remove 4 duplicate/conflicting SELECT policies, keep 1 clean policy using SECURITY DEFINER functions only
3. **whatsapp_conversations** -- Replace inline subqueries with `can_access_whatsapp_session(session_id)` 
4. **whatsapp_messages** -- Same pattern as conversations

### Key rules preserved:
- Super admins: full access (via `is_super_admin()`)
- Admins: see all sessions/conversations in their org (via `is_admin()`)
- Regular users: see sessions they own OR have explicit access grants
- Lead-linked conversations: accessible via `can_access_lead()` (team leaders, etc.)

### No frontend changes needed
The hooks (`useWhatsAppSessions`, `useWhatsAppConversations`, etc.) and the `WhatsAppTab` component are correct -- the problem is purely at the database RLS layer.

