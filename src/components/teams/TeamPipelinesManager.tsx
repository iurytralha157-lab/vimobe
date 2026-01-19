import { useState } from "react";
import { AlertCircle, Check, FolderKanban, Loader2, Plus, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTeams, Team } from "@/hooks/use-teams";
import { usePipelines } from "@/hooks/use-pipelines";
import {
  useAllTeamPipelines,
  useAssignPipelineToTeam,
  useRemovePipelineFromTeam,
} from "@/hooks/use-team-pipelines";

export function TeamPipelinesManager() {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPipelines, setSelectedPipelines] = useState<string[]>([]);

  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: pipelines, isLoading: pipelinesLoading } = usePipelines();
  const { data: teamPipelines, isLoading: teamPipelinesLoading } = useAllTeamPipelines();
  
  const assignPipeline = useAssignPipelineToTeam();
  const removePipeline = useRemovePipelineFromTeam();

  const isLoading = teamsLoading || pipelinesLoading || teamPipelinesLoading;

  const getTeamPipelines = (teamId: string) => {
    return teamPipelines?.filter((tp) => tp.team_id === teamId) || [];
  };

  const getPipelineTeams = (pipelineId: string) => {
    return teamPipelines?.filter((tp) => tp.pipeline_id === pipelineId) || [];
  };

  const handleManagePipelines = (team: Team) => {
    setSelectedTeam(team);
    const currentPipelines = getTeamPipelines(team.id).map((tp) => tp.pipeline_id);
    setSelectedPipelines(currentPipelines);
    setShowDialog(true);
  };

  const handleTogglePipeline = (pipelineId: string) => {
    setSelectedPipelines((prev) =>
      prev.includes(pipelineId)
        ? prev.filter((id) => id !== pipelineId)
        : [...prev, pipelineId]
    );
  };

  const handleSave = async () => {
    if (!selectedTeam) return;

    const currentPipelines = getTeamPipelines(selectedTeam.id).map((tp) => tp.pipeline_id);
    
    // Pipelines to add
    const toAdd = selectedPipelines.filter((id) => !currentPipelines.includes(id));
    // Pipelines to remove
    const toRemove = currentPipelines.filter((id) => !selectedPipelines.includes(id));

    // Execute mutations
    for (const pipelineId of toAdd) {
      await assignPipeline.mutateAsync({
        teamId: selectedTeam.id,
        pipelineId,
      });
    }

    for (const pipelineId of toRemove) {
      await removePipeline.mutateAsync({
        teamId: selectedTeam.id,
        pipelineId,
      });
    }

    setShowDialog(false);
    setSelectedTeam(null);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Hierarquia de acesso</AlertTitle>
        <AlertDescription>
          Líderes de equipe podem ver e gerenciar leads dos membros de sua equipe
          nos pipelines vinculados.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Teams Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Equipes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teams?.map((team) => {
              const pipelineLinks = getTeamPipelines(team.id);
              const leaders = team.members?.filter((m) => m.is_leader) || [];

              return (
                <div
                  key={team.id}
                  className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{team.name}</h4>
                        <Badge variant="secondary">
                          {team.members?.length || 0} membros
                        </Badge>
                      </div>

                      {leaders.length > 0 && (
                        <div className="flex -space-x-2">
                          {leaders.slice(0, 3).map((leader) => (
                            <Avatar
                              key={leader.id}
                              className="h-6 w-6 border-2 border-background"
                            >
                              <AvatarImage src={leader.user?.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px]">
                                {getInitials(leader.user?.name || "?")}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      )}

                      {pipelineLinks.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {pipelineLinks.map((link) => (
                            <Badge
                              key={link.id}
                              variant="outline"
                              className="text-xs gap-1"
                            >
                              <FolderKanban className="h-3 w-3" />
                              {link.pipeline?.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleManagePipelines(team)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {(!teams || teams.length === 0) && (
              <p className="text-center text-muted-foreground py-4">
                Nenhuma equipe criada
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pipelines Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pipelines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pipelines?.map((pipeline) => {
              const teamLinks = getPipelineTeams(pipeline.id);

              return (
                <div
                  key={pipeline.id}
                  className="p-3 rounded-lg border bg-card"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">{pipeline.name}</h4>
                    </div>

                    {teamLinks.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {teamLinks.map((link) => (
                          <Badge key={link.id} variant="secondary" className="text-xs">
                            {link.team?.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Nenhuma equipe vinculada
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {(!pipelines || pipelines.length === 0) && (
              <p className="text-center text-muted-foreground py-4">
                Nenhum pipeline criado
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Manage Pipelines Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Pipelines</DialogTitle>
            <DialogDescription>
              Selecione os pipelines que a equipe "{selectedTeam?.name}" terá acesso
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-64 rounded-md border">
            <div className="p-2 space-y-1">
              {pipelines?.map((pipeline) => {
                const isSelected = selectedPipelines.includes(pipeline.id);

                return (
                  <div
                    key={pipeline.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleTogglePipeline(pipeline.id)}
                  >
                    <Checkbox checked={isSelected} />
                    <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{pipeline.name}</span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary ml-auto" />
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={assignPipeline.isPending || removePipeline.isPending}
            >
              {(assignPipeline.isPending || removePipeline.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
