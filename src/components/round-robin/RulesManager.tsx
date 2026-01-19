import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
} from 'lucide-react';
import { 
  useRoundRobinRules, 
  useCreateRoundRobinRule, 
  useUpdateRoundRobinRule, 
  useDeleteRoundRobinRule,
  RoundRobinRule,
} from '@/hooks/use-round-robin-rules';

interface RulesManagerProps {
  roundRobinId: string;
  roundRobinName: string;
}

export function RulesManager({ roundRobinId, roundRobinName }: RulesManagerProps) {
  const { data: rules = [], isLoading } = useRoundRobinRules(roundRobinId);
  const createRule = useCreateRoundRobinRule();
  const updateRule = useUpdateRoundRobinRule();
  const deleteRule = useDeleteRoundRobinRule();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);
  
  const handleCreateRule = async () => {
    await createRule.mutateAsync({
      round_robin_id: roundRobinId,
      match_type: 'source',
      match_value: 'meta',
    });
  };
  
  const handleDeleteRule = async () => {
    if (!ruleToDelete) return;
    
    await deleteRule.mutateAsync({ id: ruleToDelete, roundRobinId });
    setRuleToDelete(null);
    setDeleteDialogOpen(false);
  };
  
  const renderMatchDescription = (rule: RoundRobinRule) => {
    return (
      <Badge variant="outline" className="gap-1">
        {rule.match_type}: {rule.match_value}
      </Badge>
    );
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
        <Button onClick={handleCreateRule} size="sm" disabled={createRule.isPending}>
          {createRule.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
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
            <Button variant="outline" onClick={handleCreateRule} size="sm" disabled={createRule.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Regra
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.map((rule, index) => (
            <Card key={rule.id}>
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
                  
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">Regra {index + 1}</span>
                    </div>
                    {renderMatchDescription(rule)}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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