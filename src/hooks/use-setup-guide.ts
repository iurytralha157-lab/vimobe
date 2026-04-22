import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { useOrganizationModules } from '@/hooks/use-organization-modules';

export type SetupStepId =
  | 'whatsapp'
  | 'first_lead'
  | 'add_broker'
  | 'create_queue'
  | 'add_property'
  | 'create_site'
  | 'create_automation'
  | 'view_plan'
  | 'mobile_app';

export interface SetupStep {
  id: SetupStepId;
  title: string;
  description: string;
  icon: string;
  route: string;
  ctaLabel: string;
  tourTarget?: string;
}

const STORAGE_KEY_PREFIX = 'setup_guide_progress_';
const SESSION_SHOWN_KEY = 'setup_guide_shown_this_session';
const SKIPPED_KEY_PREFIX = 'setup_guide_skipped_';
const ACTIVE_STEP_KEY_PREFIX = 'setup_guide_active_step_';

function readProgress(userId: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + userId);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeProgress(userId: string, progress: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(progress));
  } catch {
    // ignore quota errors
  }
}

function readActiveStep(userId: string): string | null {
  try {
    return localStorage.getItem(ACTIVE_STEP_KEY_PREFIX + userId);
  } catch {
    return null;
  }
}

function clearActiveStep(userId: string) {
  try {
    localStorage.removeItem(ACTIVE_STEP_KEY_PREFIX + userId);
  } catch {
    // ignore
  }
}

export function useSetupGuide() {
  const { user, profile } = useAuth();
  const { hasPermission } = useUserPermissions();
  const { hasModule } = useOrganizationModules();

  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);
  const userId = user?.id;

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

  const steps: SetupStep[] = allSteps.filter((step) => {
    switch (step.id) {
      case 'add_property':
        return hasModule('properties');
      case 'create_site':
        return profile?.role === 'admin' && hasModule('site');
      case 'create_automation':
        return hasPermission('automations_view');
      case 'create_queue':
      case 'add_broker':
        return profile?.role === 'admin';
      default:
        return true;
    }
  });

  // Load progress from storage
  useEffect(() => {
    if (!userId) return;
    setProgress(readProgress(userId));
  }, [userId]);

  // Show pop-up only once per session, after login
  useEffect(() => {
    if (!userId || !profile) return;
    const skipped = localStorage.getItem(SKIPPED_KEY_PREFIX + userId) === 'true';

    const shownThisSession = sessionStorage.getItem(SESSION_SHOWN_KEY) === 'true';

    const currentProgress = readProgress(userId);
    const allDone = steps.length > 0 && steps.every((s) => currentProgress[s.id]);

    if (!skipped && !shownThisSession && !allDone) {
      const timer = setTimeout(() => {
        setOpen(true);
        sessionStorage.setItem(SESSION_SHOWN_KEY, 'true');
      }, 1200);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, profile?.id]);

  // Allow opening the guide from anywhere via a custom event
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('setup-guide:open', handler);
    return () => window.removeEventListener('setup-guide:open', handler);
  }, []);

  const markComplete = useCallback(
    (id: SetupStepId) => {
      if (!userId) return;
      const next = { ...readProgress(userId), [id]: true };
      writeProgress(userId, next);
      setProgress(next);
      // Clear the "active step" pointer once it's completed
      const active = readActiveStep(userId);
      if (active === id) clearActiveStep(userId);
    },
    [userId]
  );

  const markIncomplete = useCallback(
    (id: SetupStepId) => {
      if (!userId) return;
      const current = readProgress(userId);
      delete current[id];
      writeProgress(userId, current);
      setProgress(current);
    },
    [userId]
  );

  const skipAll = useCallback(() => {
    if (!userId) return;
    const next: Record<string, boolean> = {};
    steps.forEach((s) => (next[s.id] = true));
    writeProgress(userId, next);
    setProgress(next);
    localStorage.setItem(SKIPPED_KEY_PREFIX + userId, 'true');
    setOpen(false);
  }, [userId, steps]);

  const restart = useCallback(() => {
    if (!userId) return;
    writeProgress(userId, {});
    setProgress({});
    localStorage.removeItem(SKIPPED_KEY_PREFIX + userId);
    clearActiveStep(userId);
    sessionStorage.removeItem(SESSION_SHOWN_KEY);
  }, [userId]);

  // Expose the persisted active step so consumers can resume the tour
  const activeStepId = userId ? readActiveStep(userId) : null;

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
  };
}
