import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const { error } = await supabase
  .from('organizations')
  .update({ asaas_customer_id: null, cnpj: '02760017109' })
  .eq('id', '818394bf-8c57-445e-be2f-b964c2569235');

if (error) {
  console.error('Error updating org:', error);
  Deno.exit(1);
}

console.log('Organization updated successfully');
