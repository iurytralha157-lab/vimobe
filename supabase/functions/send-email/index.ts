import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { to, template_key, variables } = await req.json();

    // 1. Buscar template no banco
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("key", template_key)
      .eq("active", true)
      .single();

    if (templateError || !template) {
      throw new Error(`Template not found: ${template_key}`);
    }

    // 2. Substituir variáveis no assunto e no HTML
    let subject = template.subject;
    let html = template.html;

    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, "g");
        subject = subject.replace(regex, String(value));
        html = html.replace(regex, String(value));
      });
    }

    // 3. Enviar via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Vimob <notificacoes@seudominio.com.br>",
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    const resData = await res.json();
    const status = res.ok ? "success" : "error";

    // 4. Salvar log
    await supabase.from("email_logs").insert({
      template_key,
      recipient_email: to,
      subject,
      status,
      error_message: res.ok ? null : JSON.stringify(resData),
    });

    if (!res.ok) {
      throw new Error(JSON.stringify(resData));
    }

    return new Response(JSON.stringify(resData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
