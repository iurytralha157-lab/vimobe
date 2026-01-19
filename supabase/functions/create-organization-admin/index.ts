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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Verify the caller is authenticated using getClaims
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Create client with user's auth to verify token
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error('Claims error:', claimsError);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const callerUserId = claimsData.claims.sub as string;
    
    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if caller is super admin
    const { data: superAdminRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUserId)
      .eq('role', 'super_admin')
      .single();

    if (!superAdminRole) {
      return new Response(JSON.stringify({ error: 'Not a super admin' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { name, adminEmail, adminName, adminPassword } = await req.json();

    if (!name || !adminEmail || !adminName || !adminPassword) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Create the organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name,
      })
      .select()
      .single();

    if (orgError) {
      console.error('Error creating organization:', orgError);
      return new Response(JSON.stringify({ error: orgError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        name: adminName,
      },
    });

    if (authError) {
      // Rollback: delete the organization
      await supabaseAdmin.from('organizations').delete().eq('id', org.id);
      console.error('Error creating auth user:', authError);
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Update user profile in users table (trigger already created the user)
    const { error: userError } = await supabaseAdmin
      .from('users')
      .update({
        name: adminName,
        role: 'admin',
        organization_id: org.id,
        is_active: true,
      })
      .eq('id', authData.user.id);

    if (userError) {
      // Rollback: delete auth user and organization
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      await supabaseAdmin.from('organizations').delete().eq('id', org.id);
      console.error('Error updating user profile:', userError);
      return new Response(JSON.stringify({ error: userError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3b. Add admin role to user_roles table
    await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: authData.user.id,
        role: 'admin',
      }, { onConflict: 'user_id,role' });

    // 4. Create default modules for the org
    const defaultModules = ['crm', 'financial', 'properties', 'whatsapp', 'agenda', 'cadences', 'tags', 'round_robin', 'reports'];
    await supabaseAdmin
      .from('organization_modules')
      .insert(defaultModules.map(module => ({
        organization_id: org.id,
        module_name: module,
        is_enabled: true,
      })));

    // 5. Create default pipeline for the organization
    const { data: pipeline } = await supabaseAdmin
      .from('pipelines')
      .insert({
        organization_id: org.id,
        name: 'Pipeline Principal',
        is_default: true,
      })
      .select()
      .single();

    if (pipeline) {
      // Create default stages
      const defaultStages = [
        { name: 'Novo', stage_key: 'novo', color: '#3B82F6', position: 0 },
        { name: 'Qualificação', stage_key: 'qualificacao', color: '#F59E0B', position: 1 },
        { name: 'Proposta', stage_key: 'proposta', color: '#8B5CF6', position: 2 },
        { name: 'Negociação', stage_key: 'negociacao', color: '#EC4899', position: 3 },
        { name: 'Fechado', stage_key: 'fechado', color: '#10B981', position: 4 },
      ];

      await supabaseAdmin
        .from('stages')
        .insert(defaultStages.map(stage => ({
          ...stage,
          pipeline_id: pipeline.id,
        })));
    }

    return new Response(JSON.stringify({ 
      success: true, 
      organization: org,
      user: {
        id: authData.user.id,
        email: adminEmail,
        name: adminName,
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
