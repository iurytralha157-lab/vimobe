import { 
  Building2, 
  Users, 
  Target, 
  Zap, 
  Activity, 
  Calendar,
  AlertCircle,
  Clock,
  ExternalLink,
  MoreVertical,
  ShieldCheck,
  Ban,
  Trash2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AdminOrganization } from '@/hooks/use-admin-organizations';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface OrganizationCardProps {
  org: AdminOrganization;
  onImpersonate: (id: string, name: string) => void;
  onViewDetails: (id: string) => void;
  onToggleStatus: (id: string, current: boolean) => void;
  onDelete: (id: string, name: string) => void;
}

export function OrganizationCard({ 
  org, 
  onImpersonate, 
  onViewDetails, 
  onToggleStatus, 
  onDelete 
}: OrganizationCardProps) {
  
  const getStatusConfig = (status: string, isActive: boolean) => {
    if (!isActive) return { label: 'Inativo', color: 'bg-red-100 text-red-700 border-red-200' };
    
    switch (status) {
      case 'active': return { label: 'Ativo', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'trial': return { label: 'Trial', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'suspended': return { label: 'Suspenso', color: 'bg-amber-100 text-amber-700 border-amber-200' };
      default: return { label: status, color: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  const status = getStatusConfig(org.subscription_status, org.is_active);

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 border-border/50 overflow-hidden bg-card/50 backdrop-blur-sm">
      <CardContent className="p-0">
        {/* Top Header */}
        <div className="p-6 pb-4">
          <div className="flex justify-between items-start">
            <div className="flex gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
                {org.logo_url ? (
                  <img src={org.logo_url} alt={org.name} className="h-full w-full object-contain p-2" />
                ) : (
                  <Building2 className="h-7 w-7 text-primary" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-foreground truncate max-w-[180px]">
                    {org.name}
                  </h3>
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 h-5 font-bold uppercase tracking-wider", status.color)}>
                    {status.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    {org.segment || 'Geral'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {org.last_access_at 
                      ? `Ativo ${formatDistanceToNow(new Date(org.last_access_at), { addSuffix: true, locale: ptBR })}`
                      : 'Sem acesso'
                    }
                  </span>
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => onViewDetails(org.id)} className="cursor-pointer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Ver Painel Completo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onImpersonate(org.id, org.name)} className="cursor-pointer">
                  <ShieldCheck className="mr-2 h-4 w-4 text-emerald-500" /> Personificar (Login)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onToggleStatus(org.id, org.is_active)} className="cursor-pointer">
                  {org.is_active ? (
                    <><Ban className="mr-2 h-4 w-4 text-amber-500" /> Desativar Acesso</>
                  ) : (
                    <><Zap className="mr-2 h-4 w-4 text-emerald-500" /> Reativar Acesso</>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(org.id, org.name)} className="text-red-500 cursor-pointer">
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir Organização
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-3 gap-2 mt-6">
            <div className="bg-muted/30 p-2 rounded-xl text-center">
              <div className="flex justify-center mb-1">
                <Users className="h-3 w-3 text-blue-500" />
              </div>
              <p className="text-sm font-bold">{org.user_count}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Usuários</p>
            </div>
            <div className="bg-muted/30 p-2 rounded-xl text-center">
              <div className="flex justify-center mb-1">
                <Target className="h-3 w-3 text-emerald-500" />
              </div>
              <p className="text-sm font-bold">{org.lead_count}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Leads</p>
            </div>
            <div className="bg-muted/30 p-2 rounded-xl text-center">
              <div className="flex justify-center mb-1">
                <Zap className="h-3 w-3 text-amber-500" />
              </div>
              <p className="text-sm font-bold">{org.automation_count}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Tasks</p>
            </div>
          </div>
        </div>

        {/* Footer info & Health */}
        <div className="px-6 py-4 bg-muted/20 border-t border-border/50">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Activity className="h-3 w-3" /> Saúde da Operação
              </span>
              <span className={cn("font-bold", org.health_score >= 80 ? "text-emerald-500" : "text-amber-500")}>
                {org.health_score}%
              </span>
            </div>
            <Progress value={org.health_score} className="h-1.5" indicatorClassName={getHealthColor(org.health_score)} />
            
            <div className="flex justify-between items-center pt-1">
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase tracking-tight">Receita Mensal</span>
                <span className="text-sm font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(org.mrr)}
                </span>
              </div>
              
              {org.overdue_amount > 0 ? (
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-red-500 uppercase font-bold tracking-tight flex items-center gap-1">
                    <AlertCircle className="h-2 w-2" /> Inadimplente
                  </span>
                  <span className="text-sm font-bold text-red-600">
                    -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(org.overdue_amount)}
                  </span>
                </div>
              ) : org.subscription_type === 'trial' ? (
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-blue-500 uppercase font-bold tracking-tight">Expira em</span>
                  <span className="text-sm font-bold text-blue-600">{org.days_trial_left} dias</span>
                </div>
              ) : (
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-tight">Criado em</span>
                  <span className="text-xs font-medium">{new Date(org.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
