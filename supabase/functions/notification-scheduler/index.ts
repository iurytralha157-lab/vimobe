import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REMINDER_INTERVALS = [
  { minutes: 60, type: 'reminder', target: 'lead' },
  { minutes: 30, type: 'reminder', target: 'user' },
  { minutes: 10, type: 'reminder', target: 'user' },
  { minutes: 10, type: 'arrival', target: 'lead' },
  { minutes: 5, type: 'reminder', target: 'user' },
  { minutes: 0, type: 'starting_now', target: 'user' }
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    
    // Process schedule_events reminders
    const { data: upcomingEvents, error: eventsError } = await supabase
      .from("schedule_events")
      .select(`
        id, user_id, organization_id, title, start_time, lead_id, event_type,
        lead:leads(id, name, phone)
      `)
      .neq("status", "cancelled")
      .neq("status", "completed")
      .gte("start_time", now.toISOString())
      .lte("start_time", new Date(now.getTime() + 65 * 60 * 1000).toISOString());

    if (eventsError) throw eventsError;

    console.log(`Processing ${upcomingEvents?.length || 0} upcoming events`);

    for (const event of upcomingEvents || []) {
      const startTime = new Date(event.start_time);
      const diffMinutes = Math.floor((startTime.getTime() - now.getTime()) / (1000 * 60));
      const eventType = event.event_type;
      const isCritical = eventType === 'meeting' || eventType === 'visit';

      for (const interval of REMINDER_INTERVALS) {
        if (!isCritical && (interval.minutes === 30 || interval.minutes === 10 || interval.target === 'lead')) {
          continue;
        }

        if (diffMinutes === interval.minutes) {
          const reminderTag = `[EVT_${event.id}_${interval.minutes}_${interval.target}]`;
          
          const { data: existingNotif } = await supabase
            .from("notifications")
            .select("id")
            .ilike("content", `%${reminderTag}%`)
            .limit(1);

          if (existingNotif && existingNotif.length > 0) continue;

          const formattedTime = startTime.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Sao_Paulo",
          });

          if (interval.target === 'user') {
            const title = interval.minutes === 0 ? "🔔 Atividade começando agora!" : `⏰ Atividade em ${interval.minutes} minutos!`;
            const content = `${event.title} às ${formattedTime} ${reminderTag}`;

            await supabase.from("notifications").insert({
              user_id: event.user_id,
              organization_id: event.organization_id,
              title,
              content,
              type: "task",
              lead_id: event.lead_id,
              is_read: false,
            });

            try {
              await fetch(`${supabaseUrl}/functions/v1/whatsapp-notifier`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  organization_id: event.organization_id,
                  user_id: event.user_id,
                  message: `*${title}*\n\n📅 *Evento:* ${event.title}\n🕒 *Horário:* ${formattedTime}\n👤 *Lead:* ${event.lead?.name || 'Não informado'}`,
                }),
              });
            } catch (e) {
              console.error("Error sending WhatsApp to user:", e);
            }
          }

          if (interval.target === 'lead' && event.lead?.phone) {
            let message = "";
            if (interval.minutes === 60) {
              message = `Olá ${event.lead.name}! Passando para lembrar do nosso compromisso: *${event.title}* às *${formattedTime}*. Até logo!`;
            } else if (interval.minutes === 10) {
              message = `Oi ${event.lead.name}, estamos a 10 minutos do nosso compromisso: *${event.title}*. Tudo certo por aí?`;
            }

            if (message) {
              try {
                await fetch(`${supabaseUrl}/functions/v1/whatsapp-notifier`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${supabaseServiceKey}`,
                  },
                  body: JSON.stringify({
                    organization_id: event.organization_id,
                    phone: event.lead.phone,
                    message: `${message}\n\n${reminderTag}`,
                  }),
                });
              } catch (e) {
                console.error("Error sending WhatsApp to lead:", e);
              }
            }
          }
        }
      }
    }

    // Cadence Tasks and Financial Logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    // Tasks Vencendo Hoje, Amanhã, Atrasadas
    const { data: allTasks } = await supabase
      .from("lead_tasks")
      .select(`id, lead_id, title, due_date, type, lead:leads(id, name, assigned_user_id, organization_id)`)
      .eq("is_done", false);

    for (const task of allTasks || []) {
      const lead = task.lead as any;
      if (!lead?.assigned_user_id) continue;

      const dueDate = new Date(task.due_date);
      let title = "";
      if (dueDate >= today && dueDate <= todayEnd) title = "⚠️ Tarefa de cadência vence hoje!";
      else if (dueDate >= tomorrow && dueDate <= tomorrowEnd) title = "📅 Tarefa de cadência vence amanhã";
      else if (dueDate < today) title = "🚨 Tarefa de cadência atrasada!";

      if (title) {
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", lead.assigned_user_id)
          .ilike("title", title)
          .ilike("content", `%${task.title}%`)
          .gte("created_at", today.toISOString())
          .limit(1);

        if (existing?.length === 0) {
          await supabase.from("notifications").insert({
            user_id: lead.assigned_user_id,
            organization_id: lead.organization_id,
            title,
            content: `Tarefa: "${task.title}" do lead "${lead.name}".`,
            type: "task",
            lead_id: lead.id,
          });
        }
      }
    }

    // Financial Logic (simplified but preserved)
    const { data: financialEntries } = await supabase
      .from("financial_entries")
      .select("id, organization_id, type, description, amount, due_date")
      .eq("status", "pending");

    for (const entry of financialEntries || []) {
      const typeLabel = entry.type === 'payable' ? 'A Pagar' : 'A Receber';
      let fTitle = "";
      if (entry.due_date === todayStr) fTitle = "⚠️ Conta vence hoje!";
      else if (entry.due_date < todayStr) fTitle = "🚨 Conta em atraso!";

      if (fTitle) {
        const { data: admins } = await supabase.from("users").select("id").eq("organization_id", entry.organization_id).eq("role", "admin");
        for (const admin of admins || []) {
          const { data: existing } = await supabase.from("notifications").select("id").eq("user_id", admin.id).ilike("title", fTitle).ilike("content", `%${entry.description}%`).gte("created_at", today.toISOString()).limit(1);
          if (existing?.length === 0) {
            await supabase.from("notifications").insert({
              user_id: admin.id,
              organization_id: entry.organization_id,
              title: fTitle,
              content: `${typeLabel}: ${entry.description}`,
              type: "commission",
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Scheduler error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});