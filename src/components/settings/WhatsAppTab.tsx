import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Plus,
  Smartphone,
  QrCode,
  Trash2,
  LogOut,
  Users,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  Bell } from
"lucide-react";
import {
  useWhatsAppSessions,
  useCreateWhatsAppSession,
  useDeleteWhatsAppSession,
  useGetQRCode,
  useGetConnectionStatus,
  useLogoutSession,
  useSessionAccess,
  useGrantSessionAccess,
  useRevokeSessionAccess,
  useToggleNotificationSession,
  WhatsAppSession } from
"@/hooks/use-whatsapp-sessions";
import { useOrganizationUsers } from "@/hooks/use-users";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function WhatsAppTab() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: sessions, isLoading } = useWhatsAppSessions();
  const { data: users } = useOrganizationUsers();
  const createSession = useCreateWhatsAppSession();
  const deleteSession = useDeleteWhatsAppSession();
  const getQRCode = useGetQRCode();
  const getConnectionStatus = useGetConnectionStatus();
  const logoutSession = useLogoutSession();
  const toggleNotification = useToggleNotificationSession();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const [selectedSession, setSelectedSession] = useState<WhatsAppSession | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isRefreshingQr, setIsRefreshingQr] = useState(false);
  const [verifyingSessionId, setVerifyingSessionId] = useState<string | null>(null);

  // Refs para evitar stale closures no polling
  const selectedSessionRef = useRef(selectedSession);
  const qrDialogOpenRef = useRef(qrDialogOpen);

  useEffect(() => {
    selectedSessionRef.current = selectedSession;
    qrDialogOpenRef.current = qrDialogOpen;
  }, [selectedSession, qrDialogOpen]);

  // Função de check separada para usar no polling
  const checkConnection = useCallback(async (instanceName: string, sessionId: string): Promise<boolean | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("evolution-proxy", {
        body: { action: "getConnectionStatus", instanceName }
      });

      if (error) throw error;
      if (!data?.success) return null;

      const result = data.data;

      const isConnected =
      result?.connected === true ||
      result?.status === true ||
      result?.state === "open" ||
      result?.state === "connected";

      if (isConnected) {
        await supabase.
        from("whatsapp_sessions").
        update({ status: "connected", phone_number: result?.phone || result?.instance?.wuid?.split("@")[0] || null }).
        eq("id", sessionId);

        return true;
      }
      return false;
    } catch (error) {
      console.log("Polling check failed:", error);
      return null;
    }
  }, []);

  // Verificar conexão manualmente
  const handleVerifyConnection = async (session: WhatsAppSession) => {
    setVerifyingSessionId(session.id);

    try {
      const connected = await checkConnection(session.instance_name, session.id);

      if (connected === true) {
        toast({ title: "✅ Conectado!", description: "WhatsApp está online" });
      } else {
        await supabase.
        from("whatsapp_sessions").
        update({ status: "disconnected" }).
        eq("id", session.id);
        toast({ title: "⚠️ Desconectado", description: "WhatsApp não está conectado" });
      }

      queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions"] });
    } catch (error) {
      console.error("Error verifying connection:", error);
      toast({ title: "Erro", description: "Não foi possível verificar a conexão", variant: "destructive" });
    } finally {
      setVerifyingSessionId(null);
    }
  };
  // Polling para verificar conexão automaticamente quando o QR dialog está aberto
  useEffect(() => {
    if (!qrDialogOpen || !selectedSession) return;

    const pollInterval = setInterval(async () => {
      if (!qrDialogOpenRef.current || !selectedSessionRef.current) {
        clearInterval(pollInterval);
        return;
      }

      const connected = await checkConnection(
        selectedSessionRef.current.instance_name,
        selectedSessionRef.current.id
      );

      if (connected === true) {
        toast({ title: "Conectado!", description: "WhatsApp conectado com sucesso" });
        setQrDialogOpen(false);
        setQrCode(null);
        queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions"] });
        clearInterval(pollInterval);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [qrDialogOpen, selectedSession?.id, checkConnection, queryClient]);

  const handleCreateSession = async () => {
    if (!instanceName.trim()) return;

    try {
      const result = await createSession.mutateAsync(instanceName.trim());
      setCreateDialogOpen(false);
      setInstanceName("");

      setSelectedSession(result.session);
      setQrDialogOpen(true);

      await refreshQRCode(instanceName.trim());
    } catch (error) {
      console.error("Error creating session:", error);
    }
  };

  const refreshQRCode = async (instanceName: string) => {
    setIsRefreshingQr(true);
    try {
      const data = await getQRCode.mutateAsync(instanceName);
      if (data?.qrcode) {
        setQrCode(data.qrcode);
      } else if (data?.base64) {
        setQrCode(data.base64);
      } else if (data?.code) {
        setQrCode(data.code);
      }
    } catch (error) {
      console.error("Error getting QR code:", error);
    } finally {
      setIsRefreshingQr(false);
    }
  };

  const checkConnectionStatus = async (session: WhatsAppSession) => {
    try {
      const data = await getConnectionStatus.mutateAsync(session.instance_name);
      if (data?.state === "open" || data?.connected === true) {
        toast({ title: "Conectado!", description: "WhatsApp conectado com sucesso" });
        setQrDialogOpen(false);
        setQrCode(null);
      }
    } catch (error) {
      console.error("Error checking status:", error);
    }
  };

  const handleOpenQRDialog = async (session: WhatsAppSession) => {
    setSelectedSession(session);
    setQrDialogOpen(true);
    await refreshQRCode(session.instance_name);
  };

  const handleOpenAccessDialog = (session: WhatsAppSession) => {
    setSelectedSession(session);
    setAccessDialogOpen(true);
  };

  const handleDeleteSession = async () => {
    if (!selectedSession) return;
    await deleteSession.mutateAsync(selectedSession);
    setDeleteDialogOpen(false);
    setSelectedSession(null);
  };

  const handleLogout = async (session: WhatsAppSession) => {
    await logoutSession.mutateAsync(session);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-orange-500 hover:bg-orange-600"><CheckCircle className="w-3 h-3 mr-1" />Conectado</Badge>;
      case "connecting":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Conectando</Badge>;
      default:
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Desconectado</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Conexões WhatsApp
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-0.5">
              Gerencie suas conexões via Evolution API
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="shrink-0">
            <Plus className="w-4 h-4 mr-1.5" />
            Nova
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ?
        <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div> :
        sessions?.length === 0 ?
        <div className="flex flex-col items-center justify-center py-12">
            <Smartphone className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma conexão</h3>
            <p className="text-muted-foreground text-center mb-4">
              Conecte seu primeiro WhatsApp para começar a receber mensagens
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Conectar WhatsApp
            </Button>
          </div> :

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 px-[10px]">
            {sessions?.map((session) =>
          <Card key={session.id} className="border">
                <CardContent className="p-3 space-y-2.5">
                  {/* Row 1: Avatar + name + status badge */}
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={session.profile_picture || undefined} />
                      <AvatarFallback>
                        <Smartphone className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate leading-tight">{session.display_name || session.instance_name}</p>
                      <p className="text-xs text-muted-foreground truncate leading-tight">
                        {session.status === "connected" ?
                    session.phone_number || session.profile_name || "Conectado" :
                    "Não conectado"}
                      </p>
                    </div>
                    <div className="shrink-0">{getStatusBadge(session.status)}</div>
                  </div>

                  {/* Row 2: Responsável + notificação toggle */}
                  <div className="flex items-center justify-between gap-2 py-1.5 border-y border-border/50">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {(session as any).is_notification_session &&
                  <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 text-[10px] px-1.5 py-0 shrink-0">
                          <Bell className="w-2.5 h-2.5 mr-0.5" />
                          Notif.
                        </Badge>
                  }
                      <span className="text-xs text-muted-foreground truncate">
                        {session.owner?.name || "—"}
                      </span>
                    </div>
                    {isAdmin &&
                <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                              <Switch
                          checked={(session as any).is_notification_session || false}
                          onCheckedChange={(checked) =>
                          toggleNotification.mutate({ sessionId: session.id, enabled: checked })
                          }
                          disabled={toggleNotification.isPending} />

                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Usar para enviar notificações via WhatsApp</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                }
                  </div>

                  {/* Row 3: Action buttons */}
                  <div className="flex items-center gap-1.5">
                    {session.status !== "connected" ?
                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs px-2 min-w-0" onClick={() => handleOpenQRDialog(session)}>
                        <QrCode className="w-3.5 h-3.5 mr-1 shrink-0" />
                        QR Code
                      </Button> :

                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs px-2 min-w-0" onClick={() => handleLogout(session)}>
                        <LogOut className="w-3.5 h-3.5 mr-1 shrink-0" />
                        Desconectar
                      </Button>
                }
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs px-2 min-w-0" onClick={() => handleVerifyConnection(session)} disabled={verifyingSessionId === session.id}>
                      <RefreshCw className={`w-3.5 h-3.5 mr-1 shrink-0 ${verifyingSessionId === session.id ? "animate-spin" : ""}`} />
                      Verificar
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => handleOpenAccessDialog(session)}>
                      <Users className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0 text-destructive hover:text-destructive" onClick={() => {setSelectedSession(session);setDeleteDialogOpen(true);}}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
          )}
          </div>
        }

        {/* Create Session Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Conexão WhatsApp</DialogTitle>
              <DialogDescription>
                Dê um nome para identificar esta conexão
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome da Instância</Label>
                <Input
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  placeholder="Ex: Vendas, Suporte, Marketing..." />

              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateSession}
                disabled={!instanceName.trim() || createSession.isPending}>

                {createSession.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar e Conectar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* QR Code Dialog */}
        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Escanear QR Code</DialogTitle>
              <DialogDescription>
                Abra o WhatsApp no seu celular e escaneie o código abaixo
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center py-6">
              {isRefreshingQr || getQRCode.isPending ?
              <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-lg">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div> :
              qrCode ?
              <img
                src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                alt="QR Code"
                className="w-64 h-64 rounded-lg" /> :


              <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-lg">
                  <p className="text-muted-foreground text-center px-4">
                    Não foi possível gerar o QR Code
                  </p>
                </div>
              }
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => selectedSession && refreshQRCode(selectedSession.instance_name)}
                  disabled={isRefreshingQr}>

                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshingQr ? "animate-spin" : ""}`} />
                  Atualizar
                </Button>
                <Button
                  onClick={() => selectedSession && checkConnectionStatus(selectedSession)}
                  disabled={getConnectionStatus.isPending}>

                  {getConnectionStatus.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Verificar Conexão
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Access Control Dialog */}
        <AccessControlDialog
          open={accessDialogOpen}
          onOpenChange={setAccessDialogOpen}
          session={selectedSession}
          users={users || []} />


        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir Conexão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir a conexão "{selectedSession?.instance_name}"? 
                Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteSession}
                disabled={deleteSession.isPending}>

                {deleteSession.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>);

}

// Access Control Dialog Component
function AccessControlDialog({
  open,
  onOpenChange,
  session,
  users





}: {open: boolean;onOpenChange: (open: boolean) => void;session: WhatsAppSession | null;users: any[];}) {
  const { data: accessList } = useSessionAccess(session?.id || null);
  const grantAccess = useGrantSessionAccess();
  const revokeAccess = useRevokeSessionAccess();

  const handleToggleAccess = async (userId: string, hasAccess: boolean) => {
    if (!session) return;

    if (hasAccess) {
      await revokeAccess.mutateAsync({ sessionId: session.id, userId });
    } else {
      await grantAccess.mutateAsync({ sessionId: session.id, userId });
    }
  };

  const userHasAccess = (userId: string) => {
    return accessList?.some((access) => access.user_id === userId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerenciar Acessos</DialogTitle>
          <DialogDescription>
            Selecione os usuários que podem ver e enviar mensagens por esta conexão
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-4 py-4">
            {users.map((user) => {
              const hasAccess = userHasAccess(user.id);
              const isOwner = user.id === session?.owner_user_id;

              return (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOwner ?
                    <Badge variant="secondary">Proprietário</Badge> :

                    <Checkbox
                      checked={hasAccess}
                      onCheckedChange={() => handleToggleAccess(user.id, hasAccess)}
                      disabled={grantAccess.isPending || revokeAccess.isPending} />

                    }
                  </div>
                </div>);

            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>);

}