import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateTemplate() {
  const { data, error } = await supabase
    .from('notification_templates')
    .update({
      message: '🎉 Lead Ganho!\nNome: {lead_name}\nParabéns pela venda!\n🏢 Organização: {organization_name}',
      event_key: 'deal_won',
      channels: ['system', 'whatsapp']
    })
    .eq('slug', 'deal_won_whatsapp');

  if (error) {
    console.error('Error updating template:', error);
  } else {
    console.log('Template updated successfully');
  }
}

updateTemplate();
