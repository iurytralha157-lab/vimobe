-- Gamification Rules table
CREATE TABLE IF NOT EXISTS public.gamification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'lead_created', 'visit_scheduled', 'sale_closed', 'call_made', etc.
    points INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, action_type)
);

-- User Points/Stats table
CREATE TABLE IF NOT EXISTS public.user_gamification_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    last_activity_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- Activity Logs for auditing and history
CREATE TABLE IF NOT EXISTS public.gamification_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    points_earned INTEGER NOT NULL,
    reference_id UUID, -- ID of the lead, sale, or report
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Manual Prospecting Reports
CREATE TABLE IF NOT EXISTS public.prospecting_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    calls INTEGER DEFAULT 0,
    messages INTEGER DEFAULT 0,
    contacts INTEGER DEFAULT 0,
    source TEXT, -- 'whatsapp', 'spreadsheet', etc.
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gamification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gamification_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospecting_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view rules of their organization" ON public.gamification_rules
    FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view stats of their organization" ON public.user_gamification_stats
    FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view logs of their organization" ON public.gamification_activity_logs
    FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage their own reports" ON public.prospecting_reports
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view reports from their organization" ON public.prospecting_reports
    FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Function to handle points calculation when a report is created
CREATE OR REPLACE FUNCTION public.handle_prospecting_report_points()
RETURNS TRIGGER AS $$
DECLARE
    v_points INTEGER := 0;
    v_call_points INTEGER := 0;
    v_msg_points INTEGER := 0;
    v_contact_points INTEGER := 0;
BEGIN
    -- Get points from rules
    SELECT points INTO v_call_points FROM public.gamification_rules WHERE organization_id = NEW.organization_id AND action_type = 'call_made';
    SELECT points INTO v_msg_points FROM public.gamification_rules WHERE organization_id = NEW.organization_id AND action_type = 'message_sent';
    SELECT points INTO v_contact_points FROM public.gamification_rules WHERE organization_id = NEW.organization_id AND action_type = 'contact_made';

    -- Default values if not set
    IF v_call_points IS NULL THEN v_call_points := 1; END IF;
    IF v_msg_points IS NULL THEN v_msg_points := 1; END IF;
    IF v_contact_points IS NULL THEN v_contact_points := 3; END IF;

    v_points := (NEW.calls * v_call_points) + (NEW.messages * v_msg_points) + (NEW.contacts * v_contact_points);

    IF v_points > 0 THEN
        -- Insert log
        INSERT INTO public.gamification_activity_logs (user_id, organization_id, action_type, points_earned, reference_id)
        VALUES (NEW.user_id, NEW.organization_id, 'prospecting_report', v_points, NEW.id);

        -- Update user stats
        INSERT INTO public.user_gamification_stats (user_id, organization_id, total_points, updated_at)
        VALUES (NEW.user_id, NEW.organization_id, v_points, now())
        ON CONFLICT (user_id) DO UPDATE
        SET total_points = public.user_gamification_stats.total_points + v_points,
            updated_at = now();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_prospecting_report_points
    AFTER INSERT ON public.prospecting_reports
    FOR EACH ROW EXECUTE FUNCTION public.handle_prospecting_report_points();

-- Insert default rules for existing organizations (optional, can be done via UI)
INSERT INTO public.gamification_rules (organization_id, action_type, points)
SELECT id, 'call_made', 1 FROM public.organizations
ON CONFLICT DO NOTHING;
INSERT INTO public.gamification_rules (organization_id, action_type, points)
SELECT id, 'message_sent', 1 FROM public.organizations
ON CONFLICT DO NOTHING;
INSERT INTO public.gamification_rules (organization_id, action_type, points)
SELECT id, 'contact_made', 3 FROM public.organizations
ON CONFLICT DO NOTHING;
INSERT INTO public.gamification_rules (organization_id, action_type, points)
SELECT id, 'visit_scheduled', 30 FROM public.organizations
ON CONFLICT DO NOTHING;
INSERT INTO public.gamification_rules (organization_id, action_type, points)
SELECT id, 'sale_closed', 100 FROM public.organizations
ON CONFLICT DO NOTHING;
