// Sync WhatsApp contact avatars in bulk for all leads in an organization.
// Iterates leads with phone and fetches profile picture via evolution-go-proxy
// (or evolution-proxy for legacy provider). Updates leads.whatsapp_avatar_url.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const API_URL = (Deno.env.get("EVOLUTION_GO_API_URL") || "").replace(/\/+$/, "");
const API_KEY = Deno.env.get("EVOLUTION_GO_API_KEY") || "";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function normalizePhone(p: string) {
  return (p || "").replace(/\D/g, "");
}
function toJid(phone: string) {
  const d = normalizePhone(phone);
  if (!d) return null;
  const withCountry = d.startsWith("55") ? d : "55" + d;
  return `${withCountry}@s.whatsapp.net`;
}

async function goFetchAvatar(instanceId: string, jid: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/user/avatar`, {
      method: "POST",
      headers: { apikey: API_KEY, "Content-Type": "application/json", instanceId },
      body: JSON.stringify({ jid }),
    });
    if (!res.ok) return null;
    const j = await res.json().catch(() => null);
    return j?.url || j?.pictureUrl || j?.profilePictureUrl || j?.data?.url || null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub;
    if (!userId) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { session_id, limit = 100 } = await req.json().catch(() => ({}));
    if (!session_id) throw new Error("session_id required");

    const { data: session } = await supabase
      .from("whatsapp_sessions")
      .select("id, organization_id, instance_id, instance_name, provider")
      .eq("id", session_id)
      .maybeSingle();
    if (!session) throw new Error("session not found");
    if (session.provider !== "evolution_go") {
      throw new Error("only evolution_go provider supported here");
    }

    const inst = session.instance_id || session.instance_name;
    if (!inst) throw new Error("instance id missing");

    // Pick leads needing avatar refresh (>30d or null)
    const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data: leads } = await supabase
      .from("leads")
      .select("id, phone, whatsapp_avatar_synced_at")
      .eq("organization_id", session.organization_id)
      .not("phone", "is", null)
      .or(`whatsapp_avatar_synced_at.is.null,whatsapp_avatar_synced_at.lt.${cutoff}`)
      .limit(Math.min(limit, 500));

    let updated = 0;
    for (const lead of leads || []) {
      const jid = toJid(lead.phone);
      if (!jid) continue;
      const url = await goFetchAvatar(inst, jid);
      await supabase.from("leads").update({
        whatsapp_avatar_url: url,
        whatsapp_avatar_synced_at: new Date().toISOString(),
      }).eq("id", lead.id);
      if (url) updated++;
    }

    return new Response(
      JSON.stringify({ ok: true, processed: leads?.length || 0, updated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("sync-whatsapp-contacts error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
