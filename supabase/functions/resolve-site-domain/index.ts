import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();

    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'Domain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Resolving domain: ${domain}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const cleanDomain = domain.toLowerCase().trim();

    // First try direct lookup by custom_domain
    const { data: directMatch, error: directError } = await supabase
      .from('organization_sites')
      .select('organization_id, subdomain, custom_domain, site_title, site_description, primary_color, secondary_color, accent_color, logo_url, favicon_url, whatsapp, phone, email, address, city, state, instagram, facebook, youtube, linkedin, about_title, about_text, about_image_url, seo_title, seo_description, seo_keywords, google_analytics_id, hero_image_url, hero_title, hero_subtitle, page_banner_url, watermark_logo_url, watermark_opacity, watermark_position')
      .or(`custom_domain.eq.${cleanDomain},custom_domain.eq.www.${cleanDomain.replace(/^www\./, '')}`)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (directMatch) {
      console.log(`Domain resolved via direct lookup: ${domain} -> org: ${directMatch.organization_id}`);
      
      const { organization_id, subdomain, ...siteFields } = directMatch;
      return new Response(
        JSON.stringify({
          found: true,
          organization_id,
          subdomain,
          site_config: siteFields,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback to RPC
    const { data, error } = await supabase.rpc('resolve_site_domain', {
      p_domain: cleanDomain
    });

    if (error) {
      console.error('Error resolving domain:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to resolve domain' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data || data.length === 0) {
      console.log(`Domain not found: ${domain}`);
      return new Response(
        JSON.stringify({ error: 'Site not found', found: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const siteData = data[0];
    console.log(`Domain resolved via RPC: ${domain} -> org: ${siteData.organization_id}`);

    return new Response(
      JSON.stringify({
        found: true,
        organization_id: siteData.organization_id,
        subdomain: siteData.subdomain || null,
        site_config: siteData.site_config
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
