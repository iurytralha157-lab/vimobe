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
import {
  MessageCircle,
  X,
  Minus,
  Send,
  ArrowLeft,
  Search,
  Loader2,
  Check,
  CheckCheck,
  Clock,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import {
  useWhatsAppConversations,
  useWhatsAppMessages,
  useSendWhatsAppMessage,
  WhatsAppConversation,
  WhatsAppMessage,
} from "@/hooks/use-whatsapp";
import { useWhatsAppSessions } from "@/hooks/use-whatsapp-sessions";
import { useIsMobile } from "@/hooks/use-mobile";

export function FloatingChat() {
  const { state, closeChat, minimizeChat, maximizeChat, openConversation, clearActiveConversation } =
    useFloatingChat();
  const { isOpen, isMinimized, activeConversation } = state;
  const isMobile = useIsMobile();

  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [messageText, setMessageText] = useState("");
  const [hideGroups, setHideGroups] = useState(() => {
    return localStorage.getItem("whatsapp-hide-groups-floating") === "true";
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: sessions, isLoading: loadingSessions } = useWhatsAppSessions();
  const { data: conversations, isLoading: loadingConversations } = useWhatsAppConversations();
  const { data: messages, isLoading: loadingMessages } = useWhatsAppMessages(activeConversation?.id || null);
  const sendMessage = useSendWhatsAppMessage();

  // Save hide groups preference
  useEffect(() => {
    localStorage.setItem("whatsapp-hide-groups-floating", String(hideGroups));
  }, [hideGroups]);

  // Auto-select first connected session
  useEffect(() => {
    if (!selectedSessionId && sessions?.length) {
      const connectedSession = sessions.find((s) => s.status === "connected");
      if (connectedSession) {
        setSelectedSessionId(connectedSession.id);
      } else if (sessions[0]) {
        setSelectedSessionId(sessions[0].id);
      }
    }
  }, [sessions, selectedSessionId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredConversations = conversations
    ?.filter((conv) => {
      if (hideGroups && conv.is_group) return false;
      if (selectedSessionId && conv.session_id !== selectedSessionId) return false;
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return conv.contact_name?.toLowerCase().includes(search) || conv.contact_phone?.includes(search);
    })
    .slice(0, 50);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeConversation) return;

    await sendMessage.mutateAsync({
      conversationId: activeConversation.id,
      content: messageText.trim(),
    });
    setMessageText("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (date: string | null) => {
    if (!date) return "";
    const d = new Date(date);
    return format(d, "HH:mm");
  };

  const formatConversationDate = (date: string | null) => {
    if (!date) return "";
    const d = new Date(date);
    if (isToday(d)) return format(d, "HH:mm");
    if (isYesterday(d)) return "Ontem";
    return format(d, "dd/MM");
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "read":
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case "delivered":
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case "sent":
        return <Check className="h-3 w-3 text-muted-foreground" />;
      default:
        return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  if (!isOpen) return null;

  // Minimized state
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={maximizeChat}
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  const chatContent = (
    <div className={cn("flex flex-col bg-background", isMobile ? "h-full" : "h-[600px] w-[400px]")}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          {activeConversation && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={clearActiveConversation}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <MessageCircle className="h-5 w-5" />
          <span className="font-medium">
            {activeConversation ? activeConversation.contact_name || activeConversation.contact_phone : "WhatsApp"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={minimizeChat}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={closeChat}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {activeConversation ? (
        // Messages view
        <>
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-2">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nenhuma mensagem</div>
              ) : (
                messages?.map((msg) => (
                  <div key={msg.id} className={cn("flex", msg.from_me ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                        msg.from_me ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <div
                        className={cn(
                          "flex items-center justify-end gap-1 mt-1 text-[10px]",
                          msg.from_me ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}
                      >
                        <span>{formatMessageTime(msg.sent_at)}</span>
                        {msg.from_me && getStatusIcon(msg.status)}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Digite uma mensagem..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyPress}
                className="flex-1"
              />
              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={!messageText.trim() || sendMessage.isPending}
              >
                {sendMessage.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </>
      ) : (
        // Conversations list
        <>
          {/* Session selector */}
          {sessions && sessions.length > 1 && (
            <div className="p-2 border-b">
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione a sessão" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full",
                            session.status === "connected" ? "bg-green-500" : "bg-muted-foreground"
                          )}
                        />
                        Sessão {session.id.slice(0, 8)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Search and filters */}
          <div className="p-2 space-y-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="hideGroups" checked={hideGroups} onCheckedChange={(c) => setHideGroups(!!c)} />
              <label htmlFor="hideGroups" className="text-xs text-muted-foreground cursor-pointer">
                Ocultar grupos
              </label>
            </div>
          </div>

          {/* Conversations */}
          <ScrollArea className="flex-1">
            {loadingConversations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConversations?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma conversa encontrada</div>
            ) : (
              <div className="divide-y">
                {filteredConversations?.map((conv) => (
                  <button
                    key={conv.id}
                    className="w-full p-3 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left"
                    onClick={() => openConversation(conv)}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      {conv.contact_picture ? (
                        <AvatarImage src={conv.contact_picture} />
                      ) : null}
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate text-sm">
                          {conv.contact_name || conv.contact_phone}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatConversationDate(conv.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground truncate">{conv.last_message}</p>
                        {conv.unread_count && conv.unread_count > 0 && (
                          <Badge className="h-5 min-w-5 px-1 text-[10px] shrink-0">{conv.unread_count}</Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && closeChat()}>
        <DrawerContent className="h-[85vh]">
          <DrawerTitle className="sr-only">WhatsApp Chat</DrawerTitle>
          {chatContent}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg shadow-2xl border overflow-hidden">
      {chatContent}
    </div>
  );
}
