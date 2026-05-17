import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DispatchParams {
  event_key: string;
  organization_id: string;
  user_id?: string;
  recipient?: string;
  variables: Record<string, any>;
  dedupe_key?: string;
  lead_id?: string;
  is_test?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const params: DispatchParams = await req.json();
    const { event_key, organization_id, user_id, recipient, variables, dedupe_key, lead_id, is_test } = params;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`[NotificationDispatcher] Processing event: ${event_key} for org: ${organization_id}`);

    // 1. Fetch template by event_key
    const { data: template, error: templateError } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('event_key', event_key)
      .eq('is_active', true)
      .maybeSingle();

    if (templateError || !template) {
      console.warn(`[NotificationDispatcher] Template for event ${event_key} not found or inactive.`);
      return new Response(JSON.stringify({ success: false, error: 'Template not found' }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Check Deduplication
    const finalDedupeKey = dedupe_key || `${event_key}:${lead_id || user_id || recipient}`;
    const windowSeconds = template.dedupe_window_seconds || 60;

    if (!is_test) {
      const { data: existingLog } = await supabase
        .from('notification_logs')
        .select('id')
        .eq('dedupe_key', finalDedupeKey)
        .gt('created_at', new Date(Date.now() - windowSeconds * 1000).toISOString())
        .limit(1)
        .maybeSingle();

      if (existingLog) {
        console.log(`[NotificationDispatcher] Deduplicated event ${event_key} for key ${finalDedupeKey}`);
        return new Response(JSON.stringify({ success: true, deduplicated: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // 3. Format message and title
    let formattedMessage = template.message;
    let formattedTitle = template.title || '';

    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{${key}}`;
        formattedMessage = formattedMessage.replace(new RegExp(placeholder, 'g'), String(value));
        if (formattedTitle) {
          formattedTitle = formattedTitle.replace(new RegExp(placeholder, 'g'), String(value));
        }
      });
    }

    // 4. Dispatch for each channel
    const channels = template.channels || [template.channel];
    const dispatchResults = await Promise.all(channels.map(async (channel: string) => {
      let result: any = { success: false };
      const startTime = performance.now();

      try {
        if (channel === 'system' && user_id) {
          const { error } = await supabase.from('notifications').insert({
            user_id: user_id,
            organization_id: organization_id,
            title: formattedTitle || template.name,
            content: formattedMessage,
            type: template.category || 'info',
            lead_id: lead_id || null,
            is_read: false,
          });
          result = { success: !error, error };
        } else if (channel === 'whatsapp') {
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-notifier`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              organization_id: organization_id,
              user_id: user_id,
              phone: recipient,
              message: formattedMessage,
            }),
          });
          result = { success: resp.ok };
        } else if (channel === 'email') {
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              to: recipient,
              template_key: template.slug,
              variables: variables
            }),
          });
          result = { success: resp.ok };
        } else if (channel === 'push' && user_id) {
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              user_id: user_id,
              title: formattedTitle || template.name,
              body: formattedMessage,
              data: { lead_id: lead_id }
            }),
          });
          result = { success: resp.ok };
        }

        const endTime = performance.now();
        const executionTime = `${(endTime - startTime).toFixed(2)}ms`;

        // Log each channel send
        await supabase.from('notification_logs').insert({
          template_id: template.id,
          organization_id: organization_id,
          user_id: user_id,
          recipient: recipient || userId || 'system',
          channel: channel,
          payload: { variables, formattedTitle, formattedMessage, dedupe_key: finalDedupeKey, executionTime },
          response: result,
          status: result.success ? 'sent' : 'failed',
          error: result.error ? String(result.error) : null,
          dedupe_key: finalDedupeKey,
          is_test: is_test || false
        });

      } catch (err) {
        console.error(`[NotificationDispatcher] Error sending to channel ${channel}:`, err);
        result = { success: false, error: err.message };
      }

      return { channel, result };
    }));

    return new Response(JSON.stringify({ success: true, results: dispatchResults }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Notification Dispatcher Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});