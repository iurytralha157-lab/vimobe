DO $$
BEGIN
    -- Política para INSERT na tabela activities
    DROP POLICY IF EXISTS "Users can create activities" ON public.activities;
    CREATE POLICY "Users can create activities" ON public.activities
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.leads l
            JOIN public.users u ON u.organization_id = l.organization_id
            WHERE l.id = lead_id AND u.id = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

    -- Política para INSERT na tabela schedule_events
    DROP POLICY IF EXISTS "Admins can insert events for others" ON public.schedule_events;
    CREATE POLICY "Admins can insert events for others" ON public.schedule_events
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
        AND (
            user_id = auth.uid() 
            OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
        )
    );

    -- Garantir que RLS está habilitado e políticas de visualização existem
    ALTER TABLE public.gamification_activity_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view own gamification logs" ON public.gamification_activity_logs;
    CREATE POLICY "Users can view own gamification logs" ON public.gamification_activity_logs
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

END $$;
