import { useState, useEffect, useRef } from "react";
import { useFloatingChat } from "@/contexts/FloatingChatContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MessageCircle, X, Minus, Send, ArrowLeft, Search, Loader2, Check, CheckCheck, Clock, Mic, Video, FileText, User, Phone, Users, Paperclip, Image } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { useWhatsAppConversations, useWhatsAppMessages, useSendWhatsAppMessage, useMarkConversationAsRead, useWhatsAppRealtimeConversations, WhatsAppConversation, WhatsAppMessage } from "@/hooks/use-whatsapp-conversations";
import { useWhatsAppSessions, WhatsAppSession } from "@/hooks/use-whatsapp-sessions";
import { useStartConversation, useFindConversationByPhone } from "@/hooks/use-start-conversation";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
export function FloatingChat() {
  const {
    state,
    closeChat,
    minimizeChat,
    maximizeChat,
    openConversation,
    clearActiveConversation,
    clearPendingMessage
  } = useFloatingChat();
  const {
    isOpen,
    isMinimized,
    activeConversation,
    pendingPhone,
    pendingLeadName,
    pendingMessage
  } = state;
  const isMobile = useIsMobile();
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [messageText, setMessageText] = useState("");
  const [hideGroups, setHideGroups] = useState(() => {
    return localStorage.getItem("whatsapp-hide-groups-floating") === "true";
  });
  const [showSessionSelector, setShowSessionSelector] = useState(false);
  const [pendingStartData, setPendingStartData] = useState<{phone: string, leadName?: string} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const {
    data: sessions,
    isLoading: loadingSessions
  } = useWhatsAppSessions();
  const {
    data: conversations,
    isLoading: loadingConversations
  } = useWhatsAppConversations(selectedSessionId || undefined, {
    hideGroups
  });
  const {
    data: messages,
    isLoading: loadingMessages
  } = useWhatsAppMessages(activeConversation?.id || null);
  const sendMessage = useSendWhatsAppMessage();
  const markAsRead = useMarkConversationAsRead();
  const startConversation = useStartConversation();
  const findConversation = useFindConversationByPhone();

  // Enable realtime
  useWhatsAppRealtimeConversations();

  // Save hide groups preference
  useEffect(() => {
    localStorage.setItem("whatsapp-hide-groups-floating", String(hideGroups));
  }, [hideGroups]);

  // Auto-selecionar primeira sessão conectada
  useEffect(() => {
    if (!selectedSessionId && sessions?.length) {
      const connectedSession = sessions.find(s => s.status === "connected");
      if (connectedSession) {
        setSelectedSessionId(connectedSession.id);
      } else if (sessions[0]) {
        setSelectedSessionId(sessions[0].id);
      }
    }
  }, [sessions, selectedSessionId]);

  // Handle pending phone (abrir nova conversa)
  useEffect(() => {
    if (pendingPhone && sessions?.length) {
      const connected = sessions.filter(s => s.status === "connected");
      
      if (connected.length === 0) {
        toast({
          title: "Nenhuma sessão conectada",
          description: "Conecte um WhatsApp em Configurações → WhatsApp",
          variant: "destructive"
        });
        return;
      }
      
      if (connected.length === 1) {
        // Apenas uma sessão conectada: selecionar automaticamente
        setSelectedSessionId(connected[0].id);
        handleStartConversation(pendingPhone, pendingLeadName || undefined);
      } else {
        // Múltiplas sessões conectadas: mostrar diálogo de seleção
        setPendingStartData({ phone: pendingPhone, leadName: pendingLeadName || undefined });
        setShowSessionSelector(true);
      }
    }
  }, [pendingPhone, sessions]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages]);

  // Pre-fill message from pendingMessage when conversation is active
  useEffect(() => {
    if (pendingMessage && activeConversation) {
      setMessageText(pendingMessage);
      clearPendingMessage();
    }
  }, [activeConversation, pendingMessage, clearPendingMessage]);

  // Mark as read
  useEffect(() => {
    if (activeConversation && activeConversation.unread_count > 0) {
      markAsRead.mutate({
        id: activeConversation.id,
        session_id: activeConversation.session_id,
        remote_jid: activeConversation.remote_jid,
        is_group: activeConversation.is_group
      });
    }
  }, [activeConversation?.id]);

  const handleSessionSelect = (session: WhatsAppSession) => {
    setSelectedSessionId(session.id);
    setShowSessionSelector(false);
    if (pendingStartData) {
      handleStartConversationWithSession(pendingStartData.phone, session.id, pendingStartData.leadName);
      setPendingStartData(null);
    }
  };

  const handleStartConversation = async (phone: string, leadName?: string) => {
    if (!selectedSessionId) {
      toast({
        title: "Nenhuma sessão WhatsApp",
        description: "Configure uma sessão WhatsApp primeiro",
        variant: "destructive"
      });
      return;
    }
    await handleStartConversationWithSession(phone, selectedSessionId, leadName);
  };

  const handleStartConversationWithSession = async (phone: string, sessionId: string, leadName?: string) => {
    try {
      // Primeiro tenta encontrar conversa existente
      const existing = await findConversation.mutateAsync(phone);
      if (existing) {
        openConversation(existing);
        return;
      }

      // Se não existe, criar nova
      const newConversation = await startConversation.mutateAsync({
        phone,
        sessionId,
        leadName
      });
      openConversation(newConversation);
    } catch (error) {
      console.error("Error starting conversation:", error);
    }
  };
  const filteredConversations = conversations?.filter(conv => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return conv.contact_name?.toLowerCase().includes(search) || conv.contact_phone?.includes(search);
  });
  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeConversation) return;

    // Verify session is valid and connected before sending
    const sessionId = activeConversation.session_id;
    const sessionExists = sessions?.find(s => s.id === sessionId);
    if (!sessionExists) {
      toast({
        title: "Sessão inválida",
        description: "A sessão WhatsApp não existe mais. Selecione outra conversa.",
        variant: "destructive"
      });
      clearActiveConversation();
      return;
    }
    if (sessionExists.status !== "connected") {
      toast({
        title: "WhatsApp Desconectado",
        description: "Reconecte o WhatsApp em Configurações → WhatsApp",
        variant: "destructive"
      });
      return;
    }
    await sendMessage.mutateAsync({
      conversation: activeConversation,
      text: messageText.trim()
    });
    setMessageText("");
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;
      const {
        error: uploadError
      } = await supabase.storage.from("whatsapp-media").upload(filePath, file);
      if (uploadError) throw uploadError;
      const {
        data: urlData
      } = supabase.storage.from("whatsapp-media").getPublicUrl(filePath);

      // Determine media type
      let mediaType = "document";
      if (file.type.startsWith("image/")) mediaType = "image";else if (file.type.startsWith("video/")) mediaType = "video";else if (file.type.startsWith("audio/")) mediaType = "audio";

      // Send message with media
      await sendMessage.mutateAsync({
        conversation: activeConversation,
        text: file.name,
        mediaUrl: urlData.publicUrl,
        mediaType
      });
      toast({
        title: "Arquivo enviado",
        description: "O arquivo foi enviado com sucesso"
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Erro ao enviar arquivo",
        description: "Não foi possível enviar o arquivo",
        variant: "destructive"
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  const formatConversationTime = (date: string | null) => {
    if (!date) return "";
    const d = new Date(date);
    if (isToday(d)) return format(d, "HH:mm");
    if (isYesterday(d)) return "Ontem";
    return format(d, "dd/MM");
  };
  const unreadCount = conversations?.reduce((acc, c) => acc + (c.unread_count || 0), 0) || 0;
  const connectedSessions = sessions?.filter(s => s.status === "connected") || [];
  const hasConnectedSession = connectedSessions.length > 0;

  // Session Selector Dialog Component
  const SessionSelectorDialog = () => (
    <Dialog open={showSessionSelector} onOpenChange={(open) => {
      if (!open) {
        setShowSessionSelector(false);
        setPendingStartData(null);
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Escolher Instância WhatsApp
          </DialogTitle>
          <DialogDescription>
            Selecione qual instância usar para enviar mensagem para{" "}
            <span className="font-medium text-foreground">
              {pendingStartData?.leadName || pendingStartData?.phone}
            </span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2 mt-4">
          {connectedSessions.map(session => (
            <Button
              key={session.id}
              variant="outline"
              className="w-full justify-start h-auto py-3 px-4 hover:bg-accent"
              onClick={() => handleSessionSelect(session)}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-3 h-3 rounded-full bg-green-500 shrink-0 animate-pulse" />
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span className="font-medium truncate">
                    {session.instance_name}
                  </span>
                  {session.phone_number && (
                    <span className="text-xs text-muted-foreground">
                      {session.phone_number}
                    </span>
                  )}
                </div>
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );

  if (!isOpen) return null;

  // Shared content components
  const ChatHeader = ({
    mobile = false
  }: {
    mobile?: boolean;
  }) => <div className={cn("flex items-center justify-between shrink-0", mobile ? "px-4 py-3 bg-card border-b border-border" : "h-16 bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground px-5 shadow-sm")}>
      <div className="flex items-center gap-2">
        {activeConversation && <Button variant="ghost" size="icon" className={cn("h-8 w-8", mobile ? "hover:bg-muted" : "text-primary-foreground hover:bg-primary-foreground/20")} onClick={clearActiveConversation}>
            <ArrowLeft className="h-4 w-4" />
          </Button>}
        <MessageCircle className={cn("h-5 w-5", mobile && "text-primary")} />
        <span className={cn("font-medium", mobile ? "text-base" : "")}>
          {activeConversation ? activeConversation.contact_name || activeConversation.contact_phone : "WhatsApp"}
        </span>
        {activeConversation?.is_group && <Badge variant="secondary" className="text-[10px] h-4">
            Grupo
          </Badge>}
        {!isMinimized && unreadCount > 0 && !activeConversation && <Badge variant="secondary" className="h-5 min-w-5 flex items-center justify-center text-xs">
            {unreadCount}
          </Badge>}
      </div>
      <div className="flex items-center gap-1">
        {!mobile && <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20" onClick={isMinimized ? maximizeChat : minimizeChat}>
            <Minus className="h-4 w-4" />
          </Button>}
        <Button variant="ghost" size="icon" className={cn("h-8 w-8", mobile ? "hover:bg-muted" : "text-primary-foreground hover:bg-primary-foreground/20")} onClick={closeChat}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>;
  const DisconnectedState = () => <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-card">
      <Phone className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground mb-2">Nenhum WhatsApp conectado</p>
      <p className="text-sm text-muted-foreground">
        Acesse Configurações → WhatsApp para conectar
      </p>
    </div>;
  const MessagesView = () => <div className="flex-1 overflow-hidden min-h-0 flex flex-col bg-card">
      <ScrollArea className="flex-1">
        <div className="px-4 py-3">
          {loadingMessages ? <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div> : messages?.length === 0 ? <div className="flex flex-col items-center justify-center py-12">
              <MessageCircle className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">Nenhuma mensagem</p>
              <p className="text-xs text-muted-foreground">Envie uma mensagem para começar</p>
            </div> : <div className="flex flex-col gap-2">
              {messages?.map(msg => <ChatMessageBubble key={msg.id} message={msg} isGroup={activeConversation!.is_group} />)}
              <div ref={messagesEndRef} />
            </div>}
        </div>
      </ScrollArea>
    </div>;
  const renderMessageInput = (mobile = false) => (
    <div className={cn("p-3 border-t shrink-0 bg-card", mobile && "pb-6")}>
      <div className="flex items-center gap-2">
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" />
        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => fileInputRef.current?.click()}>
          <Paperclip className="h-5 w-5" />
        </Button>
        <Input 
          ref={messageInputRef}
          placeholder="Digite sua mensagem..." 
          value={messageText} 
          onChange={(e) => setMessageText(e.target.value)} 
          onKeyDown={handleKeyPress} 
          className={cn("flex-1", mobile ? "h-11" : "h-10")}
          autoComplete="off"
        />
        <Button size="icon" className={cn(mobile ? "h-10 w-10" : "h-10 w-10")} onClick={handleSendMessage} disabled={!messageText.trim() || sendMessage.isPending}>
          {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
  const ConversationFilters = () => <div className="p-4 space-y-3 border-b shrink-0 bg-card">
      {connectedSessions.length > 1 && <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Selecione canal" />
          </SelectTrigger>
          <SelectContent>
            {connectedSessions.map(session => <SelectItem key={session.id} value={session.id}>
                {session.instance_name}
              </SelectItem>)}
          </SelectContent>
        </Select>}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar conversas..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-9" />
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
        <Checkbox checked={hideGroups} onCheckedChange={checked => setHideGroups(checked === true)} />
        <span>Ocultar grupos</span>
      </label>
    </div>;
  const ConversationList = () => <div className="flex-1 overflow-hidden min-h-0 w-full max-w-full overflow-x-hidden bg-card">
      <ScrollArea className="h-full w-full max-w-full">
        <div className="flex flex-col w-full max-w-full">
          {loadingConversations || loadingSessions ? <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div> : filteredConversations?.length === 0 ? <div className="flex flex-col items-center justify-center py-12 px-4">
              <MessageCircle className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">Nenhuma conversa</p>
            </div> : filteredConversations?.map(conv => <div key={conv.id} className="flex items-start gap-3 px-4 py-3.5 cursor-pointer hover:bg-accent hover:shadow-sm transition-all duration-200 border-b border-border active:bg-accent w-full max-w-full overflow-hidden box-border" onClick={() => openConversation(conv)}>
                <Avatar className="h-12 w-12 shrink-0 ring-2 ring-background shadow-sm">
                  <AvatarImage src={conv.contact_picture || undefined} />
                  <AvatarFallback className="text-sm bg-primary/10 text-primary">
                    {conv.is_group ? <Users className="w-5 h-5" /> : conv.contact_name?.[0] || conv.contact_phone?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 overflow-hidden" style={{
            maxWidth: 'calc(100% - 60px)'
          }}>
                  <div className="flex items-center justify-between gap-2 w-full overflow-hidden">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                      <p className="font-medium text-sm truncate min-w-0" style={{
                  maxWidth: '220px'
                }}>
                        {conv.contact_name || conv.contact_phone}
                      </p>
                      {conv.is_group && <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">
                          Grupo
                        </Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {formatConversationTime(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1 w-full overflow-hidden">
                    <p className="text-xs text-muted-foreground truncate flex-1 min-w-0" style={{
                maxWidth: '240px'
              }}>
                      {conv.last_message || "Sem mensagens"}
                    </p>
                    {conv.unread_count > 0 && <Badge className="h-5 min-w-5 flex items-center justify-center p-0 text-[10px] shrink-0">
                        {conv.unread_count}
                      </Badge>}
                  </div>
                  {/* Tags do lead */}
                  {conv.lead?.tags && conv.lead.tags.length > 0 && <div className="flex items-center gap-1 mt-1">
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-medium truncate max-w-[100px]" style={{
                backgroundColor: `${conv.lead.tags[0].tag.color}20`,
                color: conv.lead.tags[0].tag.color,
                borderColor: conv.lead.tags[0].tag.color
              }}>
                        {conv.lead.tags[0].tag.name}
                      </Badge>
                      {conv.lead.tags.length > 1 && <span className="text-[9px] text-muted-foreground">
                          +{conv.lead.tags.length - 1}
                        </span>}
                    </div>}
                </div>
              </div>)}
        </div>
      </ScrollArea>
    </div>;

  // Mobile version - use Drawer with balloon effect
  if (isMobile) {
    return (
      <>
        <SessionSelectorDialog />
        <Drawer open={isOpen} onOpenChange={open => !open && closeChat()}>
          <DrawerContent showHandle={false} className="bg-card border-none shadow-none p-1.5 max-w-full overflow-hidden">
            {/* Hidden title for accessibility */}
            <DrawerTitle className="sr-only">WhatsApp Chat</DrawerTitle>
            
            {/* Inner wrapper for balloon effect */}
            <div className={cn("flex flex-col", "h-[88vh]", "w-full", "max-w-full", "bg-card", "rounded-2xl", "shadow-2xl", "overflow-hidden", "border", "animate-drawer-slide-up")}>
              {/* Custom handle */}
              <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-muted-foreground/30 shrink-0" />
              
              {/* Header */}
              <ChatHeader mobile />

              {/* Content */}
              <div className="flex-1 flex flex-col overflow-hidden min-h-0 w-full max-w-full">
                {!hasConnectedSession ? <DisconnectedState /> : activeConversation ? (
                  <>
                    <MessagesView />
                    {renderMessageInput(true)}
                  </>
                ) : (
                  <>
                    <ConversationFilters />
                    <ConversationList />
                  </>
                )}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop version - floating window
  return (
    <>
      <SessionSelectorDialog />
      <div className={cn("fixed bottom-4 right-4 z-50", "bg-card", "border border-border", "rounded-2xl", "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]", "ring-1 ring-border", "transition-all duration-300 ease-out", "flex flex-col overflow-hidden", "animate-scale-in", isMinimized ? "w-80 h-14" : "w-[420px] h-[600px]")}>
        {/* Header */}
        <ChatHeader />

        {!isMinimized && (
          <>
            {!hasConnectedSession ? <DisconnectedState /> : activeConversation ? (
              <>
                <MessagesView />
                {renderMessageInput(false)}
              </>
            ) : (
              <>
                <ConversationFilters />
                <ConversationList />
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
function ChatMessageBubble({
  message,
  isGroup
}: {
  message: WhatsAppMessage;
  isGroup: boolean;
}) {
  const isFromMe = message.from_me;

  // Check if URL is a temporary WhatsApp URL that won't work in browser
  const isWhatsAppTempUrl = (url: string | null) => {
    if (!url) return false;
    return url.includes('mmg.whatsapp.net') || url.includes('.enc') || url.includes('pps.whatsapp.net');
  };
  const isValidMediaUrl = (url: string | null) => {
    if (!url) return false;
    return url.startsWith('https://') && !isWhatsAppTempUrl(url);
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <Check className="h-3 w-3" />;
      case "delivered":
        return <CheckCheck className="h-3 w-3" />;
      case "read":
      case "played":
        return <CheckCheck className="h-3 w-3 text-blue-400" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };
  const renderContent = () => {
    switch (message.message_type) {
      case "image":
        return <div>
            {isValidMediaUrl(message.media_url) ? <a href={message.media_url} target="_blank" rel="noopener noreferrer">
                <img src={message.media_url!} alt="Imagem" className="max-w-full rounded mb-1 cursor-pointer hover:opacity-90" />
              </a> : <div className={cn("flex flex-col items-center justify-center gap-2 p-4 rounded-lg min-w-[160px]", isFromMe ? "bg-primary-foreground/10" : "bg-background/50")}>
                <Image className="w-8 h-8 opacity-50" />
                <span className="text-xs opacity-70">Imagem recebida</span>
                <span className="text-[10px] opacity-50">(não disponível)</span>
              </div>}
            {message.content && message.content !== "[Imagem]" && <p className="text-sm">{message.content}</p>}
          </div>;
      case "audio":
        return <div className="flex items-center gap-2">
            {isValidMediaUrl(message.media_url) ? <audio controls className="max-w-[200px]">
                <source src={message.media_url!} type={message.media_mime_type || "audio/ogg"} />
              </audio> : <div className={cn("flex items-center gap-2 px-3 py-2 rounded-full min-w-[150px]", isFromMe ? "bg-primary-foreground/10" : "bg-background/50")}>
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", isFromMe ? "bg-primary-foreground/20" : "bg-muted-foreground/20")}>
                  <Mic className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium">Áudio recebido</span>
                  <span className="text-[10px] opacity-50">(não disponível)</span>
                </div>
              </div>}
          </div>;
      case "video":
        return <div>
            {isValidMediaUrl(message.media_url) ? <video controls className="max-w-full rounded mb-1">
                <source src={message.media_url!} type={message.media_mime_type || "video/mp4"} />
              </video> : <div className={cn("flex flex-col items-center justify-center gap-2 p-4 rounded-lg min-w-[160px]", isFromMe ? "bg-primary-foreground/10" : "bg-background/50")}>
                <Video className="w-8 h-8 opacity-50" />
                <span className="text-xs opacity-70">Vídeo recebido</span>
                <span className="text-[10px] opacity-50">(não disponível)</span>
              </div>}
          </div>;
      case "document":
        return <a href={isValidMediaUrl(message.media_url) ? message.media_url! : "#"} target="_blank" rel="noopener noreferrer" className={cn("flex items-center gap-2", isValidMediaUrl(message.media_url) && "hover:underline")}>
            <FileText className="h-4 w-4" />
            <span className="text-sm">{message.content || "Documento"}</span>
            {!isValidMediaUrl(message.media_url) && <span className="text-[10px] opacity-50">(não disponível)</span>}
          </a>;
      default:
        return <p className="text-sm whitespace-pre-wrap break-words [word-break:break-word]">
            {message.content}
          </p>;
    }
  };
  return <div className={cn("flex w-full", isFromMe ? "justify-end" : "justify-start")}>
      <div className={cn("inline-block rounded-lg px-3 py-1.5", "max-w-[85%] sm:max-w-[75%]", "break-words", isFromMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-chatBubble text-chatBubble-foreground rounded-bl-sm")}>
        {/* Show sender name in group messages */}
        {isGroup && !isFromMe && message.sender_name && <p className="text-xs font-medium text-blue-500 mb-1">
            {message.sender_name}
          </p>}
        
        {renderContent()}
        
        <div className={cn("flex items-center gap-1 mt-0.5", isFromMe ? "justify-end" : "justify-start")}>
          <span className={cn("text-[10px]", isFromMe ? "text-primary-foreground/70" : "text-chatBubble-foreground/70")}>
            {format(new Date(message.sent_at), "HH:mm")}
          </span>
          {isFromMe && <span className="text-primary-foreground/70">
              {getStatusIcon(message.status)}
            </span>}
        </div>
      </div>
    </div>;
}