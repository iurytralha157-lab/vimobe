import { useLeadMessages, LeadMessage } from '@/hooks/use-lead-messages';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Image, FileText, Mic, Video, Loader2, User, LogIn } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface LeadMessagesTabProps {
  leadId: string;
  leadName: string;
}

function DateSeparator({ date }: { date: Date }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[11px] text-muted-foreground font-medium px-2">
        {format(date, "dd 'de' MMMM, yyyy", { locale: ptBR })}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function SessionJoinedBanner({ userName, time }: { userName: string; time: string }) {
  return (
    <div className="flex items-center justify-center gap-2 my-3">
      <div className="flex items-center gap-1.5 bg-accent/50 text-accent-foreground/70 rounded-full px-3 py-1 text-[11px]">
        <LogIn className="h-3 w-3" />
        <span className="font-medium">{userName}</span>
        <span>entrou na conversa</span>
        <span className="text-[10px] opacity-60">· {format(new Date(time), 'HH:mm')}</span>
      </div>
    </div>
  );
}

function MessageTypeIcon({ type }: { type: string | null }) {
  switch (type) {
    case 'image': return <Image className="h-3 w-3" />;
    case 'video': return <Video className="h-3 w-3" />;
    case 'audio': return <Mic className="h-3 w-3" />;
    case 'document': return <FileText className="h-3 w-3" />;
    default: return null;
  }
}

function getSenderDisplay(msg: LeadMessage): string {
  if (msg.from_me) {
    // If sender_name is set (e.g., "Automação", or the user's name typed in Evolution)
    if (msg.sender_name) return msg.sender_name;
    // Fallback to session owner name
    if (msg.session_owner_name) return msg.session_owner_name;
    return 'Enviada';
  }
  return '';
}

function MessageBubble({ msg, leadName }: { msg: LeadMessage; leadName: string }) {
  const isMedia = msg.message_type && msg.message_type !== 'text';
  const senderLabel = msg.from_me ? getSenderDisplay(msg) : leadName;

  return (
    <div className={cn("flex mb-2", msg.from_me ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[80%] rounded-xl px-3 py-2 text-sm",
        msg.from_me
          ? "bg-primary text-primary-foreground rounded-br-sm"
          : "bg-muted text-foreground rounded-bl-sm"
      )}>
        {/* Sender label */}
        <div className={cn(
          "text-[10px] font-semibold mb-0.5 flex items-center gap-1",
          msg.from_me ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          <User className="h-2.5 w-2.5" />
          {senderLabel}
          {msg.session_instance_name && msg.from_me && (
            <span className="opacity-50">· {msg.session_instance_name}</span>
          )}
        </div>

        {/* Media preview */}
        {isMedia && msg.media_url && msg.message_type === 'image' && (
          <img
            src={msg.media_url}
            alt="Imagem"
            className="rounded-lg max-h-48 object-cover mb-1 cursor-pointer"
            onClick={() => window.open(msg.media_url!, '_blank')}
          />
        )}

        {isMedia && msg.media_url && msg.message_type === 'video' && (
          <video
            src={msg.media_url}
            controls
            className="rounded-lg max-h-48 w-full mb-1"
            preload="metadata"
          />
        )}

        {isMedia && msg.media_url && msg.message_type === 'audio' && (
          <audio
            src={msg.media_url}
            controls
            className="w-full mb-1 max-w-[250px]"
            preload="metadata"
          />
        )}

        {isMedia && msg.media_url && msg.message_type === 'document' && (
          <div 
            className={cn(
              "flex items-center gap-1.5 mb-1 text-xs cursor-pointer hover:opacity-80",
              msg.from_me ? "text-primary-foreground/80" : "text-muted-foreground"
            )}
            onClick={() => window.open(msg.media_url!, '_blank')}
          >
            <MessageTypeIcon type={msg.message_type} />
            <span className="truncate">{msg.content || 'Documento'}</span>
          </div>
        )}

        {isMedia && (!msg.media_url || !['image', 'video', 'audio', 'document'].includes(msg.message_type || '')) && (
          <div className={cn(
            "flex items-center gap-1.5 mb-1 text-xs",
            msg.from_me ? "text-primary-foreground/80" : "text-muted-foreground"
          )}>
            <MessageTypeIcon type={msg.message_type} />
            <span>{msg.message_type === 'audio' ? 'Áudio' : msg.message_type === 'video' ? 'Vídeo' : msg.message_type === 'sticker' ? 'Sticker' : 'Documento'}</span>
          </div>
        )}

        {/* Text content */}
        {msg.content && msg.content !== '[Imagem]' && msg.content !== '[Áudio]' && msg.content !== '[Gravação]' && msg.content !== '[Vídeo]' && msg.content !== '[Sticker]' && (
          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        )}

        {/* Timestamp */}
        <div className={cn(
          "text-[9px] mt-1 text-right",
          msg.from_me ? "text-primary-foreground/50" : "text-muted-foreground/70"
        )}>
          {format(new Date(msg.sent_at), 'HH:mm')}
        </div>
      </div>
    </div>
  );
}

export function LeadMessagesTab({ leadId, leadName }: LeadMessagesTabProps) {
  const { data: messages = [], isLoading } = useLeadMessages(leadId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
        <MessageCircle className="h-8 w-8" />
        <p className="text-sm">Nenhuma mensagem registrada</p>
        <p className="text-xs">As mensagens WhatsApp aparecerão aqui quando houver conversas vinculadas a este lead.</p>
      </div>
    );
  }

  // Pre-process: detect session changes for "joined conversation" banners
  let lastDate: Date | null = null;
  let lastSessionId: string | null = null;
  // Track which sessions already had their first from_me message
  const sessionsSeen = new Set<string>();

  const elements: React.ReactNode[] = [];

  messages.forEach((msg) => {
    const msgDate = new Date(msg.sent_at);

    // Date separator
    if (!lastDate || !isSameDay(lastDate, msgDate)) {
      elements.push(<DateSeparator key={`date-${msg.id}`} date={msgDate} />);
      lastDate = msgDate;
    }

    // Session join banner: only when from_me and session changes to a new one
    if (msg.from_me && msg.session_id && msg.session_id !== lastSessionId) {
      // Only show banner if this is NOT the first session (i.e., someone new joined)
      if (sessionsSeen.size > 0 && !sessionsSeen.has(msg.session_id)) {
        const joinName = msg.sender_name || msg.session_owner_name || msg.session_instance_name || 'Usuário';
        elements.push(
          <SessionJoinedBanner key={`join-${msg.id}`} userName={joinName} time={msg.sent_at} />
        );
      }
      sessionsSeen.add(msg.session_id);
      lastSessionId = msg.session_id;
    }

    elements.push(
      <MessageBubble key={msg.id} msg={msg} leadName={leadName} />
    );
  });

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-0 px-2 py-3">
        {elements}
      </div>
    </ScrollArea>
  );
}
