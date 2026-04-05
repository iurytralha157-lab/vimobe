import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const leadId = typeof body?.leadId === "string" ? body.leadId : null;
    const conversationId = typeof body?.conversationId === "string" ? body.conversationId : null;

    if (!leadId && !conversationId) {
      return new Response(JSON.stringify({ error: "leadId or conversationId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: requester, error: requesterError } = await supabase
      .from("users")
      .select("id, role, organization_id")
      .eq("id", user.id)
      .single();

    if (requesterError || !requester) {
      return new Response(JSON.stringify({ error: "User profile not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let conversation: any = null;

    if (conversationId) {
      const { data, error } = await supabase
        .from("whatsapp_conversations")
        .select(`
          *,
          session:whatsapp_sessions!whatsapp_conversations_session_id_fkey(id, instance_name, phone_number, status, organization_id),
          lead:leads!whatsapp_conversations_lead_id_fkey(
            id,
            name,
            pipeline_id,
            stage_id,
            pipeline:pipelines(id, name),
            stage:stages(id, name, color),
            tags:lead_tags(tag:tags(id, name, color))
          )
        `)
        .eq("id", conversationId)
        .maybeSingle();

      if (error) throw error;
      conversation = data;
    }

    if (!conversation && leadId) {
      const { data, error } = await supabase
        .from("whatsapp_conversations")
        .select(`
          *,
          session:whatsapp_sessions!whatsapp_conversations_session_id_fkey(id, instance_name, phone_number, status, organization_id),
          lead:leads!whatsapp_conversations_lead_id_fkey(
            id,
            name,
            pipeline_id,
            stage_id,
            pipeline:pipelines(id, name),
            stage:stages(id, name, color),
            tags:lead_tags(tag:tags(id, name, color))
          )
        `)
        .eq("lead_id", leadId)
        .is("deleted_at", null)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(1);

      if (error) throw error;
      conversation = data?.[0] || null;
    }

    if (!conversation) {
      return new Response(JSON.stringify({ conversation: null, messages: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resolvedLeadId = conversation.lead_id || leadId;
    let canView = requester.role === "admin" || requester.role === "super_admin";

    if (!canView && resolvedLeadId) {
      const [{ data: canAccessLead }, { data: canViewAll }] = await Promise.all([
        supabase.rpc("can_access_lead", { p_lead_id: resolvedLeadId, p_user_id: user.id }),
        supabase.rpc("user_has_permission", { p_permission_key: "lead_view_all", p_user_id: user.id }),
      ]);

      if (canAccessLead) {
        canView = true;
      } else if (canViewAll) {
        const { data: leadRow } = await supabase
          .from("leads")
          .select("organization_id")
          .eq("id", resolvedLeadId)
          .maybeSingle();

        canView = leadRow?.organization_id === requester.organization_id;
      }
    }

    if (!canView) {
      const { data: canAccessSession } = await supabase.rpc("can_access_whatsapp_session", {
        p_session_id: conversation.session_id,
        p_user_id: user.id,
      });
      canView = !!canAccessSession;
    }

    if (!canView) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: messages, error: messagesError } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("sent_at", { ascending: true });

    if (messagesError) throw messagesError;

    return new Response(JSON.stringify({ conversation, messages: messages || [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
