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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the caller is a super admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid token');
    }

    // Check if user is super admin
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle();

    const isSuperAdmin = userData?.role === 'super_admin' || !!roleData;

    if (!isSuperAdmin) {
      throw new Error('Unauthorized: Only super admins can manage users');
    }

    const { action, userId, ...data } = await req.json();

    console.log(`[manage-user] Action: ${action}, User: ${userId}`);

    let result;

    switch (action) {
      case 'delete':
        // Delete user from auth.users (cascades to public.users and user_roles)
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (deleteAuthError) {
          throw new Error(`Failed to delete auth user: ${deleteAuthError.message}`);
        }
        result = { success: true, message: 'User deleted successfully' };
        break;

      case 'update':
        // Update user in public.users
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update(data)
          .eq('id', userId);
        
        if (updateError) {
          throw new Error(`Failed to update user: ${updateError.message}`);
        }
        result = { success: true, message: 'User updated successfully' };
        break;

      case 'change_organization':
        // Change user's organization
        const { organization_id } = data;
        const { error: changeOrgError } = await supabaseAdmin
          .from('users')
          .update({ organization_id })
          .eq('id', userId);
        
        if (changeOrgError) {
          throw new Error(`Failed to change organization: ${changeOrgError.message}`);
        }
        result = { success: true, message: 'Organization changed successfully' };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[manage-user] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
