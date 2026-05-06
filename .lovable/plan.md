I will ensure the Meta webhook follows a strict 'Active Form' policy for lead generation.

1. Review and refine the `meta-webhook` Edge Function:
   - Verify that the `leadgen` event (Meta Lead Ads) strictly requires an entry in the `meta_form_configs` table with `is_active = true`.
   - Ensure that if no active configuration is found for a specific `form_id`, the lead is intentionally skipped and logged.
   - Remove any potential "auto-create" or "permissive" fallbacks that might have been added to bypass the form configuration requirement.
   - Add detailed logging for skipped leads to help identify which forms are being ignored and why (e.g., 'Form ID X is inactive' or 'Form ID X not found in configuration').

2. Verification:
   - Check the `meta_form_configs` for the mentioned accounts (Nexo, Daniel Thomaz, Rede Nardo) to ensure their current forms are marked as active and have the correct mappings.
   - Verify that the logic correctly handles cases where multiple organizations might be linked to the same Facebook Page.

Technical details:
- File: `supabase/functions/meta-webhook/index.ts`
- Logic: The loop over `entry.changes` for `field === 'leadgen'` will continue to require a successful `maybeSingle()` fetch from `meta_form_configs` where `is_active` is true.
- If `formConfig` is null, the process for that specific integration/form combination will `continue` (skip).
