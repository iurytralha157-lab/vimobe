import { useState } from "react";
import { Users, Plus, Crown, GitBranch, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTeams, useCreateTeam, useDeleteTeam, Team } from "@/hooks/use-teams";

export function TeamsTab() {
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState("");

  const { data: teams = [], isLoading } = useTeams();
  const createTeam = useCreateTeam();
  const deleteTeam = useDeleteTeam();

  const handleEdit = (team: Team) => {
    setSelectedTeam(team);
    setTeamName(team.name);
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
    setTeamName("");
    setTeamDialogOpen(true);
  };

  const handleSaveTeam = async () => {
    if (!teamName.trim()) return;

    if (selectedTeam) {
      // Update not implemented yet
    } else {
      await createTeam.mutateAsync({ name: teamName });
    }

    setTeamDialogOpen(false);
    setTeamName("");
    setSelectedTeam(null);
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

  const totalMembers = teams.reduce((acc, t) => acc + (t.members?.length || 0), 0);
  const totalLeaders = teams.reduce((acc, t) => acc + (t.members?.filter((m) => m.is_leader)?.length || 0), 0);

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
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Vínculos ativos</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Teams Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Equipes
            </h3>
            <p className="text-sm text-muted-foreground mt-1">Organize seus corretores em equipes</p>
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
              <p className="text-muted-foreground mb-4 text-sm">Crie equipes para organizar seus corretores</p>
              <Button onClick={handleNewTeam}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Equipe
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <Card key={team.id} className="group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{team.name}</h4>
                        <p className="text-xs text-muted-foreground">{team.members?.length || 0} membros</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(team)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(team)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Members Preview */}
                  {team.members && team.members.length > 0 && (
                    <div className="flex items-center gap-1 mt-3">
                      <div className="flex -space-x-2">
                        {team.members.slice(0, 5).map((member) => (
                          <Avatar key={member.id} className="h-7 w-7 border-2 border-background">
                            <AvatarFallback className="text-[10px]">
                              {member.user?.name?.substring(0, 2).toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {team.members.length > 5 && (
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium border-2 border-background">
                            +{team.members.length - 5}
                          </div>
                        )}
                      </div>
                      {team.members.some((m) => m.is_leader) && (
                        <Badge variant="outline" className="ml-2 text-[10px] gap-1">
                          <Crown className="h-3 w-3 text-amber-500" />
                          {team.members.filter((m) => m.is_leader).length}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Team Dialog */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTeam ? "Editar Equipe" : "Nova Equipe"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Nome da equipe</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Ex: Vendas Premium"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTeam} disabled={!teamName.trim() || createTeam.isPending}>
              {createTeam.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {selectedTeam ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir equipe?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a equipe "{teamToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
