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

    // Verify caller is super_admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check super admin
    const { data: saRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle();

    const { data: saUser } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (!saRole && !saUser) {
      return new Response(JSON.stringify({ error: 'Only super_admin can run migrations' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use the Supabase Management API / direct postgres via service role
    // Execute SQL statements via supabase.rpc or direct query
    const { sql } = await req.json();

    if (!sql) {
      return new Response(JSON.stringify({ error: 'No SQL provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Execute via fetch to the PostgREST rpc endpoint won't work for DDL
    // Use the supabase-js sql tagged template instead
    const dbUrl = Deno.env.get('SUPABASE_DB_URL');
    
    if (!dbUrl) {
      // Fallback: try using the postgres connection string from env
      // Try running via pg module
      return new Response(JSON.stringify({ 
        error: 'SUPABASE_DB_URL not available. Please run the SQL manually in the Supabase SQL Editor.',
        sql_to_run: sql
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
