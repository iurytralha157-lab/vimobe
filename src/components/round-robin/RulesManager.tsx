import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Loader2,
  GripVertical,
  Filter,
  Clock,
  MapPin,
  Tags,
  Megaphone,
  Globe,
  GitBranch
} from 'lucide-react';
import { 
  useRoundRobinRules, 
  useCreateRoundRobinRule, 
  useUpdateRoundRobinRule, 
  useDeleteRoundRobinRule,
  RoundRobinRule,
  RuleMatch 
} from '@/hooks/use-round-robin-rules';
import { RuleEditor } from './RuleEditor';
import { usePipelines } from '@/hooks/use-stages';

interface RulesManagerProps {
  roundRobinId: string;
  roundRobinName: string;
}

export function RulesManager({ roundRobinId, roundRobinName }: RulesManagerProps) {
  const { data: rules = [], isLoading } = useRoundRobinRules(roundRobinId);
  const { data: pipelines = [] } = usePipelines();
  const createRule = useCreateRoundRobinRule();
  const updateRule = useUpdateRoundRobinRule();
  const deleteRule = useDeleteRoundRobinRule();
  
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RoundRobinRule | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);
  
  const handleCreateRule = async (data: { name: string; match: RuleMatch; priority: number; is_active: boolean }) => {
    await createRule.mutateAsync({
      round_robin_id: roundRobinId,
      ...data,
    });
    setEditorOpen(false);
  };
  
  const handleUpdateRule = async (data: { name: string; match: RuleMatch; priority: number; is_active: boolean }) => {
    if (!editingRule) return;
    
    await updateRule.mutateAsync({
      id: editingRule.id,
      round_robin_id: roundRobinId,
      ...data,
    });
    setEditingRule(null);
    setEditorOpen(false);
  };
  
  const handleToggleActive = async (rule: RoundRobinRule) => {
    await updateRule.mutateAsync({
      id: rule.id,
      round_robin_id: roundRobinId,
      is_active: !rule.is_active,
    });
  };
  
  const handleDeleteRule = async () => {
    if (!ruleToDelete) return;
    
    await deleteRule.mutateAsync({ id: ruleToDelete, roundRobinId });
    setRuleToDelete(null);
    setDeleteDialogOpen(false);
  };
  
  const openEdit = (rule: RoundRobinRule) => {
    setEditingRule(rule);
    setEditorOpen(true);
  };
  
  const openCreate = () => {
    setEditingRule(null);
    setEditorOpen(true);
  };
  
  const renderMatchConditions = (match: RuleMatch) => {
    const conditions: React.ReactNode[] = [];
    
    if (match.pipeline_id) {
      const pipeline = pipelines.find(p => p.id === match.pipeline_id);
      conditions.push(
        <Badge key="pipeline" variant="outline" className="gap-1">
          <GitBranch className="h-3 w-3" />
          {pipeline?.name || 'Pipeline'}
        </Badge>
      );
    }
    
    if (match.source && match.source.length > 0) {
      conditions.push(
        <Badge key="source" variant="outline" className="gap-1">
          <Globe className="h-3 w-3" />
          {match.source.join(', ')}
        </Badge>
      );
    }
    
    if (match.campaign_name_contains) {
      conditions.push(
        <Badge key="campaign" variant="outline" className="gap-1">
          <Megaphone className="h-3 w-3" />
          *{match.campaign_name_contains}*
        </Badge>
      );
    }
    
    if (match.tag_in && match.tag_in.length > 0) {
      conditions.push(
        <Badge key="tags" variant="outline" className="gap-1">
          <Tags className="h-3 w-3" />
          {match.tag_in.slice(0, 2).join(', ')}
          {match.tag_in.length > 2 && ` +${match.tag_in.length - 2}`}
        </Badge>
      );
    }
    
    if (match.city_in && match.city_in.length > 0) {
      conditions.push(
        <Badge key="cities" variant="outline" className="gap-1">
          <MapPin className="h-3 w-3" />
          {match.city_in.slice(0, 2).join(', ')}
          {match.city_in.length > 2 && ` +${match.city_in.length - 2}`}
        </Badge>
      );
    }
    
    if (match.schedule) {
      const days = match.schedule.days?.length === 7 ? 'Todos os dias' : 
                   match.schedule.days?.length === 5 ? 'Seg-Sex' : 
                   `${match.schedule.days?.length || 0} dias`;
      conditions.push(
        <Badge key="schedule" variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          {days} {match.schedule.start}-{match.schedule.end}
        </Badge>
      );
    }
    
    if (conditions.length === 0) {
      return <span className="text-sm text-muted-foreground">Qualquer lead</span>;
    }
    
    return <div className="flex flex-wrap gap-1">{conditions}</div>;
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Regras de Entrada</h3>
          <p className="text-sm text-muted-foreground">
            Defina quando leads devem entrar nesta fila
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nova Regra
        </Button>
      </div>
      
      {rules.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Filter className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">Nenhuma regra configurada</p>
            <p className="text-sm text-muted-foreground mb-4">
              Esta fila receberá leads apenas como fallback (genérico)
            </p>
            <Button variant="outline" onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Criar Regra
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.map((rule, index) => (
            <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
                  
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {rule.name ? (
                        <span className="font-medium text-sm">{rule.name}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Sem nome</span>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        Prioridade: {rule.priority}
                      </Badge>
                    </div>
                    {renderMatchConditions(rule.match)}
                  </div>
                  
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={() => handleToggleActive(rule)}
                  />
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(rule)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => {
                          setRuleToDelete(rule.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <RuleEditor
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setEditingRule(null);
        }}
        onSave={editingRule ? handleUpdateRule : handleCreateRule}
        initialData={editingRule ? {
          name: editingRule.name || undefined,
          match: editingRule.match,
          priority: editingRule.priority,
          is_active: editingRule.is_active,
        } : undefined}
        isLoading={createRule.isPending || updateRule.isPending}
      />
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir regra?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A regra será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRule} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
