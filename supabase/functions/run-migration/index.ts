import postgres from 'https://deno.land/x/postgresjs@v3.4.5/mod.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const dbUrl = Deno.env.get('SUPABASE_DB_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Auth via service role key in header
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    
    if (token !== serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized - requires service role key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { sql: sqlStatements } = await req.json();
    if (!sqlStatements || !Array.isArray(sqlStatements)) {
      return new Response(JSON.stringify({ error: 'Provide sql as array of statements' }), {
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
      } catch (e) {
        results.push(`ERROR in "${stmt.substring(0, 80)}...": ${e.message}`);
      }
    }

    await sql.end();

    return new Response(JSON.stringify({ success: true, results }), {
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
