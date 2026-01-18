import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTags, useCreateTag, useDeleteTag } from "@/hooks/use-tags";
import { useTeams, useCreateTeam, useDeleteTeam } from "@/hooks/use-teams";
import { usePipelines } from "@/hooks/use-pipelines";
import { useUsers } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Tags, Users, GitBranch } from "lucide-react";

const TAG_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
  "#14b8a6", "#06b6d4", "#0ea5e9", "#6366f1", "#8b5cf6",
  "#a855f7", "#d946ef", "#ec4899",
];

export default function CRMManagement() {
  const { t } = useLanguage();
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [newTeamName, setNewTeamName] = useState("");
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);

  const { data: tags, isLoading: tagsLoading } = useTags();
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: pipelines, isLoading: pipelinesLoading } = usePipelines();
  const { data: users } = useUsers();

  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();
  const createTeam = useCreateTeam();
  const deleteTeam = useDeleteTeam();

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    await createTag.mutateAsync({ name: newTagName, color: newTagColor });
    setNewTagName("");
    setNewTagColor(TAG_COLORS[0]);
    setIsTagDialogOpen(false);
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    await createTeam.mutateAsync({ name: newTeamName });
    setNewTeamName("");
    setIsTeamDialogOpen(false);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("nav.crm")}</h1>
          <p className="text-muted-foreground">
            Gerencie tags, equipes e pipelines
          </p>
        </div>

        <Tabs defaultValue="tags" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tags" className="gap-2">
              <Tags className="h-4 w-4" />
              Tags
            </TabsTrigger>
            <TabsTrigger value="teams" className="gap-2">
              <Users className="h-4 w-4" />
              Equipes
            </TabsTrigger>
            <TabsTrigger value="pipelines" className="gap-2">
              <GitBranch className="h-4 w-4" />
              Pipelines
            </TabsTrigger>
          </TabsList>

          {/* Tags Tab */}
          <TabsContent value="tags">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Tags</CardTitle>
                  <CardDescription>
                    Use tags para categorizar e organizar seus leads
                  </CardDescription>
                </div>
                <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Tag
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Tag</DialogTitle>
                      <DialogDescription>
                        Crie uma nova tag para categorizar leads
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nome da tag</Label>
                        <Input
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          placeholder="Ex: VIP, Urgente, Indicação"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cor</Label>
                        <div className="flex gap-2 flex-wrap">
                          {TAG_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={`w-8 h-8 rounded-full border-2 transition-transform ${
                                newTagColor === color ? "scale-110 border-foreground" : "border-transparent"
                              }`}
                              style={{ backgroundColor: color }}
                              onClick={() => setNewTagColor(color)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsTagDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateTag} disabled={createTag.isPending}>
                        {createTag.isPending ? "Criando..." : "Criar"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {tagsLoading ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : tags?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="py-2 px-3 gap-2"
                        style={{ borderColor: tag.color, color: tag.color }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                        <button
                          type="button"
                          className="ml-1 hover:opacity-70"
                          onClick={() => deleteTag.mutate(tag.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhuma tag criada</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Equipes</CardTitle>
                  <CardDescription>
                    Organize seus corretores em equipes
                  </CardDescription>
                </div>
                <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Equipe
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Equipe</DialogTitle>
                      <DialogDescription>
                        Crie uma nova equipe para organizar corretores
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nome da equipe</Label>
                        <Input
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                          placeholder="Ex: Equipe Sul, Vendas Premium"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsTeamDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateTeam} disabled={createTeam.isPending}>
                        {createTeam.isPending ? "Criando..." : "Criar"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {teamsLoading ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : teams?.length ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {teams.map((team) => (
                      <Card key={team.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">{team.name}</h3>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteTeam.mutate(team.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {team.members?.length || 0} membros
                            </span>
                          </div>
                          {team.members && team.members.length > 0 && (
                            <div className="flex -space-x-2 mt-3">
                              {team.members.slice(0, 5).map((member) => (
                                <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                                  <AvatarImage src={member.user?.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {member.user?.name?.charAt(0) || "?"}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {team.members.length > 5 && (
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                                  +{team.members.length - 5}
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhuma equipe criada</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pipelines Tab */}
          <TabsContent value="pipelines">
            <Card>
              <CardHeader>
                <CardTitle>Pipelines</CardTitle>
                <CardDescription>
                  Visualize e gerencie seus pipelines de vendas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pipelinesLoading ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : pipelines?.length ? (
                  <div className="space-y-6">
                    {pipelines.map((pipeline) => (
                      <div key={pipeline.id} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <h3 className="font-semibold">{pipeline.name}</h3>
                          {pipeline.is_default && (
                            <Badge variant="secondary">Padrão</Badge>
                          )}
                        </div>
                        {pipeline.stages && pipeline.stages.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {pipeline.stages.map((stage, index) => (
                              <div
                                key={stage.id}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 whitespace-nowrap"
                              >
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: stage.color || "#6366f1" }}
                                />
                                <span className="text-sm">{stage.name}</span>
                                {index < pipeline.stages.length - 1 && (
                                  <span className="text-muted-foreground">→</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhum pipeline configurado</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
