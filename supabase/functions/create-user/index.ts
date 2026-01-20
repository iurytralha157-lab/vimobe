import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_PASSWORD = 'trocar@2026';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(JSON.stringify({ 
        error: 'Token de autenticação não fornecido. Por favor, faça login novamente.',
        code: 'MISSING_AUTH_HEADER'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callerUser) {
      console.error('Auth validation failed:', authError?.message || 'User not found');
      return new Response(JSON.stringify({ 
        error: 'Sua sessão expirou. Por favor, faça login novamente.',
        code: 'SESSION_EXPIRED'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get caller's profile to check permissions
    const { data: callerProfile } = await supabaseAdmin
      .from('users')
      .select('organization_id, role')
      .eq('id', callerUser.id)
      .single();

    // Check if caller is super admin
    const { data: superAdminRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .eq('role', 'super_admin')
      .single();

    const isSuperAdmin = !!superAdminRole;
    const isOrgAdmin = callerProfile?.role === 'admin';

    if (!isSuperAdmin && !isOrgAdmin) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions. Must be an admin.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { name, email, role, organizationId, phone, endereco } = await req.json();

    if (!name || !email || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields: name, email, role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine which organization to use
    let targetOrgId = organizationId;
    
    // If not super admin, can only create users in their own organization
    if (!isSuperAdmin) {
      targetOrgId = callerProfile?.organization_id;
    }

    if (!targetOrgId) {
      return new Response(JSON.stringify({ error: 'Organization ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify organization exists
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('id', targetOrgId)
      .single();

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: 'Organization not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, organization_id, name')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      // If user exists without organization, add them to the current org
      if (!existingUser.organization_id) {
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            organization_id: targetOrgId,
            role: role as 'admin' | 'user',
            name: name || existingUser.name,
            phone: phone || null,
            endereco: endereco || null,
            is_active: true,
          })
          .eq('id', existingUser.id);

        if (updateError) {
          console.error('Error updating orphan user:', updateError);
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`Orphan user ${email} added to org ${org.name}`);
        return new Response(JSON.stringify({ 
          success: true, 
          user: {
            id: existingUser.id,
            email,
            name: name || existingUser.name,
            role,
          },
          wasOrphan: true,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // User already belongs to an organization
      if (existingUser.organization_id === targetOrgId) {
        return new Response(JSON.stringify({ error: 'Este usuário já pertence a esta organização' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Este usuário já pertence a outra organização' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Create auth user with default password
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        name,
      },
    });

    if (createAuthError || !authData.user) {
      console.error('Error creating auth user:', createAuthError);
      return new Response(JSON.stringify({ error: createAuthError?.message || 'Erro ao criar usuário' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Create/update user profile in users table (upsert to handle auth trigger race condition)
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authData.user.id,
        email,
        name,
        phone: phone || null,
        endereco: endereco || null,
        role: role as 'admin' | 'user',
        organization_id: targetOrgId,
        is_active: true,
      }, { onConflict: 'id' });

    if (userError) {
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      console.error('Error creating user profile:', userError);
      return new Response(JSON.stringify({ error: userError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`User created successfully: ${email} in org ${org.name}`);

    return new Response(JSON.stringify({ 
      success: true, 
      user: {
        id: authData.user.id,
        email,
        name,
        role,
      },
      defaultPassword: DEFAULT_PASSWORD,
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
