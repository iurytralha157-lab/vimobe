import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, Users, FolderKanban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Team, useDeleteTeam } from "@/hooks/use-teams";
import { useTeamPipelines } from "@/hooks/use-team-pipelines";

interface TeamCardProps {
  team: Team;
  onEdit: (team: Team) => void;
  onManagePipelines: (team: Team) => void;
}

export function TeamCard({ team, onEdit, onManagePipelines }: TeamCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const deleteTeam = useDeleteTeam();
  const { data: teamPipelines } = useTeamPipelines(team.id);

  const leaders = team.members?.filter((m) => m.is_leader) || [];
  const regularMembers = team.members?.filter((m) => !m.is_leader) || [];
  const pipelineCount = teamPipelines?.length || 0;

  const handleDelete = () => {
    deleteTeam.mutate(team.id, {
      onSuccess: () => setShowDeleteDialog(false),
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Card className="group hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">{team.name}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{team.members?.length || 0} membros</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(team)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onManagePipelines(team)}>
                <FolderKanban className="h-4 w-4 mr-2" />
                Gerenciar Pipelines
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Leaders Section */}
          {leaders.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Líderes
              </p>
              <div className="flex flex-wrap gap-2">
                {leaders.map((leader) => (
                  <div
                    key={leader.id}
                    className="flex items-center gap-2 bg-primary/5 rounded-full pl-1 pr-3 py-1"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={leader.user?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {getInitials(leader.user?.name || "?")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{leader.user?.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regular Members Section */}
          {regularMembers.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Membros
              </p>
              <div className="flex -space-x-2">
                {regularMembers.slice(0, 5).map((member) => (
                  <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                    <AvatarImage src={member.user?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(member.user?.name || "?")}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {regularMembers.length > 5 && (
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-xs font-medium border-2 border-background">
                    +{regularMembers.length - 5}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pipelines Badge */}
          <div className="pt-2 border-t">
            <Badge variant="secondary" className="gap-1">
              <FolderKanban className="h-3 w-3" />
              {pipelineCount} pipeline{pipelineCount !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir equipe</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a equipe "{team.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTeam.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
