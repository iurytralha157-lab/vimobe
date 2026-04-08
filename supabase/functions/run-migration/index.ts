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
    const dbUrl = Deno.env.get('SUPABASE_DB_URL');
    if (!dbUrl) {
      return new Response(JSON.stringify({ error: 'SUPABASE_DB_URL not available in edge runtime' }), {
        status: 500,
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
