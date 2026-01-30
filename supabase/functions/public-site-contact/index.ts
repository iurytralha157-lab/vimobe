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

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { 
      organization_id, 
      name, 
      email, 
      phone, 
      message, 
      property_id,
      property_code
    } = await req.json();

    if (!organization_id || !name || !phone) {
      return new Response(
        JSON.stringify({ error: 'organization_id, name, and phone are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`New contact form submission for org: ${organization_id}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the site is active for this organization
    const { data: siteData, error: siteError } = await supabase
      .from('organization_sites')
      .select('is_active')
      .eq('organization_id', organization_id)
      .maybeSingle();

    if (siteError || !siteData?.is_active) {
      return new Response(
        JSON.stringify({ error: 'Site not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize phone number
    const normalizedPhone = phone.replace(/\D/g, '');

    // Check if lead already exists with this phone
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('phone', normalizedPhone)
      .limit(1)
      .maybeSingle();

    let leadId: string;

    if (existingLead) {
      // Update existing lead with new message
      leadId = existingLead.id;
      
      // Add activity for the new contact
      await supabase
        .from('activities')
        .insert({
          lead_id: leadId,
          type: 'note',
          content: `Nova mensagem do site: ${message || 'Sem mensagem'}${property_code ? ` (Imóvel: ${property_code})` : ''}`
        });

      console.log(`Updated existing lead: ${leadId}`);
    } else {
      // Get the first admin of the organization as default assignee
      const { data: admin } = await supabase
        .from('users')
        .select('id')
        .eq('organization_id', organization_id)
        .eq('role', 'admin')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      console.log(`Admin found for org ${organization_id}:`, admin?.id || 'none');

      // Create lead WITHOUT pipeline/stage initially (goes to Contacts only)
      const leadData: Record<string, unknown> = {
        organization_id: organization_id,
        pipeline_id: null,          // No pipeline initially
        stage_id: null,             // No stage initially
        assigned_user_id: admin?.id || null,  // Admin as default responsible
        assigned_at: admin ? new Date().toISOString() : null,
        name: name,
        email: email || null,
        phone: normalizedPhone,     // Fixed: was 'telefone'
        message: message || null,   // Fixed: was 'notes'
        source: 'website',
        deal_status: 'open',
        interest_property_id: property_id || null,
      };

      const { data: newLead, error: leadError } = await supabase
        .from('leads')
        .insert(leadData)
        .select('id')
        .single();

      if (leadError) {
        console.error('Error creating lead:', leadError);
        return new Response(
          JSON.stringify({ error: 'Failed to create lead' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      leadId = newLead.id;

      // Log activity
      await supabase
        .from('activities')
        .insert({
          lead_id: leadId,
          type: 'lead_created',
          content: `Lead criado via site${property_code ? ` (Imóvel: ${property_code})` : ''}`
        });

      console.log(`Created new lead: ${leadId} (without pipeline, assigned to admin: ${admin?.id || 'none'})`);

      // Try to run round-robin distribution
      // If successful, this will move the lead to a pipeline/stage and reassign
      try {
        const { data: distributionResult, error: distributionError } = await supabase
          .rpc('handle_lead_intake', { p_lead_id: leadId });
        
        if (distributionError) {
          console.log('Distribution skipped (no active queue or error):', distributionError.message);
          // Lead stays in Contacts with admin as responsible - this is fine
        } else if (distributionResult?.success && distributionResult?.assigned_user_id) {
          console.log(`Lead distributed to user: ${distributionResult.assigned_user_id}, pipeline: ${distributionResult.pipeline_id}`);
        } else {
          console.log('No distribution queue matched, lead stays in Contacts with admin');
        }
      } catch (distError) {
        console.log('Distribution attempt failed:', distError);
        // Continue without distribution - lead stays in Contacts with admin
      }
    }

    // Create notification for the assigned user (admin or distributed user)
    // First, get the current assigned user
    const { data: currentLead } = await supabase
      .from('leads')
      .select('assigned_user_id')
      .eq('id', leadId)
      .single();

    if (currentLead?.assigned_user_id) {
      await supabase.from('notifications').insert({
        user_id: currentLead.assigned_user_id,
        organization_id: organization_id,
        lead_id: leadId,
        title: 'Novo lead do site',
        content: `${name} entrou em contato pelo site${property_code ? ` sobre o imóvel ${property_code}` : ''}`,
        type: 'new_lead'
      });
    }

    // Also notify other admins if they weren't the assigned user
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('role', 'admin')
      .eq('is_active', true)
      .neq('id', currentLead?.assigned_user_id || '00000000-0000-0000-0000-000000000000');

    if (admins && admins.length > 0) {
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        organization_id: organization_id,
        lead_id: leadId,
        title: 'Novo lead do site',
        content: `${name} entrou em contato pelo site${property_code ? ` sobre o imóvel ${property_code}` : ''}`,
        type: 'new_lead'
      }));

      await supabase.from('notifications').insert(notifications);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Contato enviado com sucesso!',
        lead_id: leadId
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
