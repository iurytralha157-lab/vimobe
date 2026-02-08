import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_APP_ID = Deno.env.get("META_APP_ID") || "";
const META_APP_SECRET = Deno.env.get("META_APP_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Redirect to frontend with success data
function redirectWithSuccess(pages: any[], userToken: string, returnUrl: string): Response {
  const data = {
    success: true,
    pages: pages,
    userToken: userToken
  };
  const encodedData = encodeURIComponent(btoa(JSON.stringify(data)));
  const redirectUrl = `${returnUrl}?meta_oauth_data=${encodedData}`;
  
  console.log("Redirecting to:", returnUrl);
  
  return new Response(null, {
    status: 302,
    headers: {
      "Location": redirectUrl,
    },
  });
}

// Redirect to frontend with error
function redirectWithError(error: string, returnUrl: string): Response {
  const data = {
    success: false,
    error: error
  };
  const encodedData = encodeURIComponent(btoa(JSON.stringify(data)));
  const redirectUrl = `${returnUrl}?meta_oauth_data=${encodedData}`;
  
  console.log("Redirecting with error to:", returnUrl);
  
  return new Response(null, {
    status: 302,
    headers: {
      "Location": redirectUrl,
    },
  });
}

// Generate HTML page for errors
function generateErrorPage(error: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Erro na conexão</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 400px;
    }
    .icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    h2 { margin-bottom: 0.5rem; }
    p { opacity: 0.9; margin-bottom: 1rem; }
    .error-detail {
      background: rgba(0,0,0,0.2);
      padding: 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">❌</div>
    <h2>Erro na conexão</h2>
    <p>Não foi possível conectar sua conta do Facebook.</p>
    <div class="error-detail">${error}</div>
    <p style="margin-top: 1rem;">Você pode fechar esta janela e tentar novamente.</p>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'META_OAUTH_ERROR', error: ${JSON.stringify(error)} }, '*');
    }
  </script>
