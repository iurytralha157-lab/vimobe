CREATE OR REPLACE FUNCTION public.handle_activity_gamification()
RETURNS TRIGGER AS $$
DECLARE
    v_points INTEGER := 0;
    v_action_type TEXT;
    v_org_id UUID;
    v_rule_points INTEGER;
BEGIN
    -- Busca o organization_id do usuário
    SELECT organization_id INTO v_org_id FROM public.users WHERE id = NEW.user_id;
    IF v_org_id IS NULL THEN 
        BEGIN v_org_id := NEW.organization_id; EXCEPTION WHEN others THEN v_org_id := NULL; END;
    END IF;
    IF v_org_id IS NULL THEN RETURN NEW; END IF;

    -- Mapeamento expandido de tipos de atividade
    IF TG_TABLE_NAME = 'activities' THEN
        IF NEW.type IN ('call', 'call_made') THEN 
            v_action_type := 'call_made';
            IF NEW.metadata->>'outcome' = 'answered' THEN v_action_type := 'contact_made'; END IF;
        ELSIF NEW.type IN ('message', 'message_sent', 'whatsapp_message_sent') THEN 
            v_action_type := 'message_sent';
            IF NEW.metadata->>'outcome' = 'replied' THEN v_action_type := 'contact_made'; END IF;
        ELSIF NEW.type IN ('lead_created', 'lead_created_manual') THEN v_action_type := 'lead_created_manual';
        ELSIF NEW.type = 'property_created' THEN v_action_type := 'property_created';
        ELSIF NEW.type = 'sale_closed' THEN v_action_type := 'sale_closed';
        ELSIF NEW.type IN ('visit_scheduled', 'meeting_scheduled') THEN v_action_type := 'visit_scheduled';
        ELSIF NEW.type IN ('visit_confirmed', 'meeting_held', 'visit_realized') THEN v_action_type := 'visit_confirmed';
        ELSIF NEW.type = 'proposal_sent' THEN v_action_type := 'proposal_sent';
        ELSIF NEW.type IN ('stage_change', 'status_change') THEN
            -- CORREÇÃO: Verifica to_status (usado no log_lead_activity) e new_status (fallback)
            IF NEW.metadata->>'to_status' = 'won' 
               OR NEW.metadata->>'new_status' = 'won'
               OR NEW.metadata->>'to_stage' ILIKE ANY (ARRAY['%Venda%', '%Ganh%', '%Fechamento%', '%Won%']) 
               OR NEW.metadata->>'new_stage_name' ILIKE ANY (ARRAY['%Venda%', '%Ganh%', '%Fechamento%', '%Won%'])
            THEN v_action_type := 'sale_closed';
            ELSIF NEW.metadata->>'new_stage_name' ILIKE '%Proposta%' OR NEW.metadata->>'to_stage' ILIKE '%Proposta%' THEN v_action_type := 'proposal_sent';
            ELSIF NEW.metadata->>'new_stage_name' ILIKE '%Visita%' AND (NEW.metadata->>'new_stage_name' ILIKE ANY (ARRAY['%Realizada%', '%Confirmada%'])) THEN v_action_type := 'visit_confirmed';
            ELSE RETURN NEW; END IF;
        ELSE RETURN NEW; END IF;
    ELSIF TG_TABLE_NAME = 'prospecting_reports' THEN v_action_type := 'prospecting_report';
    ELSE RETURN NEW; END IF;

    -- Busca pontos da regra ou usa fallback
    SELECT points INTO v_rule_points FROM public.gamification_rules WHERE organization_id = v_org_id AND action_type = v_action_type AND is_active = true LIMIT 1;
    IF v_rule_points IS NULL THEN
        CASE v_action_type
            WHEN 'sale_closed' THEN v_rule_points := 500;
            WHEN 'visit_confirmed' THEN v_rule_points := 70;
            WHEN 'visit_scheduled' THEN v_rule_points := 50;
            WHEN 'contact_made' THEN v_rule_points := 3;
            WHEN 'lead_created_manual' THEN v_rule_points := 10;
            ELSE v_rule_points := 1;
        END CASE;
    END IF;

    IF v_points = 0 THEN v_points := v_rule_points; END IF;

    IF v_points <= 0 THEN RETURN NEW; END IF;

    -- Registra logs e atualiza ranking
    INSERT INTO public.gamification_activity_logs (user_id, organization_id, action_type, points_earned, reference_id, metadata)
    VALUES (NEW.user_id, v_org_id, v_action_type, v_points, NEW.id, NEW.metadata);
    
    INSERT INTO public.user_gamification_stats (user_id, organization_id, total_points, updated_at)
    VALUES (NEW.user_id, v_org_id, v_points, now())
    ON CONFLICT (user_id) DO UPDATE SET total_points = public.user_gamification_stats.total_points + EXCLUDED.total_points, updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
