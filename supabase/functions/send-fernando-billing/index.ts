import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const orgId = "818394bf-8c57-445e-be2f-b964c2569235";
    const fernandoCpf = "02760017109";
    const fernandoPhone = "5561998416789";

    console.log("Updating organization with CPF...");
    await supabase.from("organizations").update({ 
      cnpj: fernandoCpf,
      asaas_customer_id: null // Reset to force recreation with CPF if needed
    }).eq("id", orgId);

    console.log("Calling asaas-create-charge logic...");
    // Instead of calling another function, we can just do the logic here or call it via fetch
    // But calling it via fetch requires the URL which might be tricky in dev.
    // I'll just trigger the asaas-create-charge via fetch to the internal URL.
    
    const baseUrl = Deno.env.get("SUPABASE_URL")!.replace(".supabase.co", ".functions.supabase.co");
    const functionUrl = `${baseUrl}/asaas-create-charge`;
    
    const chargeResp = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        organization_id: orgId,
        billing_type: "PIX",
        holder_cpf_cnpj: fernandoCpf,
        holder_email: "fernandobrasilia73@gmail.com",
        holder_phone: fernandoPhone
      })
    });

    const chargeData = await chargeResp.json();
    if (!chargeData.success) {
      throw new Error(`Failed to create charge: ${JSON.stringify(chargeData)}`);
    }

    const { qr_payload, invoice_url } = chargeData;

    console.log("Sending WhatsApp notification...");
    const notifierUrl = `${baseUrl}/whatsapp-notifier`;
    const message = `Olá Fernando! 🚀\n\nSua assinatura do sistema (Plano Básico) venceu em 05/05.\nPara manter seu acesso e o recebimento de leads ativos, realize o pagamento via PIX abaixo:\n\n💰 Valor: R$ 197,00\n\nPIX Copia e Cola:\n${qr_payload}\n\nOu acesse o link: ${invoice_url}`;

    const notifyResp = await fetch(notifierUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        organization_id: orgId,
        user_id: "9c5b2f46-df6c-4d49-95dc-88b98d3f7c30", // Fernando Silva
        message: message
      })
    });

    const notifyData = await notifyResp.json();

    return new Response(JSON.stringify({ success: true, charge: chargeData, notification: notifyData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
