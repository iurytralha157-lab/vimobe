import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useSetupGuide, type SetupStep } from '@/hooks/use-setup-guide';
import { startSetupTour } from '@/components/setup-guide/setup-tour';
import {
  X,
  Check,
  Circle,
  CheckCircle2,
  MessageCircle,
  UserPlus,
  Users,
  Workflow,
  Building2,
  Globe,
  Zap,
  CreditCard,
  Smartphone,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, any> = {
  MessageCircle,
  UserPlus,
  Users,
  Workflow,
  Building2,
  Globe,
  Zap,
  CreditCard,
  Smartphone,
};

export function SetupGuideDialog() {
  const { profile } = useAuth();
  const {
    steps,
    progress,
    open,
    setOpen,
    markComplete,
    skipAll,
    restart,
    completedCount,
    totalCount,
    percent,
  } = useSetupGuide();
  const navigate = useNavigate();
  const [confirmingSkip, setConfirmingSkip] = useState(false);

  const firstName = profile?.name?.split(' ')[0]?.toUpperCase() || 'USUÁRIO';

  const handleStart = (step: SetupStep) => {
    if (!step.route) {
      console.warn(`[SetupGuide] Step "${step.id}" não possui rota definida.`);
      return;
    }
    // Persist the active step so a page reload resumes from here
    try {
      if (profile?.id) {
        localStorage.setItem(
          `setup_guide_active_step_${profile.id}`,
          step.id
        );
      }
    } catch {
      // ignore storage errors
    }
    // Mark as complete optimistically when the user engages with the step.
    // This ensures progress is saved even if no tour callback runs.
    if (!progress[step.id]) {
      markComplete(step.id);
    }
    setOpen(false);
    navigate(step.route);
    if (step.tourTarget) {
      // Wait for navigation/render before launching tour
      setTimeout(() => {
        startSetupTour({
          target: step.tourTarget!,
          stepId: step.id,
          onComplete: () => {
            markComplete(step.id);
            try {
              if (profile?.id) {
                localStorage.removeItem(
                  `setup_guide_active_step_${profile.id}`
                );
              }
            } catch {
              // ignore
            }
          },
        });
      }, 600);
    }
  };

  const handleToggle = (step: SetupStep) => {
    if (progress[step.id]) return;
    markComplete(step.id);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="p-0 overflow-hidden max-w-[860px] w-[95vw] gap-0 border-border/50 [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] min-h-[520px]">
          {/* Left panel */}
          <div className="relative bg-gradient-to-b from-primary to-primary/80 text-primary-foreground p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold leading-tight">
                Olá, {firstName}!
              </h2>
              <p className="text-sm mt-3 text-primary-foreground/90 leading-relaxed">
                Complete os passos ao lado para começar a receber e gerenciar
                seus leads.
              </p>
            </div>

            {/* Circular progress */}
            <div className="flex flex-col items-center justify-center my-6">
              <div className="relative w-28 h-28">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    className="text-primary-foreground/20"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${(percent / 100) * 264} 264`}
                    strokeLinecap="round"
                    className="text-primary-foreground transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{percent}%</span>
                </div>
              </div>
              <p className="text-xs mt-3 text-primary-foreground/90">
                {completedCount} de {totalCount} concluídos
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <button
                onClick={() => setOpen(false)}
                className="block underline opacity-90 hover:opacity-100"
              >
                Ver mais tarde
              </button>
              <button
                onClick={() => setConfirmingSkip(true)}
                className="block underline opacity-90 hover:opacity-100"
              >
                Pular e concluir tudo
              </button>
            </div>
          </div>

          {/* Right panel */}
          <div className="flex flex-col">
            <div className="flex items-start justify-between p-6 pb-4">
              <div>
                <h3 className="text-lg font-semibold">Guia de configuração</h3>
                <p className="text-sm text-muted-foreground">
                  Siga os passos para ativar sua conta
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-auto px-6 space-y-2.5">
              {steps.map((step) => {
                const Icon = ICON_MAP[step.icon] || Circle;
                const done = !!progress[step.id];
                return (
                  <div
                    key={step.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                      done
                        ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40'
                        : 'bg-card border-border hover:border-border/80'
                    )}
                  >
                    <div
                      className={cn(
                        'h-9 w-9 rounded-md flex items-center justify-center shrink-0',
                        done
                          ? 'bg-emerald-500 text-white'
                          : 'bg-primary/10 text-primary'
                      )}
                    >
                      {done ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm font-medium leading-tight',
                          done && 'line-through text-muted-foreground'
                        )}
                      >
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {step.description}
                      </p>
                    </div>
                    {!done ? (
                      <Button
                        size="sm"
                        onClick={() => handleStart(step)}
                        className="shrink-0"
                      >
                        {step.ctaLabel}
                      </Button>
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    )}
                    {!done && (
                      <button
                        onClick={() => handleToggle(step)}
                        className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 hover:border-primary shrink-0 transition-colors"
                        title="Marcar como concluído"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="border-t mt-4 px-6 py-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Progresso geral</span>
                  <span className="font-medium">{percent}%</span>
                </div>
                <Progress value={percent} className="h-1.5" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={restart}
                className="text-xs text-muted-foreground"
              >
                <RotateCcw className="h-3 w-3 mr-1.5" />
                Reiniciar guia
              </Button>
            </div>
          </div>
        </div>

        {/* Skip confirmation overlay */}
        {confirmingSkip && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center p-6 z-50">
            <div className="max-w-sm text-center space-y-4">
              <h3 className="text-lg font-semibold">Pular configuração?</h3>
              <p className="text-sm text-muted-foreground">
                Todos os passos serão marcados como concluídos e este guia não
                aparecerá mais. Você poderá reabri-lo manualmente quando quiser.
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setConfirmingSkip(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    skipAll();
                    setConfirmingSkip(false);
                  }}
                >
                  Sim, pular tudo
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
