import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLeads, useCreateLead, useDeleteLead, useMoveLeadToStage } from "@/hooks/use-leads";
import { useDefaultPipeline } from "@/hooks/use-pipelines";
import { useUsers } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  MoreHorizontal,
  Phone,
  Mail,
  MessageSquare,
  Trash2,
  GripVertical,
  User,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Contacts() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newLead, setNewLead] = useState({ name: "", email: "", phone: "", message: "" });

  const { data: leads, isLoading } = useLeads({ search: search || undefined });
  const { data: pipeline } = useDefaultPipeline();
  const { data: users } = useUsers();
  const createLead = useCreateLead();
  const deleteLead = useDeleteLead();
  const moveLead = useMoveLeadToStage();

  const handleCreateLead = async () => {
    if (!newLead.name.trim()) return;
    
    await createLead.mutateAsync({
      name: newLead.name,
      email: newLead.email || undefined,
      phone: newLead.phone || undefined,
      message: newLead.message || undefined,
      pipeline_id: pipeline?.id,
      stage_id: pipeline?.stages?.[0]?.id,
    });
    
    setNewLead({ name: "", email: "", phone: "", message: "" });
    setIsDialogOpen(false);
  };

  const getLeadsByStage = (stageId: string) => {
    return leads?.filter((lead) => lead.stage_id === stageId) || [];
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="p-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div>
              <h1 className="text-3xl font-bold">{t("nav.contacts")}</h1>
              <p className="text-muted-foreground">
                {leads?.length || 0} leads no pipeline
              </p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("common.search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("leads.newLead")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("leads.newLead")}</DialogTitle>
                    <DialogDescription>
                      Adicione um novo lead ao seu pipeline
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t("common.name")} *</Label>
                      <Input
                        id="name"
                        value={newLead.name}
                        onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                        placeholder="Nome do lead"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">{t("common.email")}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newLead.email}
                        onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t("common.phone")}</Label>
                      <Input
                        id="phone"
                        value={newLead.phone}
                        onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">{t("leads.message")}</Label>
                      <Textarea
                        id="message"
                        value={newLead.message}
                        onChange={(e) => setNewLead({ ...newLead, message: e.target.value })}
                        placeholder="Mensagem ou observação inicial"
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      {t("common.cancel")}
                    </Button>
                    <Button onClick={handleCreateLead} disabled={createLead.isPending}>
                      {createLead.isPending ? t("common.loading") : t("common.save")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {isLoading ? (
              <div className="flex gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex-shrink-0 w-80">
                    <Skeleton className="h-10 w-full mb-4" />
                    <Skeleton className="h-32 w-full mb-2" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                ))}
              </div>
            ) : pipeline?.stages?.length ? (
              <div className="flex gap-4">
                {pipeline.stages.map((stage) => {
                  const stageLeads = getLeadsByStage(stage.id);
                  return (
                    <div key={stage.id} className="flex-shrink-0 w-80">
                      <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-muted/50">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stage.color || "#6366f1" }}
                        />
                        <span className="font-medium">{stage.name}</span>
                        <Badge variant="secondary" className="ml-auto">
                          {stageLeads.length}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {stageLeads.map((lead) => (
                          <Card key={lead.id} className="card-hover cursor-pointer">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarFallback>
                                      {lead.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{lead.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {formatDistanceToNow(new Date(lead.created_at), {
                                        addSuffix: true,
                                        locale: ptBR,
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {lead.phone && (
                                      <DropdownMenuItem>
                                        <Phone className="h-4 w-4 mr-2" />
                                        Ligar
                                      </DropdownMenuItem>
                                    )}
                                    {lead.email && (
                                      <DropdownMenuItem>
                                        <Mail className="h-4 w-4 mr-2" />
                                        E-mail
                                      </DropdownMenuItem>
                                    )}
                                    {lead.phone && (
                                      <DropdownMenuItem>
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        WhatsApp
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => deleteLead.mutate(lead.id)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Excluir
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              
                              {/* Contact info */}
                              <div className="mt-3 space-y-1">
                                {lead.phone && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Phone className="h-3 w-3" />
                                    {lead.phone}
                                  </p>
                                )}
                                {lead.email && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-2 truncate">
                                    <Mail className="h-3 w-3" />
                                    {lead.email}
                                  </p>
                                )}
                              </div>

                              {/* Tags */}
                              {lead.tags && lead.tags.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1">
                                  {lead.tags.map((tag) => (
                                    <Badge
                                      key={tag.id}
                                      variant="outline"
                                      className="text-xs"
                                      style={{ borderColor: tag.color, color: tag.color }}
                                    >
                                      {tag.name}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              {/* Assigned user */}
                              {lead.assigned_user && (
                                <div className="mt-3 pt-3 border-t flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={lead.assigned_user.avatar_url || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {lead.assigned_user.name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm text-muted-foreground">
                                    {lead.assigned_user.name}
                                  </span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                        {stageLeads.length === 0 && (
                          <div className="p-4 text-center text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                            Nenhum lead nesta etapa
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <User className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Nenhum pipeline configurado</h3>
                <p className="text-muted-foreground">
                  Configure um pipeline para começar a gerenciar seus leads
                </p>
              </div>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </AppLayout>
  );
}
