import { useState, useEffect, useRef, useMemo } from "react";
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
import { MessageCircle, X, Minus, Send, ArrowLeft, Search, Loader2, Check, CheckCheck, Clock, Video, FileText, User, Phone, Users, Paperclip, Image, Mic, ExternalLink, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { useWhatsAppConversations, useWhatsAppMessages, useSendWhatsAppMessage, useMarkConversationAsRead, useWhatsAppRealtimeConversations, WhatsAppConversation, WhatsAppMessage } from "@/hooks/use-whatsapp-conversations";
import { useAccessibleSessions } from "@/hooks/use-accessible-sessions";
import { WhatsAppSession } from "@/hooks/use-whatsapp-sessions";
import { useStartConversation, useFindConversationByPhone } from "@/hooks/use-start-conversation";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHasWhatsAppAccess } from "@/hooks/use-whatsapp-access";
import { DateSeparator, shouldShowDateSeparator } from "@/components/whatsapp/DateSeparator";
import { AudioRecorderButton } from "@/components/whatsapp/AudioRecorderButton";
import { useNavigate } from "react-router-dom";
import { formatPhoneForDisplay } from "@/lib/phone-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

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
 const previousMessagesLengthRef = useRef<number>(0);
 const isUserScrollingRef = useRef<boolean>(false);
  const {
    data: sessions,
    isLoading: loadingSessions
  } = useAccessibleSessions();
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
  const { data: hasWhatsAppAccess, isLoading: loadingWhatsAppAccess } = useHasWhatsAppAccess();
  const navigate = useNavigate();

  // Enable realtime
  useWhatsAppRealtimeConversations();

 // Track user scrolling to avoid auto-scroll interference
 const handleScrollArea = (e: React.UIEvent<HTMLDivElement>) => {
   const target = e.currentTarget;
   const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 50;
   isUserScrollingRef.current = !isAtBottom;
 };

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

  // Scroll to bottom only when new messages arrive
  useEffect(() => {
    const currentLength = messages?.length || 0;
    const previousLength = previousMessagesLengthRef.current;
    
    // Only auto-scroll if new messages arrived and user is not scrolling up
    if (currentLength > previousLength || previousLength === 0) {
      if (!isUserScrollingRef.current) {
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({
            behavior: previousLength === 0 ? "instant" : "smooth"
          });
        });
      }
    }
    
    previousMessagesLengthRef.current = currentLength;
  }, [messages?.length]);

  // Reset scroll state when changing conversations
  useEffect(() => {
    previousMessagesLengthRef.current = 0;
    isUserScrollingRef.current = false;
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    });
  }, [activeConversation?.id]);

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
  // Memoize filtered conversations to prevent re-renders that cause input focus loss
  const filteredConversations = useMemo(() => {
    return conversations?.filter(conv => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return conv.contact_name?.toLowerCase().includes(search) || conv.contact_phone?.includes(search);
  });
  }, [conversations, searchTerm]);

  const handleViewLead = (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    closeChat();
    navigate(`/crm/pipelines?lead=${leadId}`);
  };

  const handleSendMessage = async () => {
    const textToSend = messageText.trim();
    if (!textToSend || !activeConversation) return;

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
    
    // Limpa o campo IMEDIATAMENTE (UX otimista)
    setMessageText("");
    
    await sendMessage.mutateAsync({
      conversation: activeConversation,
      text: textToSend
    });
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendAudio = async (base64: string, mimetype: string) => {
    if (!activeConversation) return;
    
    await sendMessage.mutateAsync({
      conversation: activeConversation,
      text: "",
      mediaType: "audio",
      base64,
      mimetype,
      filename: "audio.ogg"
    });
    
    toast({
      title: "Áudio enviado",
      description: "Sua mensagem de voz foi enviada"
    });
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

  // Não renderizar se não tem acesso ao WhatsApp ou não está aberto
  if (!isOpen || (!loadingWhatsAppAccess && !hasWhatsAppAccess)) return null;

  // Shared content components
  const FloatingChatHeader = ({
    mobile = false
  }: {
    mobile?: boolean;
  }) => {
    // Header padrão quando não há conversa ativa (lista de conversas)
    if (!activeConversation) {
      return (
        <div className={cn(
          "flex items-center justify-between shrink-0",
          mobile 
            ? "px-4 py-3 bg-card border-b border-border" 
            : "h-16 bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground px-5 shadow-sm"
        )}>
          <div className="flex items-center gap-2">
            <MessageCircle className={cn("h-5 w-5", mobile && "text-primary")} />
            <span className={cn("font-medium", mobile ? "text-base" : "")}>WhatsApp</span>
            {!isMinimized && unreadCount > 0 && (
              <Badge variant="secondary" className="h-5 min-w-5 flex items-center justify-center text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!mobile && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20" 
                onClick={isMinimized ? maximizeChat : minimizeChat}
              >
                <Minus className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "h-8 w-8", 
                mobile ? "hover:bg-muted" : "text-primary-foreground hover:bg-primary-foreground/20"
              )} 
              onClick={closeChat}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    // Header compacto e organizado para o FloatingChat
    const displayName = activeConversation.lead?.name || 
      (activeConversation.contact_name && activeConversation.contact_name !== activeConversation.contact_phone 
        ? activeConversation.contact_name 
        : formatPhoneForDisplay(activeConversation.contact_phone || ""));
    
    const phone = formatPhoneForDisplay(activeConversation.contact_phone || "");
    const leadId = activeConversation.lead?.id;
    const tags = activeConversation.lead?.tags || [];
    const pipelineName = activeConversation.lead?.pipeline?.name;
    const stageName = activeConversation.lead?.stage?.name;
    const stageColor = activeConversation.lead?.stage?.color;
    const visibleTags = tags.slice(0, 2);
    const remainingTags = tags.slice(2);

    const handleViewLeadClick = () => {
      if (leadId) {
        closeChat();
        navigate(`/crm/pipelines?lead=${leadId}`);
      }
    };

    return (
      <TooltipProvider>
        <div className="border-b bg-card shrink-0">
          {/* Linha 1: Navegação e info principal */}
          <div className="flex items-center gap-2 px-3 py-2">
            {/* Botão Voltar */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 shrink-0" 
              onClick={clearActiveConversation}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            {/* Avatar */}
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={activeConversation.contact_picture || undefined} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {activeConversation.is_group ? (
                  <Users className="h-4 w-4" />
                ) : (
                  displayName?.[0]?.toUpperCase() || "?"
                )}
              </AvatarFallback>
            </Avatar>
            
            {/* Nome */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{displayName}</p>
              {activeConversation.lead?.name && activeConversation.contact_phone && (
                <p className="text-xs text-muted-foreground truncate">{phone}</p>
              )}
            </div>
            
            {/* Ações */}
            <div className="flex items-center gap-1 shrink-0">
              {leadId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8" 
                      onClick={handleViewLeadClick}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Ver Lead</TooltipContent>
                </Tooltip>
              )}
              {!mobile && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={minimizeChat}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={closeChat}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Linha 2: Tags e Pipeline (se houver) */}
          {(visibleTags.length > 0 || pipelineName) && (
            <div className="flex items-center gap-1.5 px-3 pb-2 flex-wrap">
              {/* Tags */}
              {visibleTags.map((lt) => (
                <Badge
                  key={lt.tag.id}
                  variant="secondary"
                  className="text-[9px] px-1.5 py-0 h-4 font-medium"
                  style={{
                    backgroundColor: `${lt.tag.color}20`,
                    color: lt.tag.color,
                    borderColor: lt.tag.color,
                  }}
                >
                  {lt.tag.name}
                </Badge>
              ))}
              {remainingTags.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1 py-0 h-4 cursor-help"
                    >
                      +{remainingTags.length}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px]">
                    <div className="flex flex-wrap gap-1">
                      {remainingTags.map((lt) => (
                        <Badge
                          key={lt.tag.id}
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 h-4"
                          style={{
                            backgroundColor: `${lt.tag.color}20`,
                            color: lt.tag.color,
                          }}
                        >
                          {lt.tag.name}
                        </Badge>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {/* Separador */}
              {visibleTags.length > 0 && pipelineName && (
                <span className="text-muted-foreground text-[10px]">•</span>
              )}
              
              {/* Pipeline → Stage */}
              {pipelineName && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="truncate max-w-[80px]">{pipelineName}</span>
                  {stageName && (
                    <>
                      <ArrowRight className="w-2.5 h-2.5" />
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 h-4"
                        style={stageColor ? {
                          borderColor: stageColor,
                          color: stageColor,
                        } : undefined}
                      >
                        {stageName}
                      </Badge>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </TooltipProvider>
    );
  };

  const DisconnectedState = () => <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-card">
      <Phone className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground mb-2">Nenhum WhatsApp conectado</p>
      <p className="text-sm text-muted-foreground">
        Acesse Configurações → WhatsApp para conectar
      </p>
    </div>;
  const MessagesView = () => <div className="flex-1 overflow-hidden min-h-0 flex flex-col bg-card">
      <ScrollArea className="flex-1" onScrollCapture={handleScrollArea}>
        <div className="px-4 py-3">
          {loadingMessages ? <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div> : messages?.length === 0 ? <div className="flex flex-col items-center justify-center py-12">
              <MessageCircle className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">Nenhuma mensagem</p>
              <p className="text-xs text-muted-foreground">Envie uma mensagem para começar</p>
            </div> : <div className="flex flex-col gap-2">
              {messages?.map((msg, index) => {
                const previousMsg = index > 0 ? messages[index - 1] : null;
                const showSeparator = shouldShowDateSeparator(msg.sent_at, previousMsg?.sent_at || null);
                return (
                  <div key={msg.id}>
                    {showSeparator && <DateSeparator date={new Date(msg.sent_at)} />}
                    <ChatMessageBubble message={msg} isGroup={activeConversation!.is_group} />
                  </div>
                );
              })}
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
        {messageText.trim() ? (
          <Button size="icon" className="h-10 w-10" onClick={handleSendMessage} disabled={sendMessage.isPending}>
            {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        ) : (
          <AudioRecorderButton 
            onSend={handleSendAudio}
            disabled={sendMessage.isPending}
          />
        )}
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
        <Input 
          placeholder="Buscar conversas..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          className="pl-8 h-9"
          autoComplete="off"
        />
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
            </div> : !filteredConversations || filteredConversations.length === 0 ? <div className="flex flex-col items-center justify-center py-12 px-4">
              <MessageCircle className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">Nenhuma conversa</p>
            </div> : filteredConversations.map(conv => <div key={conv.id} className="group flex items-start gap-3 px-4 py-3.5 cursor-pointer hover:bg-accent hover:shadow-sm transition-all duration-200 border-b border-border active:bg-accent w-full max-w-full overflow-hidden box-border relative" onClick={() => openConversation(conv)}>
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
                    <div className="flex items-center gap-1.5 shrink-0">
                      {conv.lead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleViewLead(conv.lead!.id, e)}
                          title="Ver lead no Pipeline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatConversationTime(conv.last_message_at)}
                      </span>
                    </div>
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
                  {conv.lead?.tags && conv.lead.tags.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {conv.lead.tags.slice(0, 2).map((lt, idx) => (
                        <Badge 
                          key={idx}
                          variant="secondary" 
                          className="text-[9px] px-1.5 py-0 h-4 font-medium truncate max-w-[80px]" 
                          style={{
                            backgroundColor: `${lt.tag.color}20`,
                            color: lt.tag.color,
                            borderColor: lt.tag.color
                          }}
                        >
                          {lt.tag.name}
                        </Badge>
                      ))}
                      {conv.lead.tags.length > 2 && (
                        <span className="text-[9px] text-muted-foreground">
                          +{conv.lead.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
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
              <FloatingChatHeader mobile />

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
        <FloatingChatHeader />

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