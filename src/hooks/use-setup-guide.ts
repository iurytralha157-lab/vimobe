import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { useOrganizationModules } from '@/hooks/use-organization-modules';
import { supabase } from '@/integrations/supabase/client';

export type SetupStepId =
  | 'whatsapp'
  | 'first_lead'
  | 'add_broker'
  | 'create_queue'
  | 'add_property'
  | 'create_site'
  | 'create_automation';

export interface SetupStep {
  id: SetupStepId;
  title: string;
  description: string;
  icon: string;
  route: string;
  ctaLabel: string;
  tourTarget?: string;
}

// Only users created on/after this date will see the guide.
// Older accounts are considered "already onboarded" and won't be bothered.
const GUIDE_CUTOFF_DATE = new Date('2024-01-01T00:00:00Z');

const SESSION_SHOWN_KEY = 'setup_guide_shown_this_session';
const ACTIVE_STEP_LS_PREFIX = 'setup_guide_active_step_';

export function useSetupGuide() {
  const { user, profile } = useAuth();
  const { hasPermission } = useUserPermissions();
  const { hasModule } = useOrganizationModules();

  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [skipped, setSkipped] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const userId = user?.id;
  const isNewUser = !!user?.created_at && new Date(user.created_at) >= GUIDE_CUTOFF_DATE;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fallback to metadata if DB table is missing
  const metaProgress = user?.user_metadata?.setup_progress || {};
  const metaSkipped = !!user?.user_metadata?.setup_skipped;


  // Build available steps based on permissions
  const allSteps: SetupStep[] = [
    {
      id: 'whatsapp',
      title: 'Conectar WhatsApp',
      description: 'Conecte sua conta para receber mensagens dos leads.',
      icon: 'MessageCircle',
      route: '/settings?tab=whatsapp',
      ctaLabel: 'Iniciar',
      tourTarget: 'whatsapp-new-session',
    },
    {
      id: 'first_lead',
      title: 'Crie seu primeiro lead',
      description: 'Veja como é o fluxo de atendimento na prática.',
      icon: 'UserPlus',
      route: '/crm/pipelines',
      ctaLabel: 'Iniciar',
      tourTarget: 'pipeline-new-lead',
    },
    {
      id: 'add_broker',
      title: 'Adicionar corretor',
      description: 'Adicione corretores à sua equipe de vendas.',
      icon: 'Users',
      route: '/settings?tab=team',
      ctaLabel: 'Iniciar',
      tourTarget: 'team-add-user',
    },
    {
      id: 'create_queue',
      title: 'Criar Fila de Atendimento',
      description: 'Defina como os leads serão distribuídos entre a equipe.',
      icon: 'Workflow',
      route: '/crm/management?tab=distribution',
      ctaLabel: 'Iniciar',
      tourTarget: 'distribution-new-queue',
    },
    {
      id: 'add_property',
      title: 'Cadastrar imóvel',
      description: 'Cadastre seu primeiro imóvel no sistema.',
      icon: 'Building2',
      route: '/properties/new',
      ctaLabel: 'Iniciar',
    },
    {
      id: 'create_site',
      title: 'Criar seu site',
      description: 'Personalize e publique o site da sua imobiliária.',
      icon: 'Globe',
      route: '/settings/site',
      ctaLabel: 'Iniciar',
    },
    {
      id: 'create_automation',
      title: 'Criar automação',
      description: 'Automatize mensagens e ações para seus leads.',
      icon: 'Zap',
      route: '/automations',
      ctaLabel: 'Iniciar',
      tourTarget: 'automations-new',
    },
  ];

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const steps: SetupStep[] = allSteps.filter((step) => {
    switch (step.id) {
      case 'whatsapp':
        return true;
      case 'first_lead':
        return true;
      case 'add_broker':
        return isAdmin;
      case 'create_queue':
        return isAdmin;
      case 'add_property':
        return hasModule('properties');
      case 'create_site':
        return isAdmin && hasModule('site');
      case 'create_automation':
        return isAdmin || hasPermission('automations_view');
      default:
        return true;
    }
  });

  // Load progress from DB (with metadata fallback)
  useEffect(() => {
    if (!userId) {
      setLoaded(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('setup_guide_progress' as any)
          .select('completed_steps, skipped')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (cancelled) return;
        
        if (error) {
          // If table is missing or other error, use metadata
          console.warn('[SetupGuide] falling back to user metadata', error);
          setProgress(metaProgress);
          setSkipped(metaSkipped);
        } else if (data) {
          const row: any = data;
          setProgress((row.completed_steps as Record<string, boolean>) || {});
          setSkipped(!!row.skipped);
        } else {
          // No row in DB yet, use metadata
          setProgress(metaProgress);
          setSkipped(metaSkipped);
        }
      } catch (err) {
        if (!cancelled) {
          setProgress(metaProgress);
          setSkipped(metaSkipped);
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, metaProgress, metaSkipped]);

  // Persist helper (debounced)
  const persist = useCallback(
    (next: { completed_steps?: Record<string, boolean>; skipped?: boolean }) => {
      if (!userId) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        // 1. Try DB table
        const payload: any = { user_id: userId, ...next };
        const { error: dbError } = await supabase
          .from('setup_guide_progress' as any)
          .upsert(payload, { onConflict: 'user_id' });
        
        if (dbError) {
          console.warn('[SetupGuide] DB save failed, relying on metadata', dbError);
        }

        // 2. Always sync to user metadata as a robust fallback
        const { error: metaError } = await supabase.auth.updateUser({
          data: {
            setup_progress: next.completed_steps ?? progress,
            setup_skipped: next.skipped ?? skipped
          }
        });

        if (metaError) {
          console.error('[SetupGuide] metadata save error', metaError);
        }
      }, 500);
    },
    [userId, progress, skipped]
  );

  // Show pop-up only once per session, after login — only for NEW users
  useEffect(() => {
    if (!userId || !profile || !loaded) return;
    if (!isNewUser) return; // legacy users never see the guide
    if (skipped) return;

    const shownThisSession = sessionStorage.getItem(SESSION_SHOWN_KEY) === 'true';
    const allDone = steps.length > 0 && steps.every((s) => progress[s.id]);

    if (!shownThisSession && !allDone) {
      const timer = setTimeout(() => {
        setOpen(true);
        sessionStorage.setItem(SESSION_SHOWN_KEY, 'true');
      }, 1200);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, profile?.id, loaded, isNewUser, skipped]);

  // Allow opening the guide from anywhere via a custom event
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('setup-guide:open', handler);
    return () => window.removeEventListener('setup-guide:open', handler);
  }, []);

  const markComplete = useCallback(
    (id: SetupStepId) => {
      if (!userId) return;
      setProgress((prev) => {
        const next = { ...prev, [id]: true };
        persist({ completed_steps: next });
        return next;
      });
      try {
        const active = localStorage.getItem(ACTIVE_STEP_LS_PREFIX + userId);
        if (active === id) localStorage.removeItem(ACTIVE_STEP_LS_PREFIX + userId);
      } catch {
        // ignore
      }
    },
    [userId, persist]
  );

  const markIncomplete = useCallback(
    (id: SetupStepId) => {
      if (!userId) return;
      setProgress((prev) => {
        const next = { ...prev };
        delete next[id];
        persist({ completed_steps: next });
        return next;
      });
    },
    [userId, persist]
  );

  const skipAll = useCallback(() => {
    if (!userId) return;
    const next: Record<string, boolean> = {};
    steps.forEach((s) => (next[s.id] = true));
    setProgress(next);
    setSkipped(true);
    persist({ completed_steps: next, skipped: true });
    setOpen(false);
  }, [userId, steps, persist]);

  const restart = useCallback(() => {
    if (!userId) return;
    setProgress({});
    setSkipped(false);
    persist({ completed_steps: {}, skipped: false });
    try {
      localStorage.removeItem(ACTIVE_STEP_LS_PREFIX + userId);
    } catch {
      // ignore
    }
    sessionStorage.removeItem(SESSION_SHOWN_KEY);
  }, [userId, persist]);

  const setActiveStepId = useCallback((id: string | null) => {
    if (!userId) return;
    try {
      if (id) {
        localStorage.setItem(ACTIVE_STEP_LS_PREFIX + userId, id);
      } else {
        localStorage.removeItem(ACTIVE_STEP_LS_PREFIX + userId);
      }
    } catch {}

    // Save to metadata
    supabase.auth.updateUser({
      data: { setup_active_step: id }
    }).catch(() => {});
  }, [userId]);


  const activeStepId = (() => {
    if (!userId) return null;
    try {
      const fromMeta = user?.user_metadata?.setup_active_step;
      const fromLS = localStorage.getItem(ACTIVE_STEP_LS_PREFIX + userId);
      return fromMeta || fromLS || null;
    } catch {
      return user?.user_metadata?.setup_active_step || null;
    }
  })();

  const completedCount = steps.filter((s) => progress[s.id]).length;
  const totalCount = steps.length;
  const percent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return {
    steps,
    progress,
    open,
    setOpen,
    markComplete,
    markIncomplete,
    skipAll,
    restart,
    completedCount,
    totalCount,
    percent,
    activeStepId,
    setActiveStepId,
    isNewUser,
  };
}
