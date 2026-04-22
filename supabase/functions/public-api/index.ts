import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = authHeader.split(' ')[1]
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Find organization by API key
    const { data: keyData, error: keyError } = await supabaseClient
      .from('organization_api_keys')
      .select('organization_id')
      .eq('key_hash', apiKey)
      .single()

    if (keyError || !keyData) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const organizationId = keyData.organization_id

    // Check if API module is enabled
    const { data: moduleData, error: moduleError } = await supabaseClient
      .from('organization_modules')
      .select('is_enabled')
      .eq('organization_id', organizationId)
      .eq('module_name', 'api')
      .single()

    if (moduleError || !moduleData?.is_enabled) {
      return new Response(JSON.stringify({ error: 'API module is not enabled for this organization' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(req.url)
    const path = url.pathname.replace('/public-api', '')

    if (path === '/properties' || path === '/properties/') {
      const city = url.searchParams.get('city')
      const neighborhood = url.searchParams.get('neighborhood')
      const type = url.searchParams.get('type')

      let query = supabaseClient
        .from('properties')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'disponivel') // Only available properties by default?
        .order('created_at', { ascending: false })

      if (city) query = query.ilike('cidade', `%${city}%`)
      if (neighborhood) query = query.ilike('bairro', `%${neighborhood}%`)
      if (type) query = query.eq('tipo_de_imovel', type)

      const { data, error } = await query

      if (error) throw error
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Individual property
    const propertyMatch = path.match(/\/properties\/([0-9a-f-]+)/)
    if (propertyMatch) {
      const propertyId = propertyMatch[1]
      const { data, error } = await supabaseClient
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .eq('organization_id', organizationId)
        .single()

      if (error) {
        return new Response(JSON.stringify({ error: 'Property not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
