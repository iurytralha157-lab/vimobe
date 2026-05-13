
-- Create notification_templates table
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category TEXT DEFAULT 'info',
    event_key TEXT,
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'push', 'system', 'email')),
    title TEXT,
    message TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    editable_by_admin BOOLEAN DEFAULT true,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create notification_logs table
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    recipient TEXT,
    channel TEXT NOT NULL,
    payload JSONB DEFAULT '{}',
    response JSONB DEFAULT '{}',
    status TEXT NOT NULL,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Seed some default templates
INSERT INTO public.notification_templates (name, slug, channel, category, message, variables)
VALUES 
('Boas-vindas WhatsApp', 'welcome_whatsapp', 'whatsapp', 'marketing', 'Olá {user_name}! Bem-vindo ao sistema. Como podemos ajudar hoje?', ARRAY['user_name']),
('Nova Tarefa', 'new_task_system', 'system', 'task', 'Você tem uma nova tarefa: {task_title}', ARRAY['task_title']),
('Lead Recebido', 'new_lead_push', 'push', 'lead', 'Novo lead recebido: {lead_name}', ARRAY['lead_name']),
('Lembrete de Agendamento', 'appointment_reminder_whatsapp', 'whatsapp', 'reminder', 'Olá {user_name}, passando para lembrar do seu agendamento amanhã às {time}.', ARRAY['user_name', 'time'])
ON CONFLICT (slug) DO NOTHING;
