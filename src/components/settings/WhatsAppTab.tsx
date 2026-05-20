import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Bell,
  History,
  Tag,
  UsersRound,
  ImageIcon,
  Bug,
  Copy } from
"lucide-react";
import { LabelsManagerSheet } from "@/components/whatsapp/LabelsManagerSheet";
import { GroupsManagerSheet } from "@/components/whatsapp/GroupsManagerSheet";
import { useHistorySync, useSyncContactsAvatars } from "@/hooks/use-whatsapp-contacts";
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
  const historySync = useHistorySync();
  const syncAvatars = useSyncContactsAvatars();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const [newProvider, setNewProvider] = useState<"evolution" | "evolution_go">("evolution_go");
  const [selectedSession, setSelectedSession] = useState<WhatsAppSession | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isRefreshingQr, setIsRefreshingQr] = useState(false);
  const [verifyingSessionId, setVerifyingSessionId] = useState<string | null>(null);
  const [labelsSession, setLabelsSession] = useState<WhatsAppSession | null>(null);
  const [groupsSession, setGroupsSession] = useState<WhatsAppSession | null>(null);
  const [debugDialogOpen, setDebugDialogOpen] = useState(false);
  const [debugResults, setDebugResults] = useState<any>(null);
  const [debugLoading, setDebugLoading] = useState(false);

  // Refs para evitar stale closures no polling
  const selectedSessionRef = useRef(selectedSession);
  const qrDialogOpenRef = useRef(qrDialogOpen);

  useEffect(() => {
    selectedSessionRef.current = selectedSession;
    qrDialogOpenRef.current = qrDialogOpen;
  }, [selectedSession, qrDialogOpen]);

  // Função de check separada para usar no polling
  const checkConnection = useCallback(async (session: WhatsAppSession): Promise<boolean | null> => {
    try {
      const isGo = session.provider === "evolution_go";
      const { data, error } = await supabase.functions.invoke(
        isGo ? "evolution-go-proxy" : "evolution-proxy",
        {
          body: isGo
            ? { action: "instance.status", session_id: session.id, instance_id: session.instance_id ?? undefined }
            : { action: "getConnectionStatus", instanceName: session.instance_name },
        },
      );

      if (error) throw error;
      const ok = isGo ? data?.ok : data?.success;
      if (!ok) return null;

      const result = isGo ? (data?.data?.data ?? data?.data) : data.data;

      const isConnected = isGo
        ? (result?.Connected === true || result?.connected === true || result?.LoggedIn === true)
        : (result?.state === "open" || result?.connected === true);

      if (isConnected) {
        const phone = isGo
          ? (result?.jid?.split("@")[0] || null)
          : (result?.phone || result?.instance?.wuid?.split("@")[0] || null);
        await supabase
          .from("whatsapp_sessions")
          .update({ status: "connected", phone_number: phone })
          .eq("id", session.id);

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
      const connected = await checkConnection(session);

      if (connected === true) {
        toast({ title: "✅ Conectado!", description: "WhatsApp está online" });
      } else if (connected === null) {
        toast({ title: "⚠️ Não foi possível verificar", description: "Tente novamente em alguns segundos" });
      } else {
        // Retry once before marking disconnected
        await new Promise(resolve => setTimeout(resolve, 2000));
        const retryResult = await checkConnection(session);

        if (retryResult === true) {
          toast({ title: "✅ Conectado!", description: "WhatsApp está online" });
        } else {
          await supabase.
          from("whatsapp_sessions").
          update({ status: "disconnected" }).
          eq("id", session.id);
          toast({ title: "⚠️ Desconectado", description: "WhatsApp não está conectado" });
        }
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

      const connected = await checkConnection(selectedSessionRef.current);

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
      const result = await createSession.mutateAsync({
        displayName: instanceName.trim(),
        provider: newProvider,
      });
      setCreateDialogOpen(false);
      setInstanceName("");

      setSelectedSession(result.session);
      setQrDialogOpen(true);

      await refreshQRCode(result.session);
    } catch (error) {
      console.error("Error creating session:", error);
    }
  };

  const refreshQRCode = async (session: WhatsAppSession) => {
    setIsRefreshingQr(true);
    try {
      const isGo = session.provider === "evolution_go";
      const data = await getQRCode.mutateAsync(
        isGo
          ? {
              provider: "evolution_go",
              instanceName: session.instance_name,
              sessionId: session.id,
              instanceId: session.instance_id,
            }
          : session.instance_name,
      );
      const qr = (data as any)?.qrcode || (data as any)?.base64;
      if (qr) setQrCode(qr);
    } catch (error) {
      console.error("Error getting QR code:", error);
    } finally {
      setIsRefreshingQr(false);
    }
  };

  const checkConnectionStatus = async (session: WhatsAppSession) => {
    try {
      const isGo = session.provider === "evolution_go";
      const data = await getConnectionStatus.mutateAsync(
        isGo
          ? {
              provider: "evolution_go",
              instanceName: session.instance_name,
              sessionId: session.id,
              instanceId: session.instance_id,
            }
          : session.instance_name,
      );
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
    try {
      await refreshQRCode(session);
    } catch {
      // Reconnect attempt
      try {
        if (session.provider === "evolution_go") {
          const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-go-webhook`;
          await supabase.functions.invoke("evolution-go-proxy", {
            body: {
              action: "instance.connect",
              session_id: session.id,
              instance_id: session.instance_id ?? undefined,
              body: { webhookUrl, subscribe: ["ALL"], immediate: true },
            },
          });
        } else {
          // Recreate or Ensure instance exists for standard provider
          await supabase.functions.invoke("evolution-proxy", {
            body: { action: "createInstance", instanceName: session.instance_name },
          });
        }
        // Small delay to allow instance to boot
        await new Promise(r => setTimeout(r, 3000));
        await refreshQRCode(session);
      } catch (e) {
        console.error("Failed to recreate instance:", e);
        toast({ title: "Erro", description: "Não foi possível reconectar. Tente excluir e criar uma nova conexão.", variant: "destructive" });
      }
    }
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

  const handleDebugInstances = async (session?: WhatsAppSession) => {
    if (!session) {
      toast({ title: "Nenhuma conexão", description: "Crie ou selecione uma conexão WhatsApp primeiro.", variant: "destructive" });
      return;
    }

    setSelectedSession(session);
    setDebugDialogOpen(true);
    setDebugResults(null);
    setDebugLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("evolution-go-proxy", {
        body: {
          action: "debug.instances",
          instance_id: session.instance_id || session.instance_name,
        },
      });

      console.log("Debug Evolution Instances:", data);
      console.log("Erro:", error);

      if (error) {
        setDebugResults({ error: error.message || String(error) });
      } else {
        setDebugResults(data);
      }
    } catch (err: any) {
      console.log("Debug Evolution Instances:", null);
      console.log("Erro:", err);
      setDebugResults({ error: err.message || String(err) });
    } finally {
      setDebugLoading(false);
    }
  };

  const copyDebugResults = () => {
    if (!debugResults) return;
    navigator.clipboard.writeText(JSON.stringify(debugResults, null, 2));
    toast({ title: "Copiado!", description: "JSON de debug copiado." });
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
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDebugInstances(sessions?.[0])}
              disabled={!sessions?.length || debugLoading}
              className="shrink-0"
            >
              <Bug className="w-4 h-4 mr-1.5" />
              Debug Evolution Instances
            </Button>
            <Button data-tour="whatsapp-new-session" size="sm" onClick={() => setCreateDialogOpen(true)} className="shrink-0">
              <Plus className="w-4 h-4 mr-1.5" />
              Nova
            </Button>
          </div>
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
            <Button data-tour="whatsapp-new-session" onClick={() => setCreateDialogOpen(true)}>
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
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => handleDebugInstances(session)} disabled={debugLoading}>
                            {debugLoading && selectedSession?.id === session.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bug className="w-3.5 h-3.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Debug Evolution Instances</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {(session as any).provider === "evolution_go" && session.status === "connected" && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 shrink-0"
                              disabled={historySync.isPending}
                              onClick={() => {
                                historySync.mutate({ sessionId: session.id }, {
                                  onSuccess: () => toast({ title: "Sincronização iniciada", description: "O histórico será carregado em background." }),
                                  onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
                                });
                              }}
                            >
                              {historySync.isPending && historySync.variables?.sessionId === session.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <History className="w-3.5 h-3.5" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Sincronizar histórico de conversas</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {(session as any).provider === "evolution_go" && session.status === "connected" && (
                      <>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => setLabelsSession(session)}>
                                <Tag className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Etiquetas</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => setGroupsSession(session)}>
                                <UsersRound className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Grupos</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 shrink-0"
                                disabled={syncAvatars.isPending}
                                onClick={() => {
                                  syncAvatars.mutate(session.id, {
                                    onSuccess: (d: any) => toast({ title: "Avatares sincronizados", description: `${d?.updated || 0} contatos atualizados` }),
                                    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
                                  });
                                }}
                              >
                                {syncAvatars.isPending && syncAvatars.variables === session.id
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <ImageIcon className="w-3.5 h-3.5" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Sincronizar avatares</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    )}
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0 text-destructive hover:text-destructive" onClick={() => {setSelectedSession(session);setDeleteDialogOpen(true);}}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
          )}
          </div>
        }

        {/* Create Session Sheet */}
        <Sheet open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <SheetContent side="right" className="w-[90%] sm:w-[650px] sm:max-w-[650px] p-6 flex flex-col">
            <SheetHeader>
              <SheetTitle>Nova Conexão WhatsApp</SheetTitle>
              <SheetDescription>
                Dê um nome para identificar esta conexão
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Provedor</Label>
                <Select value={newProvider} onValueChange={(v) => setNewProvider(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="evolution_go">Evolution Go (Novo, recomendado)</SelectItem>
                    <SelectItem value="evolution">Evolution (Legado)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Evolution Go é a nova versão em Go, mais rápida e estável. Use para conexões novas.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Nome da Instância</Label>
                <Input
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  placeholder="Ex: Vendas, Suporte, Marketing..." />
              </div>
            </div>
            <SheetFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateSession}
                disabled={!instanceName.trim() || createSession.isPending}>
                {createSession.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar e Conectar
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* QR Code Dialog */}
        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent className="w-[90%] sm:max-w-md sm:w-full rounded-lg">
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
                  onClick={() => selectedSession && refreshQRCode(selectedSession)}
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


        <LabelsManagerSheet
          open={!!labelsSession}
          onOpenChange={(o) => !o && setLabelsSession(null)}
          sessionId={labelsSession?.id || null}
          sessionName={labelsSession?.display_name || labelsSession?.instance_name}
        />

        <GroupsManagerSheet
          open={!!groupsSession}
          onOpenChange={(o) => !o && setGroupsSession(null)}
          sessionId={groupsSession?.id || null}
          sessionName={groupsSession?.display_name || groupsSession?.instance_name}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="w-[95%] max-w-[400px] rounded-lg">
            <DialogHeader>
              <DialogTitle>Excluir Conexão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir a conexão "{selectedSession?.instance_name}"? 
                Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-row justify-end gap-3 sm:gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="flex-1 sm:flex-none">
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteSession}
                disabled={deleteSession.isPending}
                className="flex-1 sm:flex-none">

                {deleteSession.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={debugDialogOpen} onOpenChange={setDebugDialogOpen}>
          <DialogContent className="w-[95%] sm:max-w-3xl max-h-[80vh] overflow-y-auto rounded-lg">
            <DialogHeader>
              <DialogTitle>Debug Evolution Instances</DialogTitle>
              <DialogDescription>
                Resultado bruto dos testes com {selectedSession?.display_name || selectedSession?.instance_name}
              </DialogDescription>
            </DialogHeader>
            {debugLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : debugResults ? (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                    {JSON.stringify(debugResults, null, 2)}
                  </pre>
                </div>
                <Button variant="outline" onClick={copyDebugResults} className="w-full">
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar JSON
                </Button>
              </div>
            ) : null}
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
      await grantAccess.mutateAsync({ sessionId: session.id, userId, accessMode: "assigned_leads_only" });
    }
  };

  const handleChangeMode = async (userId: string, mode: any) => {
    if (!session) return;
    await grantAccess.mutateAsync({ sessionId: session.id, userId, accessMode: mode });
  };

  const getAccess = (userId: string) => {
    return accessList?.find((access) => access.user_id === userId);
  };

  const MODE_LABELS: Record<string, string> = {
    assigned_leads_only: "Apenas leads atribuídos a este usuário",
    team_leads: "Leads da equipe do usuário",
    all_leads: "Todas as conversas vinculadas a leads",
    full_inbox: "Inbox completo (todas as conversas)",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[90%] sm:w-[650px] sm:max-w-[650px] p-6 flex flex-col">
        <SheetHeader>
          <SheetTitle>Gerenciar Acessos</SheetTitle>
          <SheetDescription>
            Defina quais usuários podem operar esta conexão e o nível de visibilidade das conversas
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-4 py-4">
            {users.map((user) => {
              const access: any = getAccess(user.id);
              const hasAccess = !!access;
              const mode = access?.access_mode || "assigned_leads_only";
              const isOwner = user.id === session?.owner_user_id;

              return (
                <div key={user.id} className="flex flex-col gap-3 py-3 border-b last:border-0 border-border/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isOwner && <Badge variant="secondary">Proprietário</Badge>}
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`access-${user.id}`} className="text-[10px] uppercase font-bold text-muted-foreground cursor-pointer">
                          Acesso
                        </Label>
                        <Checkbox
                          id={`access-${user.id}`}
                          checked={hasAccess}
                          onCheckedChange={() => handleToggleAccess(user.id, hasAccess)}
                          disabled={grantAccess.isPending || revokeAccess.isPending}
                        />
                      </div>
                    </div>
                  </div>

                  {hasAccess && !isOwner && (
                    <div className="pl-11">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-1.5 block">
                        Visibilidade
                      </Label>
                      <Select value={mode} onValueChange={(v) => handleChangeMode(user.id, v)}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(MODE_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>);
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>);

}