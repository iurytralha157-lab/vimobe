import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

// Sanitiza um imóvel para resposta pública
function sanitizeProperty(p: any) {
  if (!p) return p
  return {
    id: p.id,
    code: p.code,
    title: p.title,
    description: p.descricao,
    description_site: p.descricao_site,
    type: p.tipo_de_imovel,
    purpose: p.tipo_de_negocio,
    finalidade: p.finalidade,
    status: p.status,
    featured: p.destaque,
    super_featured: p.super_destaque,
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

    // Módulo 'api' precisa estar habilitado
    const { data: moduleData } = await supabase
      .from('organization_modules')
      .select('is_enabled')
      .eq('organization_id', organizationId)
      .eq('module_name', 'api')
      .maybeSingle()

    if (!moduleData?.is_enabled) {
      return json({ error: 'API module is not enabled for this organization', code: 'module_disabled' }, 403)
    }

    // Update last_used_at
    supabase
      .from('organization_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id)
      .then(() => {})

    const url = new URL(req.url)
    const path = url.pathname.replace('/public-api', '').replace(/\/$/, '') || '/'

    // ---------- GET /properties ----------
    if (req.method === 'GET' && path === '/properties') {
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
    if (req.method === 'GET' && propertyMatch) {
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

    // ---------- POST /leads ----------
    if (req.method === 'POST' && path === '/leads') {
      const body = await req.json()
      const { 
        name, 
        email, 
        phone, 
        message, 
        property_id, 
        source,
        tags
      } = body

      if (!name || !phone) {
        return json({ error: 'Name and phone are required', code: 'bad_request' }, 400)
      }

      const normalizedPhone = phone.replace(/\D/g, '')
      
      // Resolve property if provided
      let resolvedPropertyId = null
      let propertyPrice = null
      if (property_id) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(property_id)
        const { data: prop } = await supabase
          .from('properties')
          .select('id, preco')
          .eq(isUuid ? 'id' : 'code', property_id)
          .eq('organization_id', organizationId)
          .maybeSingle()
        
        if (prop) {
          resolvedPropertyId = prop.id
          propertyPrice = prop.preco
        }
      }

      // Check for existing lead (dedup)
      const phoneVariations = [normalizedPhone]
      if (!normalizedPhone.startsWith('55') && normalizedPhone.length <= 11) {
        phoneVariations.push('55' + normalizedPhone)
      }
      if (normalizedPhone.startsWith('55') && normalizedPhone.length > 11) {
        phoneVariations.push(normalizedPhone.substring(2))
      }

      const { data: existingLeads } = await supabase
        .from('leads')
        .select('id')
        .eq('organization_id', organizationId)
        .in('phone', phoneVariations)
        .limit(1)
      
      const existingLead = existingLeads?.[0]

      let leadId: string
      let isReentry = false

      if (existingLead) {
        leadId = existingLead.id
        isReentry = true
        
        // Use register_lead_reentry RPC if available
        const { error: reentryError } = await supabase.rpc('register_lead_reentry', {
          p_lead_id: leadId,
          p_org_id: organizationId,
          p_entry_type: 'api_reentry',
          p_source: source || 'API',
          p_property_id: resolvedPropertyId,
          p_valor_interesse: propertyPrice,
          p_metadata: { source_api: true, raw_payload: body }
        })

        if (reentryError) {
          // Fallback update
          await supabase
            .from('leads')
            .update({
              name: name || undefined,
              email: email || undefined,
              message: message || undefined,
              interest_property_id: resolvedPropertyId || undefined,
              valor_interesse: propertyPrice || undefined,
              deal_status: 'open',
              last_entry_at: new Date().toISOString()
            })
            .eq('id', leadId)
        }
        
        // Trigger redistribution
        await supabase.rpc('handle_lead_intake', { p_lead_id: leadId })
      } else {
        // Create new lead
        const { data: newLead, error: createError } = await supabase
          .from('leads')
          .insert({
            organization_id: organizationId,
            name,
            email: email || null,
            phone: normalizedPhone,
            message: message || null,
            source: source || 'API',
            interest_property_id: resolvedPropertyId,
            valor_interesse: propertyPrice,
            assigned_user_id: null // Triggers auto-distribution
          })
          .select('id')
          .single()
        
        if (createError) throw createError
        leadId = newLead.id

        // Log creation activity
        await supabase.from('activities').insert({
          lead_id: leadId,
          type: 'lead_created',
          content: `Lead criado via API Pública (${source || 'API'})`
        })
      }

      // Save metadata
      await supabase.from('lead_meta').upsert({
        lead_id: leadId,
        source_type: 'api',
        raw_payload: body
      })

      // Apply tags if provided
      if (tags && Array.isArray(tags)) {
        const leadTags = tags.map(tagId => ({ lead_id: leadId, tag_id: tagId }))
        await supabase.from('lead_tags').upsert(leadTags, { onConflict: 'lead_id,tag_id' })
      }

      return json({ 
        success: true, 
        lead_id: leadId, 
        message: isReentry ? 'Lead atualizado (reentrada)' : 'Lead criado com sucesso',
        reentry: isReentry
      })
    }

    return json({ error: 'Endpoint not found', code: 'not_found' }, 404)
  } catch (err) {
    console.error('public-api error:', err)
    return json({ error: 'Internal Server Error', code: 'internal_error', details: (err as Error).message }, 500)
  }
})
