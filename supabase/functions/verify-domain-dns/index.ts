import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_IP = '185.158.133.1';

interface DnsRecord {
  type: string;
  name: string;
  data: string;
  TTL?: number;
}

async function checkDns(domain: string): Promise<{ verified: boolean; records: DnsRecord[]; error?: string }> {
  try {
    // Clean domain (remove protocol, www, trailing slash)
    const cleanDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');

    console.log(`Checking DNS for domain: ${cleanDomain}`);

    // Use Google's DNS-over-HTTPS API to check A records
    const response = await fetch(`https://dns.google/resolve?name=${cleanDomain}&type=A`, {
      headers: { 'Accept': 'application/dns-json' }
    });

    if (!response.ok) {
      console.error(`DNS lookup failed with status: ${response.status}`);
      return { verified: false, records: [], error: 'DNS lookup failed' };
    }

    const data = await response.json();
    console.log('DNS response:', JSON.stringify(data));

    const records: DnsRecord[] = [];
    
    if (data.Answer) {
      for (const answer of data.Answer) {
        if (answer.type === 1) { // A record
          records.push({
            type: 'A',
            name: answer.name,
            data: answer.data,
            TTL: answer.TTL
          });
        }
      }
    }

    // Check if any A record points to Lovable IP
    const verified = records.some(r => r.data === LOVABLE_IP);

    console.log(`Domain ${cleanDomain} verification result: ${verified}`, records);

    return { verified, records };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error checking DNS:', error);
    return { verified: false, records: [], error: errorMessage };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { domain, organization_id, check_all } = await req.json();

    // If check_all is true, verify all pending domains (for cron job)
    if (check_all) {
      console.log('Checking all pending domains...');
      
      const { data: pendingSites, error: fetchError } = await supabase
        .from('organization_sites')
        .select('id, organization_id, custom_domain')
        .not('custom_domain', 'is', null)
        .eq('domain_verified', false);

      if (fetchError) {
        console.error('Error fetching pending sites:', fetchError);
        throw fetchError;
      }

      console.log(`Found ${pendingSites?.length || 0} pending domains to verify`);

      const results = [];
      for (const site of pendingSites || []) {
        if (!site.custom_domain) continue;

        const dnsResult = await checkDns(site.custom_domain);
        
        if (dnsResult.verified) {
          const { error: updateError } = await supabase
            .from('organization_sites')
            .update({
              domain_verified: true,
              domain_verified_at: new Date().toISOString()
            })
            .eq('id', site.id);

          if (updateError) {
            console.error(`Error updating site ${site.id}:`, updateError);
          } else {
            console.log(`Domain ${site.custom_domain} verified successfully`);
          }
        }

        results.push({
          domain: site.custom_domain,
          verified: dnsResult.verified,
          records: dnsResult.records
        });
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Single domain verification
    if (!domain) {
      return new Response(JSON.stringify({ error: 'Domain is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const dnsResult = await checkDns(domain);

    // If organization_id provided and verified, update the database
    if (organization_id && dnsResult.verified) {
      const { error: updateError } = await supabase
        .from('organization_sites')
        .update({
          domain_verified: true,
          domain_verified_at: new Date().toISOString()
        })
        .eq('organization_id', organization_id)
        .eq('custom_domain', domain);

      if (updateError) {
        console.error('Error updating domain verification:', updateError);
      }
    }

    return new Response(JSON.stringify({
      domain,
      verified: dnsResult.verified,
      records: dnsResult.records,
      expected_ip: LOVABLE_IP,
      error: dnsResult.error
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in verify-domain-dns:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
