import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

    // Find events starting in the next 5-10 minutes that haven't been notified
    const { data: upcomingEvents, error: eventsError } = await supabase
      .from("schedule_events")
      .select("id, user_id, organization_id, title, start_at, lead_id, reminder_5min_sent")
      .eq("is_completed", false)
      .eq("reminder_5min_sent", false)
      .gte("start_at", fiveMinutesFromNow.toISOString())
      .lte("start_at", tenMinutesFromNow.toISOString());

    if (eventsError) throw eventsError;

    console.log(`Found ${upcomingEvents?.length || 0} events to notify (5 min reminder)`);

    // Send 5-minute reminders
    for (const event of upcomingEvents || []) {
      const startTime = new Date(event.start_at);
      const formattedTime = startTime.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      });

      // Create notification
      await supabase.from("notifications").insert({
        user_id: event.user_id,
        organization_id: event.organization_id,
        title: "Atividade em 5 minutos!",
        content: `${event.title} começa às ${formattedTime}`,
        type: "task",
        lead_id: event.lead_id,
        is_read: false,
      });

      // Mark as notified
      await supabase
        .from("schedule_events")
        .update({ reminder_5min_sent: true })
        .eq("id", event.id);

      console.log(`Sent 5-min reminder for event: ${event.title}`);
    }

    // Find events starting now (within the last minute) that haven't been notified
    const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);
    
    const { data: startingNowEvents, error: nowEventsError } = await supabase
      .from("schedule_events")
      .select("id, user_id, organization_id, title, start_at, lead_id, reminder_sent")
      .eq("is_completed", false)
      .eq("reminder_sent", false)
      .gte("start_at", oneMinuteAgo.toISOString())
      .lte("start_at", now.toISOString());

    if (nowEventsError) throw nowEventsError;

    console.log(`Found ${startingNowEvents?.length || 0} events starting now`);

    // Send "starting now" notifications
    for (const event of startingNowEvents || []) {
      await supabase.from("notifications").insert({
        user_id: event.user_id,
        organization_id: event.organization_id,
        title: "Atividade começando agora!",
        content: event.title,
        type: "task",
        lead_id: event.lead_id,
        is_read: false,
      });

      // Mark as notified
      await supabase
        .from("schedule_events")
        .update({ reminder_sent: true })
        .eq("id", event.id);

      console.log(`Sent "starting now" notification for event: ${event.title}`);
    }

    // Check today's date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    // ============================================
    // 1. TAREFAS VENCENDO HOJE (Alerta Urgente)
    // ============================================
    const { data: tasksDueToday, error: todayTasksError } = await supabase
      .from("lead_tasks")
      .select(`
        id, 
        lead_id, 
        title,
        due_date,
        type,
        lead:leads(id, name, assigned_user_id, organization_id)
      `)
      .eq("is_done", false)
      .gte("due_date", today.toISOString())
      .lte("due_date", todayEnd.toISOString())
      .limit(100);

    if (todayTasksError) throw todayTasksError;

    console.log(`Found ${tasksDueToday?.length || 0} tasks due today`);

    let tasksDueTodayNotified = 0;
    for (const task of tasksDueToday || []) {
      const lead = task.lead as any;
      if (!lead?.assigned_user_id || !lead?.organization_id) continue;

      // Check if we already sent a "due today" notification for this specific task
      const { data: existingNotification } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", lead.assigned_user_id)
        .eq("lead_id", lead.id)
        .eq("type", "task")
        .ilike("title", "%vence hoje%")
        .ilike("content", `%${task.title}%`)
        .gte("created_at", today.toISOString())
        .limit(1);

      if (existingNotification && existingNotification.length > 0) continue;

      const taskTypeLabel = task.type === 'call' ? '📞 Ligação' : 
                           task.type === 'message' ? '💬 Mensagem' : 
                           task.type === 'note' ? '📝 Observação' : '📋 Tarefa';

      // Create "due today" notification
      await supabase.from("notifications").insert({
        user_id: lead.assigned_user_id,
        organization_id: lead.organization_id,
        title: "⚠️ Tarefa de cadência vence hoje!",
        content: `${taskTypeLabel}: "${task.title}" do lead "${lead.name}" vence hoje.`,
        type: "task",
        lead_id: lead.id,
        is_read: false,
      });

      tasksDueTodayNotified++;
      console.log(`Sent "due today" notification for task: ${task.title} - Lead: ${lead.name}`);
    }

    // ============================================
    // 2. TAREFAS VENCENDO AMANHÃ (Lembrete)
    // ============================================
    const { data: tasksDueTomorrow, error: tomorrowTasksError } = await supabase
      .from("lead_tasks")
      .select(`
        id, 
        lead_id, 
        title,
        due_date,
        type,
        lead:leads(id, name, assigned_user_id, organization_id)
      `)
      .eq("is_done", false)
      .gte("due_date", tomorrow.toISOString())
      .lte("due_date", tomorrowEnd.toISOString())
      .limit(100);

    if (tomorrowTasksError) throw tomorrowTasksError;

    console.log(`Found ${tasksDueTomorrow?.length || 0} tasks due tomorrow`);

    let tasksDueTomorrowNotified = 0;
    for (const task of tasksDueTomorrow || []) {
      const lead = task.lead as any;
      if (!lead?.assigned_user_id || !lead?.organization_id) continue;

      // Check if we already sent a "due tomorrow" notification for this specific task
      const { data: existingNotification } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", lead.assigned_user_id)
        .eq("lead_id", lead.id)
        .eq("type", "task")
        .ilike("title", "%vence amanhã%")
        .ilike("content", `%${task.title}%`)
        .gte("created_at", today.toISOString())
        .limit(1);

      if (existingNotification && existingNotification.length > 0) continue;

      const taskTypeLabel = task.type === 'call' ? '📞 Ligação' : 
                           task.type === 'message' ? '💬 Mensagem' : 
                           task.type === 'note' ? '📝 Observação' : '📋 Tarefa';

      // Create "due tomorrow" notification
      await supabase.from("notifications").insert({
        user_id: lead.assigned_user_id,
        organization_id: lead.organization_id,
        title: "📅 Tarefa de cadência vence amanhã",
        content: `${taskTypeLabel}: "${task.title}" do lead "${lead.name}" vence amanhã.`,
        type: "task",
        lead_id: lead.id,
        is_read: false,
      });

      tasksDueTomorrowNotified++;
      console.log(`Sent "due tomorrow" notification for task: ${task.title} - Lead: ${lead.name}`);
    }

    // ============================================
    // 3. TAREFAS ATRASADAS (Já Venceram)
    // ============================================
    const { data: overdueTasks, error: tasksError } = await supabase
      .from("lead_tasks")
      .select(`
        id, 
        lead_id, 
        title,
        due_date,
        type,
        lead:leads(id, name, assigned_user_id, organization_id)
      `)
      .eq("is_done", false)
      .lt("due_date", today.toISOString())
      .limit(100);

    if (tasksError) throw tasksError;

    console.log(`Found ${overdueTasks?.length || 0} overdue cadence tasks`);

    let overdueTasksNotified = 0;
    for (const task of overdueTasks || []) {
      const lead = task.lead as any;
      if (!lead?.assigned_user_id || !lead?.organization_id) continue;

      // Check if we already sent an overdue notification for this task today
      const { data: existingNotification } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", lead.assigned_user_id)
        .eq("lead_id", lead.id)
        .eq("type", "task")
        .ilike("title", "%atrasada%")
        .gte("created_at", today.toISOString())
        .limit(1);

      if (existingNotification && existingNotification.length > 0) continue;

      const dueDate = new Date(task.due_date);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysLabel = daysOverdue === 1 ? "1 dia" : `${daysOverdue} dias`;

      const taskTypeLabel = task.type === 'call' ? '📞 Ligação' : 
                           task.type === 'message' ? '💬 Mensagem' : 
                           task.type === 'note' ? '📝 Observação' : '📋 Tarefa';

      // Create overdue notification
      await supabase.from("notifications").insert({
        user_id: lead.assigned_user_id,
        organization_id: lead.organization_id,
        title: "🚨 Tarefa de cadência atrasada!",
        content: `${taskTypeLabel}: "${task.title}" do lead "${lead.name}" está atrasada há ${daysLabel}.`,
        type: "task",
        lead_id: lead.id,
        is_read: false,
      });

      overdueTasksNotified++;
      console.log(`Sent overdue notification for task: ${task.title} - Lead: ${lead.name}`);
    }

    // ============================================
    // 4. CONTAS FINANCEIRAS - Vencendo hoje, em 3 dias e atrasadas
    // ============================================
    let financialDueTodayNotified = 0;
    let financialOverdueNotified = 0;
    let financialUpcomingNotified = 0;

    // A) Contas que vencem HOJE
    const { data: entriesDueToday, error: dueTodayError } = await supabase
      .from("financial_entries")
      .select("id, organization_id, type, description, amount, due_date")
      .eq("status", "pending")
      .eq("due_date", today.toISOString().split('T')[0]);

    if (!dueTodayError && entriesDueToday) {
      console.log(`Found ${entriesDueToday.length} financial entries due today`);
      
      for (const entry of entriesDueToday) {
        const typeLabel = entry.type === 'payable' ? 'A Pagar' : 'A Receber';
        const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.amount);
        
        // Get admins of this organization
        const { data: admins } = await supabase
          .from("users")
          .select("id")
          .eq("organization_id", entry.organization_id)
          .eq("role", "admin");
        
        for (const admin of admins || []) {
          // Check if already notified today
          const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", admin.id)
            .ilike("title", "%vence hoje%")
            .ilike("content", `%${entry.description}%`)
            .gte("created_at", today.toISOString())
            .limit(1);
          
          if (!existing || existing.length === 0) {
            await supabase.from("notifications").insert({
              user_id: admin.id,
              organization_id: entry.organization_id,
              title: "⚠️ Conta vence hoje!",
              content: `${typeLabel}: ${entry.description} - ${formattedAmount}`,
              type: "commission",
              is_read: false,
            });
            financialDueTodayNotified++;
          }
        }
      }
    }

    // B) Contas ATRASADAS (venceram ontem ou antes)
    const { data: overdueEntries, error: overdueError } = await supabase
      .from("financial_entries")
      .select("id, organization_id, type, description, amount, due_date")
      .eq("status", "pending")
      .lt("due_date", today.toISOString().split('T')[0]);

    if (!overdueError && overdueEntries) {
      console.log(`Found ${overdueEntries.length} overdue financial entries`);
      
      for (const entry of overdueEntries) {
        const typeLabel = entry.type === 'payable' ? 'A Pagar' : 'A Receber';
        const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.amount);
        const dueDate = new Date(entry.due_date);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        const { data: admins } = await supabase
          .from("users")
          .select("id")
          .eq("organization_id", entry.organization_id)
          .eq("role", "admin");
        
        for (const admin of admins || []) {
          const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", admin.id)
            .ilike("title", "%atraso%")
            .ilike("content", `%${entry.description}%`)
            .gte("created_at", today.toISOString())
            .limit(1);
          
          if (!existing || existing.length === 0) {
            await supabase.from("notifications").insert({
              user_id: admin.id,
              organization_id: entry.organization_id,
              title: "🚨 Conta em atraso!",
              content: `${typeLabel}: ${entry.description} - ${formattedAmount} (${daysOverdue} dia${daysOverdue > 1 ? 's' : ''} em atraso)`,
              type: "commission",
              is_read: false,
            });
            financialOverdueNotified++;
          }
        }
      }
    }

    // C) Contas que vencem em 3 dias (alerta antecipado)
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const { data: upcomingEntries, error: upcomingError } = await supabase
      .from("financial_entries")
      .select("id, organization_id, type, description, amount, due_date")
      .eq("status", "pending")
      .eq("due_date", threeDaysFromNow.toISOString().split('T')[0]);

    if (!upcomingError && upcomingEntries) {
      console.log(`Found ${upcomingEntries.length} financial entries due in 3 days`);
      
      for (const entry of upcomingEntries) {
        const typeLabel = entry.type === 'payable' ? 'A Pagar' : 'A Receber';
        const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.amount);
        
        const { data: admins } = await supabase
          .from("users")
          .select("id")
          .eq("organization_id", entry.organization_id)
          .eq("role", "admin");
        
        for (const admin of admins || []) {
          const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", admin.id)
            .ilike("title", "%vence em 3 dias%")
            .ilike("content", `%${entry.description}%`)
            .gte("created_at", today.toISOString())
            .limit(1);
          
          if (!existing || existing.length === 0) {
            await supabase.from("notifications").insert({
              user_id: admin.id,
              organization_id: entry.organization_id,
              title: "📅 Conta vence em 3 dias",
              content: `${typeLabel}: ${entry.description} - ${formattedAmount}`,
              type: "commission",
              is_read: false,
            });
            financialUpcomingNotified++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: {
          fiveMinReminders: upcomingEvents?.length || 0,
          startingNow: startingNowEvents?.length || 0,
          tasksDueToday: tasksDueTodayNotified,
          tasksDueTomorrow: tasksDueTomorrowNotified,
          overdueTasks: overdueTasksNotified,
          financialDueToday: financialDueTodayNotified,
          financialOverdue: financialOverdueNotified,
          financialUpcoming: financialUpcomingNotified,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in notification-scheduler:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
