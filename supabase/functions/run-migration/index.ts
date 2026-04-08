import postgres from 'https://deno.land/x/postgresjs@v3.4.5/mod.js';
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
    const dbUrl = Deno.env.get('SUPABASE_DB_URL');
    if (!dbUrl) {
      return new Response(JSON.stringify({ error: 'SUPABASE_DB_URL not available' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is super_admin via service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      
      if (user) {
        // Check if super admin
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
          return new Response(JSON.stringify({ error: 'Only super_admin' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        return new Response(JSON.stringify({ error: 'Invalid auth' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: 'No auth header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { sql: sqlStatements } = await req.json();
    if (!sqlStatements || !Array.isArray(sqlStatements)) {
      return new Response(JSON.stringify({ error: 'Provide sql as array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sql = postgres(dbUrl);
    const results: string[] = [];

    for (const stmt of sqlStatements) {
      try {
        await sql.unsafe(stmt);
        results.push(`OK: ${stmt.substring(0, 80)}...`);
      } catch (e: any) {
        results.push(`ERROR: ${e.message} | SQL: ${stmt.substring(0, 80)}...`);
      }
    }

    await sql.end();

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
