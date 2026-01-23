import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const organizationId = url.searchParams.get('organization_id');
    const endpoint = url.searchParams.get('endpoint') || 'properties';
    const propertyCode = url.searchParams.get('property_code');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '12');
    const search = url.searchParams.get('search') || '';
    const tipo = url.searchParams.get('tipo') || '';
    const minPrice = url.searchParams.get('min_price');
    const maxPrice = url.searchParams.get('max_price');
    const quartos = url.searchParams.get('quartos');
    const cidade = url.searchParams.get('cidade');

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'organization_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Public site data request: ${endpoint} for org: ${organizationId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the site is active for this organization
    const { data: siteData, error: siteError } = await supabase
      .from('organization_sites')
      .select('is_active')
      .eq('organization_id', organizationId)
      .single();

    if (siteError || !siteData?.is_active) {
      return new Response(
        JSON.stringify({ error: 'Site not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let response;

    switch (endpoint) {
      case 'properties': {
        let query = supabase
          .from('properties')
          .select('*', { count: 'exact' })
          .eq('organization_id', organizationId)
          .eq('status', 'ativo')
          .order('created_at', { ascending: false });

        // Apply filters
        if (search) {
          query = query.or(`titulo.ilike.%${search}%,descricao.ilike.%${search}%,bairro.ilike.%${search}%`);
        }
        if (tipo) {
          query = query.eq('tipo_imovel', tipo);
        }
        if (minPrice) {
          query = query.gte('valor_venda', parseFloat(minPrice));
        }
        if (maxPrice) {
          query = query.lte('valor_venda', parseFloat(maxPrice));
        }
        if (quartos) {
          query = query.gte('quartos', parseInt(quartos));
        }
        if (cidade) {
          query = query.ilike('cidade', `%${cidade}%`);
        }

        // Pagination
        const offset = (page - 1) * limit;
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
          console.error('Error fetching properties:', error);
          throw error;
        }

        response = {
          properties: data || [],
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit)
        };
        break;
      }

      case 'property': {
        if (!propertyCode) {
          return new Response(
            JSON.stringify({ error: 'property_code is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('codigo', propertyCode)
          .eq('status', 'ativo')
          .single();

        if (error || !data) {
          return new Response(
            JSON.stringify({ error: 'Property not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        response = { property: data };
        break;
      }

      case 'featured': {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('status', 'ativo')
          .eq('destaque', true)
          .order('created_at', { ascending: false })
          .limit(6);

        if (error) {
          console.error('Error fetching featured properties:', error);
          throw error;
        }

        response = { properties: data || [] };
        break;
      }

      case 'property-types': {
        const { data, error } = await supabase
          .from('properties')
          .select('tipo_imovel')
          .eq('organization_id', organizationId)
          .eq('status', 'ativo')
          .not('tipo_imovel', 'is', null);

        if (error) {
          console.error('Error fetching property types:', error);
          throw error;
        }

        // Get unique types
        const types = [...new Set(data?.map(p => p.tipo_imovel).filter(Boolean))];
        response = { types };
        break;
      }

      case 'cities': {
        const { data, error } = await supabase
          .from('properties')
          .select('cidade')
          .eq('organization_id', organizationId)
          .eq('status', 'ativo')
          .not('cidade', 'is', null);

        if (error) {
          console.error('Error fetching cities:', error);
          throw error;
        }

        // Get unique cities
        const cities = [...new Set(data?.map(p => p.cidade).filter(Boolean))];
        response = { cities };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid endpoint' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(response),
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
