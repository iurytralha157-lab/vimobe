-- Step 1: Update notification_templates table
DO $$ 
BEGIN 
    -- Add channels array if doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'channels') THEN
        ALTER TABLE public.notification_templates ADD COLUMN channels TEXT[] DEFAULT '{}';
        
        -- Migrate data from channel (singular) to channels (array)
        UPDATE public.notification_templates SET channels = ARRAY[channel] WHERE channel IS NOT NULL;
        
        -- Remove singular channel column
        ALTER TABLE public.notification_templates DROP COLUMN channel;
    END IF;

    -- Add subject column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'subject') THEN
        ALTER TABLE public.notification_templates ADD COLUMN subject TEXT;
    END IF;

    -- Add html_body column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'html_body') THEN
        ALTER TABLE public.notification_templates ADD COLUMN html_body TEXT;
    END IF;

    -- Add dedupe_window_seconds column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'dedupe_window_seconds') THEN
        ALTER TABLE public.notification_templates ADD COLUMN dedupe_window_seconds INTEGER DEFAULT 60;
    END IF;
END $$;

-- Step 2: Create notification_settings table
CREATE TABLE IF NOT EXISTS public.notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    from_name TEXT,
    from_email TEXT,
    reply_to TEXT,
    admin_emails TEXT[] DEFAULT '{}',
    test_phone TEXT,
    test_email TEXT,
    enabled_channels TEXT[] DEFAULT '{"system", "whatsapp"}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_org_settings UNIQUE (organization_id)
);

-- Step 3: Update notification_logs table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_logs' AND column_name = 'dedupe_key') THEN
        ALTER TABLE public.notification_logs ADD COLUMN dedupe_key TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_logs' AND column_name = 'is_test') THEN
        ALTER TABLE public.notification_logs ADD COLUMN is_test BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Step 4: Create email_templates and email_logs
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    template_key TEXT NOT NULL,
    name TEXT NOT NULL,
    subject TEXT,
    html TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_org_template_key UNIQUE (organization_id, template_key)
);

CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
    recipient TEXT NOT NULL,
    subject TEXT,
    status TEXT NOT NULL, -- sent, failed
    error TEXT,
    sent_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for new tables
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Simplified for now, as usually they follow org-level access)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage notification settings') THEN
        CREATE POLICY "Admins can manage notification settings" ON public.notification_settings
            FOR ALL USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND (u.role = 'admin' OR u.role = 'super_admin')));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage email templates') THEN
        CREATE POLICY "Admins can manage email templates" ON public.email_templates
            FOR ALL USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND (u.role = 'admin' OR u.role = 'super_admin')));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view email logs') THEN
        CREATE POLICY "Admins can view email logs" ON public.email_logs
            FOR SELECT USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND (u.role = 'admin' OR u.role = 'super_admin')));
    END IF;
END $$;