</body>
</html>`;
}

serve(async (req) => {
  const url = new URL(req.url);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle OAuth callback (GET request from Facebook)
  if (req.method === "GET") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");
    
    // Parse state to get return URL
    let returnUrl = "https://vimob.vettercompany.com.br/settings/integrations/meta";
    try {
      if (state) {
        const stateData = JSON.parse(atob(state));
        if (stateData.returnUrl) {
          returnUrl = stateData.returnUrl;
        }
      }
    } catch (e) {
      console.log("Could not parse state, using default return URL");
    }
    
    console.log("OAuth callback received", { hasCode: !!code, error, errorDescription, returnUrl });
    
    if (error) {
      console.error("OAuth error from Facebook:", error, errorDescription);
      return redirectWithError(errorDescription || error, returnUrl);
    }
    
    if (!code) {
      return redirectWithError("Codigo de autorizacao nao recebido", returnUrl);
    }
    
    try {
      // The redirect_uri must match exactly what was used in the auth request
      const redirectUri = `${SUPABASE_URL}/functions/v1/meta-oauth`;
      
      // Exchange code for access token
      console.log("Exchanging code for token...");
      const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` +
        `client_id=${META_APP_ID}` +
        `&client_secret=${META_APP_SECRET}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&code=${code}`;

      const tokenResponse = await fetch(tokenUrl);
      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error("Token exchange error:", tokenData.error);
        return redirectWithError(tokenData.error.message, returnUrl);
      }

      console.log("Token obtained, exchanging for long-lived token...");
      
      // Exchange for long-lived token
      const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` +
        `grant_type=fb_exchange_token` +
        `&client_id=${META_APP_ID}` +
        `&client_secret=${META_APP_SECRET}` +
        `&fb_exchange_token=${tokenData.access_token}`;

      const longLivedResponse = await fetch(longLivedUrl);
      const longLivedData = await longLivedResponse.json();

      if (longLivedData.error) {
        console.error("Long-lived token error:", longLivedData.error);
        return redirectWithError(longLivedData.error.message, returnUrl);
      }

      console.log("Long-lived token obtained, fetching pages...");
      
      // Get pages the user manages
      const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?` +
        `access_token=${longLivedData.access_token}` +
        `&fields=id,name,access_token`;

      const pagesResponse = await fetch(pagesUrl);
      const pagesData = await pagesResponse.json();

      if (pagesData.error) {
        console.error("Pages fetch error:", pagesData.error);
        return redirectWithError(pagesData.error.message, returnUrl);
      }

      const pages = (pagesData.data || []).map((page: any) => ({
        id: page.id,
        name: page.name,
        access_token: page.access_token,
      }));
      
      console.log(`Found ${pages.length} pages, redirecting back...`);

      return redirectWithSuccess(pages, longLivedData.access_token, returnUrl);
      
    } catch (error: unknown) {
      console.error("OAuth callback error:", error);
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      return redirectWithError(message, returnUrl);
    }
  }

  // Handle POST requests (existing API)
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's organization
    const { data: userData, error: profileError } = await supabase
      .from("users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !userData?.organization_id) {
      return new Response(JSON.stringify({ error: "User not in organization" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only admins can manage Meta integration
    if (userData.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, code, redirect_uri, page_id, pipeline_id, stage_id, default_status, access_token, is_active, return_url } = body;

    switch (action) {
      case "get_auth_url": {
        // Generate OAuth URL for Meta - redirect to this edge function
        const callbackUrl = `${SUPABASE_URL}/functions/v1/meta-oauth`;
        
        // Create state with return URL
        const stateData = {
          returnUrl: return_url || "https://vimob.vettercompany.com.br/settings/integrations/meta",
          timestamp: Date.now()
        };
        const state = btoa(JSON.stringify(stateData));
        
        const scopes = [
          "pages_show_list",
          "pages_read_engagement",
          "pages_manage_ads",
          "leads_retrieval",
          "ads_management",
          "business_management"
        ].join(",");

        const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
          `client_id=${META_APP_ID}` +
          `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
          `&scope=${encodeURIComponent(scopes)}` +
          `&state=${encodeURIComponent(state)}` +
          `&response_type=code`;

        console.log("Generated auth URL with callback:", callbackUrl, "returnUrl:", stateData.returnUrl);

        return new Response(JSON.stringify({ auth_url: authUrl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_page_forms": {
        console.log("Fetching forms for page:", page_id);
        
        // Get access token from integration
        const { data: integration, error: intError } = await supabase
          .from("meta_integrations")
          .select("access_token, page_name")
          .eq("organization_id", userData.organization_id)
          .eq("page_id", page_id)
          .single();

        if (intError || !integration?.access_token) {
          console.error("Integration not found:", intError);
          return new Response(JSON.stringify({ error: "Integration not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log("Found integration for page:", integration.page_name);

        // Fetch forms from the page
        const formsUrl = `https://graph.facebook.com/v19.0/${page_id}/leadgen_forms?` +
          `access_token=${integration.access_token}` +
          `&fields=id,name,status,leads_count,questions`;

        console.log("Fetching forms from Meta API...");
        const formsResponse = await fetch(formsUrl);
        const formsData = await formsResponse.json();

        if (formsData.error) {
          console.error("Meta API error:", formsData.error);
          
          // Update integration with error
          await supabase
            .from("meta_integrations")
            .update({ 
              last_error: formsData.error.message,
              updated_at: new Date().toISOString()
            })
            .eq("organization_id", userData.organization_id)
            .eq("page_id", page_id);
          
          return new Response(JSON.stringify({ 
            error: formsData.error.message,
            error_code: formsData.error.code,
            error_subcode: formsData.error.error_subcode
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log(`Found ${formsData.data?.length || 0} forms`);

        const forms = (formsData.data || []).map((form: any) => ({
          id: form.id,
          name: form.name,
          status: form.status,
          leads_count: form.leads_count,
          questions: (form.questions || []).map((q: any) => ({
            key: q.key,
            label: q.label,
            type: q.type,
          })),
        }));

        return new Response(JSON.stringify({ forms }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "exchange_token": {
        // Exchange code for access token
        const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` +
          `client_id=${META_APP_ID}` +
          `&client_secret=${META_APP_SECRET}` +
          `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
          `&code=${code}`;

        const tokenResponse = await fetch(tokenUrl);
        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
          return new Response(JSON.stringify({ error: tokenData.error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Exchange for long-lived token
        const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` +
          `grant_type=fb_exchange_token` +
          `&client_id=${META_APP_ID}` +
          `&client_secret=${META_APP_SECRET}` +
          `&fb_exchange_token=${tokenData.access_token}`;

        const longLivedResponse = await fetch(longLivedUrl);
        const longLivedData = await longLivedResponse.json();

        if (longLivedData.error) {
          return new Response(JSON.stringify({ error: longLivedData.error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get pages the user manages
        const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?` +
          `access_token=${longLivedData.access_token}` +
          `&fields=id,name,access_token`;

        const pagesResponse = await fetch(pagesUrl);
        const pagesData = await pagesResponse.json();

        if (pagesData.error) {
          return new Response(JSON.stringify({ error: pagesData.error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ 
          pages: pagesData.data || [],
          user_token: longLivedData.access_token
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "connect_page": {
        // First, get the page access token from user token (code contains user_token in this case)
        const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?` +
          `access_token=${code}` +
          `&fields=id,name,access_token`;

        const pagesResponse = await fetch(pagesUrl);
        const pagesData = await pagesResponse.json();

        if (pagesData.error) {
          return new Response(JSON.stringify({ error: pagesData.error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const page = pagesData.data?.find((p: any) => p.id === page_id);
        if (!page) {
          return new Response(JSON.stringify({ error: "Page not found or no access" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Subscribe to leadgen webhook
        console.log("Subscribing to leadgen webhook for page:", page_id);
        const subscribeUrl = `https://graph.facebook.com/v19.0/${page_id}/subscribed_apps`;
        const subscribeResponse = await fetch(subscribeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            access_token: page.access_token,
            subscribed_fields: "leadgen"
          }).toString()
        });
        const subscribeData = await subscribeResponse.json();

        console.log("Webhook subscription response:", JSON.stringify(subscribeData));

        if (subscribeData.error) {
          console.error("Webhook subscription error:", subscribeData.error);
          // Store the error but continue
        } else {
          console.log("Successfully subscribed to leadgen webhook");
        }

        // Upsert integration
        const { error: upsertError } = await supabase
          .from("meta_integrations")
          .upsert({
            organization_id: userData.organization_id,
            page_id: page.id,
            page_name: page.name,
            access_token: page.access_token,
            pipeline_id,
            stage_id,
            default_status: default_status || "novo",
            is_connected: true,
            updated_at: new Date().toISOString()
          }, {
            onConflict: "organization_id,page_id"
          });

        if (upsertError) {
          // Try insert if upsert fails
          const { error: insertError } = await supabase
            .from("meta_integrations")
            .insert({
              organization_id: userData.organization_id,
              page_id: page.id,
              page_name: page.name,
              access_token: page.access_token,
              pipeline_id,
              stage_id,
              default_status: default_status || "novo",
              is_connected: true
            });

          if (insertError) {
            return new Response(JSON.stringify({ error: insertError.message }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_page": {
        // Update page configuration
        const { error: updateError } = await supabase
          .from("meta_integrations")
          .update({
            pipeline_id,
            stage_id,
            default_status,
            updated_at: new Date().toISOString()
          })
          .eq("organization_id", userData.organization_id)
          .eq("page_id", page_id);

        if (updateError) {
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "disconnect_page": {
        // Disconnect specific page
        const { error: deleteError } = await supabase
          .from("meta_integrations")
          .delete()
          .eq("organization_id", userData.organization_id)
          .eq("page_id", page_id);

        if (deleteError) {
          return new Response(JSON.stringify({ error: deleteError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "toggle_page": {
        const { error: toggleError } = await supabase
          .from("meta_integrations")
          .update({ 
            is_connected: is_active !== false,
            updated_at: new Date().toISOString()
          })
          .eq("organization_id", userData.organization_id)
          .eq("page_id", page_id);

        if (toggleError) {
          return new Response(JSON.stringify({ error: toggleError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error: unknown) {
    console.error("Meta OAuth Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
