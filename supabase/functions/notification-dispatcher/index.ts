
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json().catch(() => ({}));
    const isTest = body.test === true;

    if (isTest) {
      console.log("Iniciando envio de notificação de teste...");
      // Pega o usuário que chamou a função (via auth header se presente) ou o primeiro da lista para teste
      const authHeader = req.headers.get("Authorization");
      let targetUserId: string | null = null;
      
      if (authHeader) {
        const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
        targetUserId = user?.id || null;
      }

      if (!targetUserId) {
        // Fallback: pega a inscrição mais recente para testar
        const { data: latestSub } = await supabaseClient
          .from("push_subscriptions")
          .select("user_id")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        targetUserId = latestSub?.user_id || null;
      }

      if (!targetUserId) throw new Error("Nenhum usuário com inscrição encontrado para teste.");

      const { data, error } = await supabaseClient.functions.invoke("send-push", {
        body: { 
          user_id: targetUserId,
          title: "Teste do CRM",
          message: "Suas notificações push estão funcionando corretamente!",
          url: "/notifications"
        },
      });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lógica de Cron
    const now = new Date();
    const hourUtc = now.getUTCHours();
    
    // Conforme solicitado: hourUtc === 12 e hourUtc === 21
    if (hourUtc === 12 || hourUtc === 21) {
       console.log(`Processando notificações agendadas...`);
       
       // Exemplo: Notificar usuários com leads pendentes
       const { data: pendingLeads } = await supabaseClient
         .from("leads")
         .select("id, user_id, name")
         .eq("status", "new")
         .limit(50);

       if (pendingLeads) {
         for (const lead of pendingLeads) {
           if (!lead.user_id) continue;
           
           // Verifica de-dupe no notification_log
           const today = new Date().toISOString().split('T')[0];
           const { data: alreadySent } = await supabaseClient
             .from("notification_log")
             .select("id")
             .eq("user_id", lead.user_id)
             .eq("kind", "pending_lead_reminder")
             .eq("ref_id", lead.id)
             .eq("sent_for_date", today)
             .maybeSingle();

           if (!alreadySent) {
             await supabaseClient.functions.invoke("send-push", {
               body: { 
                 user_id: lead.user_id,
                 title: "Lead Pendente",
                 message: `Você tem o lead ${lead.name} aguardando contato.`,
                 url: `/crm/contacts?lead=${lead.id}`
               },
             });

             await supabaseClient.from("notification_log").insert({
               user_id: lead.user_id,
               kind: "pending_lead_reminder",
               ref_id: lead.id,
               sent_for_date: today,
             });
           }
         }
       }
    }

    return new Response(JSON.stringify({ status: "ok", hour: hourUtc }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Erro no dispatcher:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
