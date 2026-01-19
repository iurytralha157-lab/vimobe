import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Team, useCreateTeam, useUpdateTeam } from "@/hooks/use-teams";
import { useUsers } from "@/hooks/use-users";

interface TeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team?: Team | null;
}

export function TeamDialog({ open, onOpenChange, team }: TeamDialogProps) {
  const [name, setName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [leaders, setLeaders] = useState<string[]>([]);

  const { data: users, isLoading: usersLoading } = useUsers();
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();

  const isEditing = !!team;
  const isPending = createTeam.isPending || updateTeam.isPending;

  useEffect(() => {
    if (open) {
      if (team) {
        setName(team.name);
        setSelectedMembers(team.members?.map((m) => m.user_id) || []);
        setLeaders(
          team.members?.filter((m) => m.is_leader).map((m) => m.user_id) || []
        );
      } else {
        setName("");
        setSelectedMembers([]);
        setLeaders([]);
      }
    }
  }, [open, team]);

  const handleMemberToggle = (userId: string) => {
    setSelectedMembers((prev) => {
      if (prev.includes(userId)) {
        // Remove from members and leaders
        setLeaders((l) => l.filter((id) => id !== userId));
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const handleLeaderToggle = (userId: string) => {
    setLeaders((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) return;

    if (isEditing && team) {
      updateTeam.mutate(
        {
          id: team.id,
          name: name.trim(),
          memberIds: selectedMembers,
          leaderIds: leaders,
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    } else {
      createTeam.mutate(
        {
          name: name.trim(),
          memberIds: selectedMembers,
          leaderId: leaders[0],
        },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    }
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Equipe" : "Nova Equipe"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados da equipe"
              : "Crie uma nova equipe e adicione membros"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da equipe</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Vendas, Atendimento..."
            />
          </div>

          <div className="space-y-2">
            <Label>Membros</Label>
            {usersLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-64 rounded-md border">
                <div className="p-2 space-y-1">
                  {users?.map((user) => {
                    const isSelected = selectedMembers.includes(user.id);
                    const isLeader = leaders.includes(user.id);

                    return (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleMemberToggle(user.id)}
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {user.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {user.email}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={`leader-${user.id}`}
                              className="text-xs text-muted-foreground"
                            >
                              Líder
                            </Label>
                            <Switch
                              id={`leader-${user.id}`}
                              checked={isLeader}
                              onCheckedChange={() => handleLeaderToggle(user.id)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !name.trim()}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
