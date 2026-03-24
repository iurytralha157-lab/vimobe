import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAutomations, TRIGGER_TYPE_LABELS, TriggerType } from "@/hooks/use-automations";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Zap, Loader2, Play, MessageSquare, Clock, GitBranch, Tag, UserPlus } from "lucide-react";

interface StartAutomationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  conversationId?: string;
  contactName?: string;
}

const getTriggerIcon = (type: TriggerType) => {
  switch (type) {
    case 'message_received': return MessageSquare;
    case 'scheduled': return Clock;
    case 'lead_stage_changed': return GitBranch;
    case 'tag_added': return Tag;
    case 'lead_created': return UserPlus;
    case 'manual': return Play;
    default: return Zap;
  }
};

export function StartAutomationDialog({ open, onOpenChange, leadId, conversationId, contactName }: StartAutomationDialogProps) {
  const { data: automations, isLoading } = useAutomations();
  const { profile } = useAuth();
  const [starting, setStarting] = useState<string | null>(null);

  const activeAutomations = automations?.filter(a => a.is_active) || [];

  const handleStart = async (automationId: string, automationName: string) => {
    if (!profile?.organization_id) return;
    setStarting(automationId);

    try {
      const { error } = await supabase.from('automation_executions').insert({
        automation_id: automationId,
        lead_id: leadId,
        conversation_id: conversationId || null,
        organization_id: profile.organization_id,
        status: 'running',
        started_at: new Date().toISOString(),
        execution_data: {},
      });

      if (error) throw error;

      toast.success(`Automação "${automationName}" iniciada!`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao iniciar automação: " + (err.message || "Erro desconhecido"));
    } finally {
      setStarting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Iniciar Automação
          </DialogTitle>
          <DialogDescription>
            {contactName
              ? `Selecione uma automação para iniciar para ${contactName}`
              : "Selecione uma automação para iniciar para este contato"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activeAutomations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma automação ativa encontrada</p>
              <p className="text-xs mt-1">Crie automações na página de Automações</p>
            </div>
          ) : (
            activeAutomations.map((automation) => {
              const Icon = getTriggerIcon(automation.trigger_type as TriggerType);
              const isStarting = starting === automation.id;

              return (
                <button
                  key={automation.id}
                  onClick={() => handleStart(automation.id, automation.name)}
                  disabled={!!starting}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-accent/50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{automation.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {TRIGGER_TYPE_LABELS[automation.trigger_type as TriggerType] || automation.trigger_type}
                    </p>
                  </div>
                  {isStarting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  ) : (
                    <Play className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
