import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    // Get request body
    const { 
      requestId, 
      planId, 
      confirmedValue, 
      billingCycle, 
      adminNotes,
      approverIp
    } = await req.json();

    if (!requestId || !planId || !confirmedValue) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch the onboarding request
    const { data: onboardingRequest, error: fetchError } = await supabaseAdmin
      .from('onboarding_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !onboardingRequest) {
      return new Response(JSON.stringify({ error: 'Onboarding request not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (onboardingRequest.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Request is already processed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Generate random password
    const generatedPassword = Math.random().toString(36).slice(-10) + 'A1!';

    // 3. Create organization and admin user (reusing the logic or calling the other function)
    // For simplicity and atomicity, we'll implement it here or call create-organization-admin
    // Since we are already in an edge function, let's call the logic directly to avoid another HTTP call
    
    // a. Create Org
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: onboardingRequest.company_name,
        segment: onboardingRequest.segment || 'imobiliario',
        whatsapp: onboardingRequest.company_whatsapp || null,
        cnpj: onboardingRequest.cnpj || null,
        endereco: onboardingRequest.company_address || null,
        cidade: onboardingRequest.company_city || null,
        bairro: onboardingRequest.company_neighborhood || null,
        numero: onboardingRequest.company_number || null,
        complemento: onboardingRequest.company_complement || null,
        plan_id: planId,
        subscription_status: 'trial',
        subscription_type: 'trial',
        trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days trial
      })
      .select()
      .single();

    if (orgError) throw orgError;

    // b. Get or Create Auth User
    let userId: string;
    const { data: existingUserQuery, error: userQueryError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', onboardingRequest.responsible_email)
      .maybeSingle();

    if (userQueryError) throw userQueryError;

    if (existingUserQuery) {
      userId = existingUserQuery.id;
      console.log(`User already exists with ID: ${userId}, updating profile.`);
    } else {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: onboardingRequest.responsible_email,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: {
          name: onboardingRequest.responsible_name,
        },
      });

      if (authError) {
        // Double check if it's an email_exists error that happened between our check and create
        if (authError.message.includes('already been registered') || (authError as any).code === 'email_exists') {
          const { data: retryUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', onboardingRequest.responsible_email)
            .maybeSingle();
          if (retryUser) {
            userId = retryUser.id;
          } else {
            throw authError;
          }
        } else {
          throw authError;
        }
      } else {
        userId = authData.user.id;
      }
    }

    // c. Update user profile
    await supabaseAdmin
      .from('users')
      .update({
        name: onboardingRequest.responsible_name,
        role: 'admin',
        organization_id: org.id,
        is_active: true,
        whatsapp: onboardingRequest.responsible_phone || onboardingRequest.company_whatsapp || null,
      })
      .eq('id', userId);

    // d. Set user role
    await supabaseAdmin
      .from('user_roles')
      .upsert({ user_id: userId, role: 'admin' });

    // 4. Update Onboarding Request
    const { error: updateError } = await supabaseAdmin
      .from('onboarding_requests')
      .update({
        status: 'approved',
        admin_notes: adminNotes,
        selected_plan_id: planId,
        confirmed_value: Number(confirmedValue),
        billing_cycle: billingCycle,
        approved_at: new Date().toISOString(),
        approver_ip: approverIp || req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')
      })
      .eq('id', requestId);

    if (updateError) throw updateError;

    // 5. Trigger Asaas payment link (Optional, if asaas-create-payment-link is available)
    let paymentUrl: string | undefined;
    try {
      const { data: linkData } = await supabaseAdmin.functions.invoke('asaas-create-payment-link', {
        body: {
          organization_id: org.id,
          onboarding_id: requestId,
          plan_name: 'Vimob Pro', // Hardcoded or fetch from plans table
          value: Number(confirmedValue),
          billing_cycle: billingCycle,
          customer_name: onboardingRequest.responsible_name,
          customer_email: onboardingRequest.responsible_email,
          customer_phone: onboardingRequest.responsible_phone || onboardingRequest.company_whatsapp,
          customer_cpf_cnpj: onboardingRequest.responsible_cpf || onboardingRequest.cnpj,
          temp_password: generatedPassword,
        }
      });
      paymentUrl = linkData?.payment_link_url;
    } catch (e) {
      console.error('Failed to create Asaas link:', e);
    }

    // 6. Return success
    return new Response(JSON.stringify({ 
      success: true, 
      email: onboardingRequest.responsible_email,
      password: generatedPassword,
      paymentUrl,
      organizationId: org.id
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error approving request:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
