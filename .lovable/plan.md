I will prepare a SQL script to ensure the database structure is fully compatible with the current WhatsApp integration and fix the QR code generation issue by improving the Edge Function's communication with the Evolution Go API.

### SQL Improvements
- Create or update the `whatsapp_sessions` table with all required columns (`provider`, `instance_id`, `display_name`, etc.).
- Ensure `whatsapp_session_access`, `whatsapp_conversations`, and `whatsapp_messages` tables exist with proper constraints and RLS policies.
- Add necessary indices for performance.
- Ensure the `get_user_organization_id()` and `is_admin()` functions are present and working.

### Code Improvements
- **Edge Function (`evolution-go-proxy`)**:
  - Update the authentication logic to handle cases where the instance token might not be accepted as a global API key.
  - Improve error logging to diagnose why the API returns 401.
  - Fix QR code normalization to handle different field name capitalizations from Evolution Go.
- **Frontend Hook (`use-whatsapp-sessions.ts`)**:
  - Include the `instance_id` in the webhook URL query parameters to ensure the webhook can identify the session even if the instance ID is missing from headers.
  - Ensure the `token` is persisted correctly in `advanced_settings`.

### Technical Details
- The SQL script will use `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` to be non-destructive.
- The webhook URL update: `${SUPABASE_URL}/functions/v1/evolution-go-webhook?instance_id=${evoId}`.
- Authentication fallback in proxy: If a call with an instance token fails, retry with the global API key if applicable.
