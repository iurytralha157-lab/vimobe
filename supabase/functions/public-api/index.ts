import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hashBuf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Sanitiza um imóvel para resposta pública (omite dados sensíveis e do proprietário)
function sanitizeProperty(p: any) {
  if (!p) return p
  return {
    id: p.id,
    code: p.code,
    title: p.title,
    description: p.descricao,
    description_site: p.descricao_site,
    type: p.tipo_de_imovel,
    purpose: p.tipo_de_negocio,        // 'venda' | 'locacao' | etc.
    finalidade: p.finalidade,
    status: p.status,
    featured: p.destaque,
    super_featured: p.super_destaque,
    // endereço sem número (privacidade)
    address: {
      street: p.endereco,
      neighborhood: p.bairro,
      city: p.cidade,
      state: p.uf,
      country: p.pais,
      zipcode: p.cep,
      latitude: p.latitude,
      longitude: p.longitude,
    },
    pricing: {
      sale_price: p.preco,
      rental_price: p.valor_locacao,
      condominium_fee: p.condominio,
      iptu: p.iptu,
      insurance: p.seguro_incendio,
      service_fee: p.taxa_de_servico,
    },
    rooms: {
      bedrooms: p.quartos,
      suites: p.suites,
      bathrooms: p.banheiros,
      parking: p.vagas,
    },
    area: {
      useful: p.area_util,
      total: p.area_total,
    },
    floor: p.andar,
    year_built: p.ano_construcao,
    furnished: p.mobilia,
    pet_policy: p.regra_pet,
    main_image: p.imagem_principal,
    images: p.fotos,
    video: p.video_imovel,
    virtual_tour: p.tour_virtual,
    extra_details: p.detalhes_extras,
    nearby: p.proximidades,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ error: 'Missing or invalid Authorization header', code: 'unauthorized' }, 401)
    }
    const apiKey = authHeader.slice(7).trim()
    if (!apiKey) return json({ error: 'Empty API key', code: 'unauthorized' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Valida via hash (a tabela só armazena SHA-256 da chave)
    const keyHash = await sha256Hex(apiKey)
    const { data: keyData, error: keyError } = await supabase
      .from('organization_api_keys')
      .select('id, organization_id, revoked_at')
      .eq('key_hash', keyHash)
      .maybeSingle()

    if (keyError || !keyData) {
      return json({ error: 'Invalid API key', code: 'invalid_api_key' }, 401)
    }
    if (keyData.revoked_at) {
      return json({ error: 'API key has been revoked', code: 'revoked' }, 401)
    }

    const organizationId = keyData.organization_id

    // Módulo 'api' precisa estar habilitado para a organização
    const { data: moduleData } = await supabase
      .from('organization_modules')
      .select('is_enabled')
      .eq('organization_id', organizationId)
      .eq('module_name', 'api')
      .maybeSingle()

    if (!moduleData?.is_enabled) {
      return json({ error: 'API module is not enabled for this organization', code: 'module_disabled' }, 403)
    }

    // Atualiza last_used_at (fire-and-forget — não bloqueia a resposta)
    supabase
      .from('organization_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id)
      .then(() => {})

    const url = new URL(req.url)
    const path = url.pathname.replace('/public-api', '').replace(/\/$/, '') || '/'

    // ---------- GET /properties ----------
    if (path === '/properties') {
      const city = url.searchParams.get('city')
      const neighborhood = url.searchParams.get('neighborhood')
      const type = url.searchParams.get('type')
      const purpose = url.searchParams.get('purpose')
      const minPrice = url.searchParams.get('min_price')
      const maxPrice = url.searchParams.get('max_price')
      const bedrooms = url.searchParams.get('bedrooms')

      const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
      const perPageRaw = parseInt(url.searchParams.get('per_page') ?? '50', 10) || 50
      const perPage = Math.min(100, Math.max(1, perPageRaw))
      const from = (page - 1) * perPage
      const to = from + perPage - 1

      let query = supabase
        .from('properties')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('status', 'ativo')
        .order('created_at', { ascending: false })
        .range(from, to)

      if (city) query = query.ilike('cidade', `%${city}%`)
      if (neighborhood) query = query.ilike('bairro', `%${neighborhood}%`)
      if (type) query = query.eq('tipo_de_imovel', type)
      if (purpose) query = query.eq('tipo_de_negocio', purpose)
      if (bedrooms) query = query.gte('quartos', parseInt(bedrooms, 10) || 0)
      if (minPrice) query = query.gte('preco', parseFloat(minPrice) || 0)
      if (maxPrice) query = query.lte('preco', parseFloat(maxPrice) || 0)

      const { data, error, count } = await query
      if (error) throw error

      return json({
        data: (data ?? []).map(sanitizeProperty),
        pagination: {
          page,
          per_page: perPage,
          total: count ?? 0,
          total_pages: count ? Math.ceil(count / perPage) : 0,
        },
      })
    }

    // ---------- GET /properties/:id ----------
    const propertyMatch = path.match(/^\/properties\/([0-9a-fA-F-]{36})$/)
    if (propertyMatch) {
      const propertyId = propertyMatch[1]
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .eq('organization_id', organizationId)
        .eq('status', 'ativo')
        .maybeSingle()

      if (error) throw error
      if (!data) return json({ error: 'Property not found', code: 'not_found' }, 404)
      return json({ data: sanitizeProperty(data) })
    }

    return json({ error: 'Endpoint not found', code: 'not_found' }, 404)
  } catch (err) {
    console.error('public-api error:', err)
    return json({ error: 'Internal Server Error', code: 'internal_error', details: (err as Error).message }, 500)
  }
})
