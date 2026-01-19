import { useState } from 'react';
import { Users, Plus, Crown, GitBranch, Link as LinkIcon, Unlink, Loader2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TeamDialog } from '@/components/teams/TeamDialog';
import { TeamLeadersStats } from '@/components/teams/TeamLeadersStats';
import { useTeams, useDeleteTeam, Team } from '@/hooks/use-teams';
import { useTeamPipelines, useAllTeamPipelines, useAssignPipelineToTeam, useRemovePipelineFromTeam } from '@/hooks/use-team-pipelines';
import { usePipelines } from '@/hooks/use-stages';
import { cn } from '@/lib/utils';

export function TeamsTab() {
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [pipelineDialogOpen, setPipelineDialogOpen] = useState(false);
  const [pipelineTeam, setPipelineTeam] = useState<Team | null>(null);

  const { data: teams = [], isLoading } = useTeams();
  const { data: teamPipelines = [] } = useTeamPipelines();
  const { data: pipelines = [], isLoading: pipelinesLoading } = usePipelines();
  const { data: allTeamPipelines = [] } = useAllTeamPipelines();
  const deleteTeam = useDeleteTeam();
  const assignPipeline = useAssignPipelineToTeam();
  const removePipeline = useRemovePipelineFromTeam();

  const getPipelinesCount = (teamId: string) => {
    return teamPipelines.filter(tp => tp.team_id === teamId).length;
  };

  const getTeamPipelines = (teamId: string) => {
    return allTeamPipelines
      .filter((tp: any) => tp.team_id === teamId)
      .map((tp: any) => tp.pipeline);
  };

  const getPipelineTeams = (pipelineId: string) => {
    return allTeamPipelines
      .filter((tp: any) => tp.pipeline_id === pipelineId)
      .map((tp: any) => tp.team);
  };

  const isPipelineAssigned = (teamId: string, pipelineId: string) => {
    return allTeamPipelines.some(
      (tp: any) => tp.team_id === teamId && tp.pipeline_id === pipelineId
    );
  };

  const handleTogglePipeline = async (teamId: string, pipelineId: string, isAssigned: boolean) => {
    if (isAssigned) {
      await removePipeline.mutateAsync({ teamId, pipelineId });
    } else {
      await assignPipeline.mutateAsync({ teamId, pipelineId });
    }
  };

  const handleEdit = (team: Team) => {
    setSelectedTeam(team);
    setTeamDialogOpen(true);
  };

  const handleDelete = (team: Team) => {
    setTeamToDelete(team);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (teamToDelete) {
      await deleteTeam.mutateAsync(teamToDelete.id);
      setDeleteDialogOpen(false);
      setTeamToDelete(null);
    }
  };

  const handleNewTeam = () => {
    setSelectedTeam(null);
    setTeamDialogOpen(true);
  };

  const handleManagePipelines = (team: Team) => {
    setPipelineTeam(team);
    setPipelineDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  // Count stats
  const totalMembers = teams.reduce((acc, t) => acc + (t.members?.length || 0), 0);
  const totalLeaders = teams.reduce((acc, t) => acc + (t.members?.filter(m => m.is_leader)?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{teams.length}</p>
              <p className="text-xs text-muted-foreground">Equipes</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalMembers}</p>
              <p className="text-xs text-muted-foreground">Membros totais</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Crown className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalLeaders}</p>
              <p className="text-xs text-muted-foreground">Líderes</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <GitBranch className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{allTeamPipelines.length}</p>
              <p className="text-xs text-muted-foreground">Vínculos ativos</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Leader Stats */}
      <TeamLeadersStats />

      {/* Teams Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Equipes
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Organize seus corretores em equipes
            </p>
          </div>
          <Button onClick={handleNewTeam} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nova Equipe
          </Button>
        </div>

        {teams.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-medium mb-2">Nenhuma equipe criada</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                Crie equipes para organizar seus corretores
              </p>
              <Button onClick={handleNewTeam}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira equipe
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => {
              const teamPipelinesData = getTeamPipelines(team.id);
              const leaders = (team.members || []).filter(m => m.is_leader);
              
              return (
                <Card key={team.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{team.name}</CardTitle>
                          {leaders.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Crown className="h-3 w-3 text-amber-500" />
                              <span className="text-xs text-muted-foreground">
                                {leaders.map(l => l.user?.name?.split(' ')[0]).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(team)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleManagePipelines(team)}>
                            <LinkIcon className="h-4 w-4 mr-2" />
                            Gerenciar Pipelines
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(team)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Members */}
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {(team.members || []).slice(0, 5).map((member) => (
                          <Avatar key={member.id} className="h-7 w-7 border-2 border-background">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {member.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {(team.members?.length || 0) > 5 && (
                          <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">+{(team.members?.length || 0) - 5}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {team.members?.length || 0} membros
                      </span>
                    </div>

                    {/* Pipelines */}
                    <div className="pt-3 border-t border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">Pipelines vinculadas</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-xs px-2"
                          onClick={() => handleManagePipelines(team)}
                        >
                          <LinkIcon className="h-3 w-3 mr-1" />
                          Gerenciar
                        </Button>
                      </div>
                      {teamPipelinesData.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {teamPipelinesData.slice(0, 3).map((p: any) => (
                            <Badge key={p?.id} variant="outline" className="text-xs">
                              <GitBranch className="h-3 w-3 mr-1" />
                              {p?.name}
                            </Badge>
                          ))}
                          {teamPipelinesData.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{teamPipelinesData.length - 3}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Unlink className="h-3 w-3" />
                          Acesso a todas as pipelines
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Divider */}
      <Separator className="my-6" />

      {/* Pipeline Access Overview */}
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <GitBranch className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">Visão Geral de Acesso</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Pipelines sem vínculo ficam acessíveis a todos. Pipelines vinculadas são restritas às equipes associadas.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {pipelines.map((pipeline) => {
            const pipelineTeams = getPipelineTeams(pipeline.id);
            const hasTeams = pipelineTeams.length > 0;

            return (
              <Card 
                key={pipeline.id} 
                className={cn(
                  "p-4",
                  !hasTeams && "border-dashed"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">{pipeline.name}</span>
                    {pipeline.is_default && (
                      <Badge variant="secondary" className="text-xs shrink-0">Padrão</Badge>
                    )}
                  </div>
                  {hasTeams && (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">
                      Restrita
                    </Badge>
                  )}
                </div>
                
                <div className="mt-3">
                  {hasTeams ? (
                    <div className="flex flex-wrap gap-1.5">
                      {pipelineTeams.map((team: any) => (
                        <Badge key={team?.id} variant="outline" className="text-xs gap-1">
                          <Users className="h-3 w-3" />
                          {team?.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Unlink className="h-3 w-3" />
                      Acessível a todos
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Team Dialog */}
      <TeamDialog
        open={teamDialogOpen}
        onOpenChange={setTeamDialogOpen}
        team={selectedTeam}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir equipe?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a equipe "{teamToDelete?.name}"?
              Esta ação não pode ser desfeita. Os membros serão removidos da equipe,
              mas suas contas permanecerão ativas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pipeline Assignment Dialog */}
      <Dialog open={pipelineDialogOpen} onOpenChange={setPipelineDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {pipelineTeam?.name}
            </DialogTitle>
            <DialogDescription>
              Selecione as pipelines que esta equipe terá acesso exclusivo
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px] -mx-6 px-6">
            <div className="space-y-2">
              {pipelines.map((pipeline) => {
                const isAssigned = pipelineTeam ? isPipelineAssigned(pipelineTeam.id, pipeline.id) : false;
                const isProcessing = assignPipeline.isPending || removePipeline.isPending;

                return (
                  <label
                    key={pipeline.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent",
                      isAssigned && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isAssigned}
                        disabled={isProcessing}
                        onCheckedChange={() => {
                          if (pipelineTeam) {
                            handleTogglePipeline(pipelineTeam.id, pipeline.id, isAssigned);
                          }
                        }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{pipeline.name}</span>
                        </div>
                        {pipeline.is_default && (
                          <span className="text-xs text-muted-foreground">Pipeline padrão</span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPipelineDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
