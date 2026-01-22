import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { Search, Send, Phone, MessageSquare, User, Loader2, MoreVertical, Archive, Trash2, Users, Paperclip, Tag, UserPlus, ArrowLeft } from "lucide-react";
import { MessageBubble } from "@/components/whatsapp/MessageBubble";
import { CreateLeadDialog } from "@/components/conversations/CreateLeadDialog";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { useWhatsAppConversations, useWhatsAppMessages, useSendWhatsAppMessage, useMarkConversationAsRead, useWhatsAppRealtimeConversations, useArchiveConversation, useDeleteConversation, WhatsAppConversation } from "@/hooks/use-whatsapp-conversations";
import { useWhatsAppSessions } from "@/hooks/use-whatsapp-sessions";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatPhoneForDisplay } from "@/lib/phone-utils";
import { useTags, Tag as TagType } from "@/hooks/use-tags";
import { useAddLeadTag, useRemoveLeadTag } from "@/hooks/use-leads";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Conversations() {
  const isMobile = useIsMobile();
  const [selectedSessionId, setSelectedSessionId] = useState<string>("all");
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [messageText, setMessageText] = useState("");
  const [hideGroups, setHideGroups] = useState(() => {
    return localStorage.getItem("whatsapp-hide-groups") === "true";
  });
  const [showArchived, setShowArchived] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    data: sessions
  } = useWhatsAppSessions();
  const {
    data: conversations,
    isLoading: loadingConversations
  } = useWhatsAppConversations(selectedSessionId === "all" ? undefined : selectedSessionId, {
    hideGroups,
    showArchived
  });
  const {
    data: messages,
    isLoading: loadingMessages
  } = useWhatsAppMessages(selectedConversation?.id || null);
  const sendMessage = useSendWhatsAppMessage();
  const markAsRead = useMarkConversationAsRead();
  const archiveConversation = useArchiveConversation();
  const deleteConversation = useDeleteConversation();
  const {
    data: availableTags
  } = useTags();
  const addLeadTag = useAddLeadTag();
  const removeLeadTag = useRemoveLeadTag();
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [createLeadContact, setCreateLeadContact] = useState<{
    phone?: string;
    name?: string;
  }>({});
  useWhatsAppRealtimeConversations();

  // Save hide groups preference
  useEffect(() => {
    localStorage.setItem("whatsapp-hide-groups", String(hideGroups));
  }, [hideGroups]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages]);
  useEffect(() => {
    if (selectedConversation && selectedConversation.unread_count > 0) {
      markAsRead.mutate({
        id: selectedConversation.id,
        session_id: selectedConversation.session_id,
        remote_jid: selectedConversation.remote_jid,
        is_group: selectedConversation.is_group
      });
    }
  }, [selectedConversation?.id]);
  const filteredConversations = conversations?.filter(conv => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return conv.contact_name?.toLowerCase().includes(search) || conv.contact_phone?.includes(search);
  });
  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return;
    await sendMessage.mutateAsync({
      conversation: selectedConversation,
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
    if (!file || !selectedConversation) return;
    try {
      // Convert file to base64 for Evolution API
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data:mime;base64, prefix
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Content = await base64Promise;

      // Also upload to Supabase Storage for local storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;
      const {
        error: uploadError
      } = await supabase.storage.from("whatsapp-media").upload(filePath, file);
      if (uploadError) {
        console.error("Storage upload error:", uploadError);
      }
      const {
        data: urlData
      } = supabase.storage.from("whatsapp-media").getPublicUrl(filePath);

      // Determine media type
      let mediaType = "document";
      if (file.type.startsWith("image/")) mediaType = "image";else if (file.type.startsWith("video/")) mediaType = "video";else if (file.type.startsWith("audio/")) mediaType = "audio";

      // Send message with media (base64 for Evolution, URL for display)
      await sendMessage.mutateAsync({
        conversation: selectedConversation,
        text: file.name,
        mediaUrl: urlData.publicUrl,
        mediaType,
        base64: base64Content,
        mimetype: file.type,
        filename: file.name
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
  const handleArchive = (conv: WhatsAppConversation) => {
    archiveConversation.mutate({
      conversationId: conv.id,
      archive: !conv.archived_at
    });
    if (selectedConversation?.id === conv.id) {
      setSelectedConversation(null);
    }
  };
  const handleDelete = (conv: WhatsAppConversation) => {
    deleteConversation.mutate(conv.id);
    if (selectedConversation?.id === conv.id) {
      setSelectedConversation(null);
    }
  };
  const formatConversationTime = (date: string | null) => {
    if (!date) return "";
    const d = new Date(date);
    if (isToday(d)) return format(d, "HH:mm");
    if (isYesterday(d)) return "Ontem";
    return format(d, "dd/MM");
  };
  const retryMediaDownload = async (messageId: string) => {
    try {
      await supabase.functions.invoke("media-worker", {
        body: {
          message_id: messageId,
          force: true
        }
      });
      toast({
        title: "Tentando novamente",
        description: "Aguarde enquanto baixamos a mídia..."
      });
    } catch (error) {
      console.error("Error retrying media download:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível tentar novamente"
      });
    }
  };
  const handleBackToList = () => {
    setSelectedConversation(null);
  };

  // Mobile: Show either conversation list OR chat (not both)
  if (isMobile) {
    return <AppLayout title="Conversas">
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
          {selectedConversation ?
        // Mobile Chat View
        <div className="flex flex-col h-full">
              {/* Mobile Chat Header */}
              <header className="h-14 px-3 border-b flex items-center justify-between bg-card shrink-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={handleBackToList}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={selectedConversation.contact_picture || undefined} />
                    <AvatarFallback className="text-sm bg-muted text-muted-foreground">
                      {selectedConversation.is_group ? <Users className="w-4 h-4" /> : (selectedConversation.contact_name || selectedConversation.contact_phone)?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate text-foreground">
                      {selectedConversation.lead?.name || (selectedConversation.contact_name && selectedConversation.contact_name !== selectedConversation.contact_phone ? selectedConversation.contact_name : formatPhoneForDisplay(selectedConversation.contact_phone || ""))}
                    </p>
                    {selectedConversation.contact_presence === 'composing' ? <p className="text-xs text-primary animate-pulse">digitando...</p> : selectedConversation.contact_presence === 'recording' ? <p className="text-xs text-primary animate-pulse">🎤 gravando...</p> : null}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {selectedConversation.lead && <Button variant="ghost" size="sm" className="h-8 text-xs px-2" asChild>
                      <Link to={`/crm/pipelines?lead=${selectedConversation.lead.id}`}>
                        <User className="w-3.5 h-3.5" />
                      </Link>
                    </Button>}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuItem onClick={() => handleArchive(selectedConversation)}>
                        <Archive className="w-4 h-4 mr-2" />
                        {selectedConversation.archived_at ? "Desarquivar" : "Arquivar"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDelete(selectedConversation)} className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </header>

              {/* Mobile Messages */}
              <div className="flex-1 overflow-hidden min-h-0">
                <ScrollArea className="h-full">
                  <div className="p-3 space-y-2 bg-secondary min-h-full">
                    {loadingMessages ? <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div> : messages?.length === 0 ? <div className="flex flex-col items-center justify-center py-12">
                        <MessageSquare className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhuma mensagem</p>
                      </div> : messages?.map(msg => <MessageBubble key={msg.id} content={msg.content} messageType={msg.message_type} mediaUrl={msg.media_url} mediaMimeType={msg.media_mime_type} mediaStatus={msg.media_status as 'pending' | 'ready' | 'failed' | null} mediaError={msg.media_error} fromMe={msg.from_me} status={msg.status} sentAt={msg.sent_at} senderName={msg.sender_name} isGroup={selectedConversation.is_group} onRetryMedia={() => retryMediaDownload(msg.id)} />)}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </div>

              {/* Mobile Message Input */}
              <footer className="p-3 border-t bg-card shrink-0">
                <div className="flex items-center gap-2">
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" />
                  <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Input placeholder="Digite sua mensagem..." value={messageText} onChange={e => setMessageText(e.target.value)} onKeyDown={handleKeyPress} className="flex-1 h-10" />
                  <Button onClick={handleSendMessage} disabled={!messageText.trim() || sendMessage.isPending} size="icon" className="h-10 w-10 shrink-0">
                    {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </footer>
            </div> :
        // Mobile Conversation List
        <div className="flex flex-col h-full">
              {/* Mobile Header with Filters */}
              <div className="p-3 border-b space-y-2 bg-card shrink-0">
                <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder="Todos os canais" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">Todos os canais</SelectItem>
                    {sessions?.map(session => <SelectItem key={session.id} value={session.id}>
                        {session.instance_name}
                      </SelectItem>)}
                  </SelectContent>
                </Select>

                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar conversas..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-9 bg-background" />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <Checkbox checked={hideGroups} onCheckedChange={checked => setHideGroups(checked === true)} />
                    <span>Ocultar grupos</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <Checkbox checked={showArchived} onCheckedChange={checked => setShowArchived(checked === true)} />
                    <span>Arquivadas</span>
                  </label>
                </div>
              </div>

              {/* Mobile Conversation List */}
              <ScrollArea className="flex-1">
                <div className="divide-y">
                  {loadingConversations ? <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div> : filteredConversations?.length === 0 ? <div className="flex flex-col items-center justify-center py-12 px-4">
                      <MessageSquare className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhuma conversa</p>
                    </div> : filteredConversations?.map(conv => <ConversationItem key={conv.id} conversation={conv} isSelected={false} onClick={() => setSelectedConversation(conv)} formatTime={formatConversationTime} onArchive={() => handleArchive(conv)} onDelete={() => handleDelete(conv)} availableTags={availableTags || []} onAddTag={tagId => conv.lead && addLeadTag.mutate({
                leadId: conv.lead.id,
                tagId
              })} onRemoveTag={tagId => conv.lead && removeLeadTag.mutate({
                leadId: conv.lead.id,
                tagId
              })} onCreateLead={() => {
                setCreateLeadContact({
                  phone: conv.contact_phone || undefined,
                  name: conv.contact_name || undefined
                });
                setCreateLeadOpen(true);
              }} />)}
                </div>
              </ScrollArea>
            </div>}
        </div>

        <CreateLeadDialog open={createLeadOpen} onOpenChange={setCreateLeadOpen} contactPhone={createLeadContact.phone} contactName={createLeadContact.name} />
      </AppLayout>;
  }

  // Desktop Layout
  return <AppLayout title="Conversas">
      <div className="flex h-[calc(100vh-7rem)] bg-background rounded-lg border overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[350px] min-w-[350px] max-w-[350px] border-r bg-card flex flex-col overflow-hidden">
          {/* Header com filtros */}
          <div className="p-3 border-b space-y-2 bg-card">
            <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue placeholder="Todos os canais" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Todos os canais</SelectItem>
                {sessions?.map(session => <SelectItem key={session.id} value={session.id}>
                    {session.instance_name}
                  </SelectItem>)}
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar conversas..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-9 bg-background" />
            </div>

            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <Checkbox checked={hideGroups} onCheckedChange={checked => setHideGroups(checked === true)} />
                <span>Ocultar grupos</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <Checkbox checked={showArchived} onCheckedChange={checked => setShowArchived(checked === true)} />
                <span>Arquivadas</span>
              </label>
            </div>
          </div>

          {/* Lista de conversas */}
          <ScrollArea className="flex-1">
            <div className="divide-y">
              {loadingConversations ? <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div> : filteredConversations?.length === 0 ? <div className="flex flex-col items-center justify-center py-12 px-4">
                  <MessageSquare className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma conversa</p>
                </div> : filteredConversations?.map(conv => <ConversationItem key={conv.id} conversation={conv} isSelected={selectedConversation?.id === conv.id} onClick={() => setSelectedConversation(conv)} formatTime={formatConversationTime} onArchive={() => handleArchive(conv)} onDelete={() => handleDelete(conv)} availableTags={availableTags || []} onAddTag={tagId => conv.lead && addLeadTag.mutate({
              leadId: conv.lead.id,
              tagId
            })} onRemoveTag={tagId => conv.lead && removeLeadTag.mutate({
              leadId: conv.lead.id,
              tagId
            })} onCreateLead={() => {
              setCreateLeadContact({
                phone: conv.contact_phone || undefined,
                name: conv.contact_name || undefined
              });
              setCreateLeadOpen(true);
            }} />)}
            </div>
          </ScrollArea>
        </aside>

        {/* Chat Area */}
        <main className="flex-1 flex flex-col bg-background min-w-0">
          {selectedConversation ? <>
              {/* Header do chat */}
              <header className="h-14 px-4 border-b flex items-center justify-between bg-card shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={selectedConversation.contact_picture || undefined} />
                    <AvatarFallback className="text-sm bg-muted text-muted-foreground">
                      {selectedConversation.is_group ? <Users className="w-4 h-4" /> : (selectedConversation.contact_name || selectedConversation.contact_phone)?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate text-foreground">
                        {selectedConversation.lead?.name || (selectedConversation.contact_name && selectedConversation.contact_name !== selectedConversation.contact_phone ? selectedConversation.contact_name : formatPhoneForDisplay(selectedConversation.contact_phone || ""))}
                      </p>
                      {selectedConversation.is_group && <Badge variant="secondary" className="text-[10px] h-4">
                          Grupo
                        </Badge>}
                    </div>
                    {selectedConversation.contact_presence === 'composing' ? <p className="text-xs text-primary animate-pulse">digitando...</p> : selectedConversation.contact_presence === 'recording' ? <p className="text-xs text-primary animate-pulse">🎤 gravando áudio...</p> : (selectedConversation.lead?.name || selectedConversation.contact_name) && (selectedConversation.lead?.name || selectedConversation.contact_name) !== selectedConversation.contact_phone ? <p className="text-xs text-muted-foreground truncate">
                        {formatPhoneForDisplay(selectedConversation.contact_phone || "")}
                      </p> : null}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {selectedConversation.lead && <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
                      <Link to={`/crm/pipelines?lead=${selectedConversation.lead.id}`}>
                        <User className="w-3.5 h-3.5 mr-1" />
                        Ver Lead
                      </Link>
                    </Button>}
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuItem onClick={() => handleArchive(selectedConversation)}>
                        <Archive className="w-4 h-4 mr-2" />
                        {selectedConversation.archived_at ? "Desarquivar" : "Arquivar"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDelete(selectedConversation)} className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </header>

              {/* Mensagens */}
              <div className="flex-1 overflow-hidden min-h-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-2 bg-secondary">
                    {loadingMessages ? <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div> : messages?.length === 0 ? <div className="flex flex-col items-center justify-center py-12">
                        <MessageSquare className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhuma mensagem</p>
                      </div> : messages?.map(msg => <MessageBubble key={msg.id} content={msg.content} messageType={msg.message_type} mediaUrl={msg.media_url} mediaMimeType={msg.media_mime_type} mediaStatus={msg.media_status as 'pending' | 'ready' | 'failed' | null} mediaError={msg.media_error} fromMe={msg.from_me} status={msg.status} sentAt={msg.sent_at} senderName={msg.sender_name} isGroup={selectedConversation.is_group} onRetryMedia={() => retryMediaDownload(msg.id)} />)}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </div>

              {/* Input de mensagem */}
              <footer className="p-3 border-t bg-card shrink-0">
                <div className="flex items-center gap-2">
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" />
                  <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Input placeholder="Digite sua mensagem..." value={messageText} onChange={e => setMessageText(e.target.value)} onKeyDown={handleKeyPress} className="flex-1 h-10" />
                  <Button onClick={handleSendMessage} disabled={!messageText.trim() || sendMessage.isPending} size="icon" className="h-10 w-10 shrink-0">
                    {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </footer>
            </> : <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-primary-foreground">
              <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
              <p className="font-medium">Selecione uma conversa</p>
              <p className="text-sm">para começar a enviar mensagens</p>
            </div>}
        </main>
      </div>

      <CreateLeadDialog open={createLeadOpen} onOpenChange={setCreateLeadOpen} contactPhone={createLeadContact.phone} contactName={createLeadContact.name} />
    </AppLayout>;
}
function ConversationItem({
  conversation,
  isSelected,
  onClick,
  formatTime,
  onArchive,
  onDelete,
  availableTags,
  onAddTag,
  onRemoveTag,
  onCreateLead
}: {
  conversation: WhatsAppConversation;
  isSelected: boolean;
  onClick: () => void;
  formatTime: (date: string | null) => string;
  onArchive: () => void;
  onDelete: () => void;
  availableTags: TagType[];
  onAddTag: (tagId: string) => void;
  onRemoveTag: (tagId: string) => void;
  onCreateLead: () => void;
}) {
  const leadTags = conversation.lead?.tags || [];
  const leadTagIds = leadTags.map(lt => lt.tag.id);
  const unassignedTags = availableTags.filter(t => !leadTagIds.includes(t.id));
  return <div className={cn("w-full text-left p-2.5 flex items-center gap-2.5 hover:bg-muted/50 transition-colors group", isSelected && "bg-muted")}>
      <button type="button" onClick={onClick} className="flex items-center gap-2.5 flex-1 min-w-0">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={conversation.contact_picture || undefined} />
          <AvatarFallback className="text-xs bg-muted text-muted-foreground">
            {conversation.is_group ? <Users className="w-4 h-4" /> : (conversation.contact_name || conversation.contact_phone)?.[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <span className="truncate font-sans font-semibold text-xs text-foreground">
                {conversation.lead?.name || (conversation.contact_name && conversation.contact_name !== conversation.contact_phone ? conversation.contact_name : formatPhoneForDisplay(conversation.contact_phone || ""))}
              </span>
              {conversation.is_group && <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">
                  Grupo
                </Badge>}
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
              {formatTime(conversation.last_message_at)}
            </span>
          </div>
          
          {/* Mensagem ou Presença */}
          <div className="flex items-center justify-between mt-0.5">
            {conversation.contact_presence === 'composing' ? <span className="text-[11px] text-primary truncate flex-1 text-left animate-pulse">
                digitando...
              </span> : conversation.contact_presence === 'recording' ? <span className="text-[11px] text-primary truncate flex-1 text-left animate-pulse">
                🎤 gravando áudio...
              </span> : <span className="text-[11px] text-muted-foreground truncate flex-1 text-left">
                {conversation.last_message || "Sem mensagens"}
              </span>}
            {conversation.unread_count > 0 && <Badge className="h-5 min-w-5 px-1.5 text-[10px] ml-2">
                {conversation.unread_count}
              </Badge>}
          </div>
          
          {/* Tags abaixo da mensagem */}
          {leadTags.length > 0 && <div className="flex items-center gap-1 mt-0.5">
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-medium" style={{
            backgroundColor: `${leadTags[0].tag.color}20`,
            color: leadTags[0].tag.color,
            borderColor: leadTags[0].tag.color
          }}>
                {leadTags[0].tag.name}
              </Badge>
              {leadTags.length > 1 && <span className="text-[9px] text-muted-foreground">
                  +{leadTags.length - 1}
                </span>}
            </div>}
        </div>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreVertical className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover">
          {/* Tag submenu - only show if conversation has a lead */}
          {conversation.lead && <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Tag className="w-4 h-4 mr-2" />
                Tag
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-popover">
                {leadTags.length > 0 && <>
                    <div className="px-2 py-1 text-xs text-muted-foreground font-medium">Tags atuais</div>
                    {leadTags.map(lt => <DropdownMenuItem key={lt.tag.id} onClick={() => onRemoveTag(lt.tag.id)} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{
                  backgroundColor: lt.tag.color
                }} />
                        <span>{lt.tag.name}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">remover</span>
                      </DropdownMenuItem>)}
                    <DropdownMenuSeparator />
                  </>}
                {unassignedTags.length > 0 ? <>
                    <div className="px-2 py-1 text-xs text-muted-foreground font-medium">Adicionar tag</div>
                    {unassignedTags.map(tag => <DropdownMenuItem key={tag.id} onClick={() => onAddTag(tag.id)} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{
                  backgroundColor: tag.color
                }} />
                        <span>{tag.name}</span>
                      </DropdownMenuItem>)}
                  </> : <div className="px-2 py-1 text-xs text-muted-foreground">
                    Nenhuma tag disponível
                  </div>}
              </DropdownMenuSubContent>
            </DropdownMenuSub>}
          {/* Create Lead option - only show if no lead associated */}
          {!conversation.lead && <DropdownMenuItem onClick={onCreateLead}>
              <UserPlus className="w-4 h-4 mr-2" />
              Criar Lead
            </DropdownMenuItem>}
          <DropdownMenuItem onClick={onArchive}>
            <Archive className="w-4 h-4 mr-2" />
            {conversation.archived_at ? "Desarquivar" : "Arquivar"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Remover
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>;
}