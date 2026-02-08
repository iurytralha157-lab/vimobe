import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_APP_SECRET = Deno.env.get("META_APP_SECRET") || "";
const META_WEBHOOK_VERIFY_TOKEN = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Verify Meta webhook signature
function verifySignature(payload: string, signature: string): boolean {
  if (!signature || !META_APP_SECRET) return false;
  
  const expectedSignature = createHmac("sha256", META_APP_SECRET)
    .update(payload)
    .digest("hex");
  
  return signature === `sha256=${expectedSignature}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // GET - Webhook verification
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("Webhook verification:", { mode, token, challenge });

    if (mode === "subscribe" && token === META_WEBHOOK_VERIFY_TOKEN) {
      console.log("Webhook verified successfully");
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    return new Response("Forbidden", { status: 403 });
  }

  // POST - Receive lead data
  if (req.method === "POST") {
    try {
      const rawBody = await req.text();
      const signature = req.headers.get("X-Hub-Signature-256") || "";
      
      // Verify signature in production
      if (META_APP_SECRET) {
        if (!verifySignature(rawBody, signature)) {
          console.error("Invalid webhook signature - rejecting request");
          return new Response(
            JSON.stringify({ error: "Invalid signature" }),
            { status: 403, headers: corsHeaders }
          );
        }
        console.log("✅ Meta webhook signature validated");
      } else {
        console.warn("⚠️ META_APP_SECRET not configured - signature validation disabled");
      }

      const body = JSON.parse(rawBody);
      console.log("Webhook received:", JSON.stringify(body, null, 2));

      // Process each entry
      if (body.object !== "page") {
        return new Response("OK", { status: 200 });
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      for (const entry of body.entry || []) {
        const pageId = entry.id;

        for (const change of entry.changes || []) {
          if (change.field !== "leadgen") continue;

          const leadgenId = change.value?.leadgen_id;
          const formId = change.value?.form_id;
          const createdTime = change.value?.created_time;

          console.log(`Processing lead: ${leadgenId} from page ${pageId}, form ${formId}`);

          // Get integration config for this page
          const { data: integrations, error: intError } = await supabase
            .from("meta_integrations")
            .select("*")
            .eq("page_id", pageId)
            .eq("is_connected", true);

          if (intError || !integrations?.length) {
            console.error("No integration found for page:", pageId, intError);
            continue;
          }

          for (const integration of integrations) {
            // Check for form-specific configuration
            const { data: formConfig } = await supabase
              .from("meta_form_configs")
              .select("*")
              .eq("integration_id", integration.id)
              .eq("form_id", formId)
              .eq("is_active", true)
              .single();

            // Get optional enrichment from form config (NOT routing - Round Robin handles that)
            const propertyId = formConfig?.property_id || null;
            const autoTags = formConfig?.auto_tags || [];
            const fieldMapping = formConfig?.field_mapping || {};

            console.log("Using form config for enrichment:", formConfig ? "yes" : "no", { propertyId, autoTagsCount: autoTags.length });

            // Se tem imóvel configurado, buscar o preço
            let valorInteresse: number | null = null;
            if (propertyId) {
              const { data: property } = await supabase
                .from("properties")
                .select("preco")
                .eq("id", propertyId)
                .single();
              
              if (property?.preco) {
                valorInteresse = property.preco;
                console.log(`Property price fetched: R$ ${valorInteresse}`);
              }
            }

            // Fetch lead data from Graph API
            const leadUrl = `https://graph.facebook.com/v19.0/${leadgenId}?` +
              `access_token=${integration.access_token}` +
              `&fields=id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,platform`;

            const leadResponse = await fetch(leadUrl);
            const leadData = await leadResponse.json();

            if (leadData.error) {
              console.error("Error fetching lead data:", leadData.error);
              
              // Update integration with error
              await supabase
                .from("meta_integrations")
                .update({ 
                  last_error: leadData.error.message,
                  updated_at: new Date().toISOString()
                })
                .eq("id", integration.id);
              
              continue;
            }

            console.log("Lead data received:", JSON.stringify(leadData, null, 2));

            // Parse field data with mapping support
            const fields: Record<string, string> = {};
            const customFields: Record<string, string> = {};
            let name = "Lead Facebook";
            let email = "";
            let phone = "";
            let message = "";
            let cargo = "";
            let empresa = "";
            let cidade = "";
            let bairro = "";

            for (const field of leadData.field_data || []) {
              const value = field.values?.[0] || "";
              const fieldKey = field.name.toLowerCase();
              fields[field.name] = value;

              // Check if there's a specific mapping for this field
              const mappedTo = fieldMapping[field.name] || fieldMapping[fieldKey];
              
              if (mappedTo) {
                switch (mappedTo) {
                  case "name": name = value || name; break;
                  case "email": email = value; break;
                  case "phone": phone = value; break;
                  case "message": message = value; break;
                  case "cargo": cargo = value; break;
                  case "empresa": empresa = value; break;
                  case "cidade": cidade = value; break;
                  case "bairro": bairro = value; break;
                  case "custom":
                    customFields[field.name] = value;
                    break;
                }
              } else {
                // Auto-detect common fields if no mapping
                if (fieldKey.includes("nome") || fieldKey.includes("name") || fieldKey === "full_name") {
                  name = value || name;
                } else if (fieldKey.includes("email")) {
                  email = value;
                } else if (fieldKey.includes("telefone") || fieldKey.includes("phone") || fieldKey.includes("whatsapp") || fieldKey.includes("celular")) {
                  phone = value;
                } else {
                  // Save unknown fields as custom fields
                  customFields[field.name] = value;
                }
              }
            }

            // Check if lead already exists
            const { data: existingLead } = await supabase
              .from("leads")
              .select("id")
              .eq("meta_lead_id", leadgenId)
              .single();

            if (existingLead) {
              console.log("Lead already exists:", existingLead.id);
              continue;
            }

            // Create the lead WITHOUT pipeline/stage/assigned_user
            // The trigger handle_lead_intake will run Round Robin distribution
            const { data: newLead, error: leadError } = await supabase
              .from("leads")
              .insert({
                organization_id: integration.organization_id,
                name,
                email,
                phone,
                message: message || `Lead gerado via Facebook Lead Ads`,
                source: "meta",
                pipeline_id: null,       // Round Robin will set this
                stage_id: null,          // Round Robin will set this
                interest_property_id: propertyId, // Imóvel de interesse do form config
                valor_interesse: valorInteresse,   // Preço do imóvel buscado automaticamente
                assigned_user_id: null,  // Round Robin will set this
                meta_lead_id: leadgenId,
                meta_form_id: formId,
              })
              .select("id")
              .single();

            if (leadError) {
              console.error("Error creating lead:", leadError);
              continue;
            }

            console.log("Lead created:", newLead.id);

            // Apply auto tags from form config
            if (autoTags && autoTags.length > 0) {
              for (const tagId of autoTags) {
                await supabase
                  .from("lead_tags")
                  .insert({
                    lead_id: newLead.id,
                    tag_id: tagId,
                  });
              }
              console.log(`Applied ${autoTags.length} auto tags`);
            }

            // Prepare contact_notes with extra data
            const contactNotesLines: string[] = [];
            if (cargo) contactNotesLines.push(`Cargo: ${cargo}`);
            if (empresa) contactNotesLines.push(`Empresa: ${empresa}`);
            if (cidade) contactNotesLines.push(`Cidade: ${cidade}`);
            if (bairro) contactNotesLines.push(`Bairro: ${bairro}`);
            if (Object.keys(customFields).length > 0) {
              for (const [key, val] of Object.entries(customFields)) {
                contactNotesLines.push(`${key}: ${val}`);
              }
            }
            const contactNotes = contactNotesLines.length > 0 
              ? contactNotesLines.join('\n') 
              : null;

            // Create lead_meta record with tracking info
            await supabase
              .from("lead_meta")
              .insert({
                lead_id: newLead.id,
                page_id: pageId,
                form_id: formId,
                ad_id: leadData.ad_id,
                adset_id: leadData.adset_id,
                campaign_id: leadData.campaign_id,
                ad_name: leadData.ad_name || null,
                adset_name: leadData.adset_name || null,
                campaign_name: leadData.campaign_name || null,
                platform: leadData.platform || null,
                contact_notes: contactNotes,
                raw_payload: leadData
              });

            // Note: lead_created activity and timeline event are now handled by trigger

            // Update integration leads counter
            await supabase
              .from("meta_integrations")
              .update({ 
                leads_received: (integration.leads_received || 0) + 1,
                last_lead_at: new Date().toISOString(),
                last_error: null,
                updated_at: new Date().toISOString()
              })
              .eq("id", integration.id);

            // Update form config leads counter if using form-specific config
            if (formConfig) {
              await supabase
                .from("meta_form_configs")
                .update({
                  leads_received: (formConfig.leads_received || 0) + 1,
                  last_lead_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq("id", formConfig.id);
            }

            // Get users to notify (admins of the organization)
            const { data: admins } = await supabase
              .from("users")
              .select("id")
              .eq("organization_id", integration.organization_id)
              .eq("role", "admin")
              .eq("is_active", true);

            // Create notifications for admins
            for (const admin of admins || []) {
              await supabase
                .from("notifications")
                .insert({
                  organization_id: integration.organization_id,
                  user_id: admin.id,
                  title: "Novo lead do Facebook",
                  content: `${name} chegou via ${integration.page_name}${formConfig?.form_name ? ` (${formConfig.form_name})` : ''}`,
                  type: "lead",
                  lead_id: newLead.id
                });
            }

          }
        }
      }

      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Webhook processing error:", error);
      return new Response("Internal error", { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
