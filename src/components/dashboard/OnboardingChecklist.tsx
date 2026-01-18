import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Circle, 
  Building2, 
  Users, 
  UserPlus,
  Upload,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTeams } from '@/hooks/use-teams';
import { useLeadsCount } from '@/hooks/use-leads';
import { useOrganizationUsers } from '@/hooks/use-users';
import { cn } from '@/lib/utils';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  isComplete: boolean;
  action?: () => void;
  actionLabel?: string;
}

export function OnboardingChecklist() {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const { data: teams = [] } = useTeams();
  const { data: leadsCount = 0 } = useLeadsCount();
  const { data: users = [] } = useOrganizationUsers();
  
  const [dismissed, setDismissed] = useState(false);

  // Check localStorage for dismissed state
  useEffect(() => {
    const isDismissed = localStorage.getItem('onboarding-checklist-dismissed');
    if (isDismissed === 'true') {
      setDismissed(true);
    }
  }, []);

  const checklistItems: ChecklistItem[] = [
    {
      id: 'organization',
      title: 'Criar organização',
      description: 'Configure sua empresa no sistema',
      icon: Building2,
      isComplete: !!organization,
    },
    {
      id: 'team',
      title: 'Criar uma equipe',
      description: 'Organize seus colaboradores em equipes',
      icon: Users,
      isComplete: teams.length > 0,
      action: () => navigate('/crm/teams'),
      actionLabel: 'Criar equipe',
    },
    {
      id: 'invite',
      title: 'Convidar membros',
      description: 'Adicione colaboradores ao sistema',
      icon: UserPlus,
      isComplete: users.length > 1,
      action: () => navigate('/settings'),
      actionLabel: 'Convidar',
    },
    {
      id: 'contacts',
      title: 'Importar contatos',
      description: 'Importe sua base de leads existente',
      icon: Upload,
      isComplete: leadsCount > 0,
      action: () => navigate('/crm/contacts'),
      actionLabel: 'Importar',
    },
  ];

  const completedCount = checklistItems.filter(item => item.isComplete).length;
  const progress = (completedCount / checklistItems.length) * 100;
  const isComplete = progress === 100;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('onboarding-checklist-dismissed', 'true');
  };

  if (dismissed || isComplete) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              🚀 Primeiros Passos
            </CardTitle>
            <CardDescription>
              Complete as tarefas abaixo para configurar seu CRM
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={handleDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="pt-2">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">
              {completedCount} de {checklistItems.length} concluídos
            </span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {checklistItems.map((item) => {
            const Icon = item.icon;
            return (
              <div 
                key={item.id}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg transition-colors",
                  item.isComplete 
                    ? "bg-orange-500/10" 
                    : "bg-muted/50 hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={cn(
                    "flex-shrink-0",
                    item.isComplete ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"
                  )}>
                    {item.isComplete ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium text-sm",
                      item.isComplete && "line-through text-muted-foreground"
                    )}>
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </p>
                  </div>
                </div>
                {!item.isComplete && item.action && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full sm:w-auto flex-shrink-0"
                    onClick={item.action}
                  >
                    {item.actionLabel}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
