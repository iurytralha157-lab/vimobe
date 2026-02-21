import { useFloatingChat } from "@/contexts/FloatingChatContext";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useWhatsAppConversations, useWhatsAppRealtimeConversations } from "@/hooks/use-whatsapp-conversations";
import { useWhatsAppSessions } from "@/hooks/use-whatsapp-sessions";
import { useLocation } from "react-router-dom";
import { useHasWhatsAppAccess } from "@/hooks/use-whatsapp-access";
import { useState, useRef, useCallback } from "react";

export function FloatingChatButton() {
  const { state, toggleChat } = useFloatingChat();
  const { data: sessions } = useWhatsAppSessions();
  const { data: conversations } = useWhatsAppConversations(undefined, { hideGroups: true });
  const location = useLocation();
  const { data: hasWhatsAppAccess, isLoading: loadingWhatsAppAccess } = useHasWhatsAppAccess();
  
  useWhatsAppRealtimeConversations();

  // Draggable state
  const [side, setSide] = useState<'right' | 'left'>('right');
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; moved: boolean }>({ startX: 0, startY: 0, moved: false });

  const hasConnectedSession = sessions?.some((s) => s.status === "connected");
  
  // Contar mensagens não lidas APENAS de conversas vinculadas a leads
  const leadUnreadCount = conversations?.reduce((acc, c) => {
    if (c.lead_id) {
      return acc + (c.unread_count || 0);
    }
    return acc;
  }, 0) || 0;

  const isOnConversationsPage = location.pathname === "/crm/conversas";

  // Touch/mouse handlers for drag
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, moved: false };
    setIsDragging(false);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const dx = Math.abs(e.clientX - dragRef.current.startX);
    const dy = Math.abs(e.clientY - dragRef.current.startY);
    if (dx > 15 || dy > 15) {
      dragRef.current.moved = true;
      setIsDragging(true);
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragRef.current.moved) {
      const screenMid = window.innerWidth / 2;
      setSide(e.clientX < screenMid ? 'left' : 'right');
    }
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!dragRef.current.moved) {
      toggleChat();
    }
    dragRef.current.moved = false;
  }, [toggleChat]);

  if (state.isOpen || !hasConnectedSession || isOnConversationsPage || (!loadingWhatsAppAccess && !hasWhatsAppAccess)) return null;

  return (
    <div
      className={`fixed bottom-4 z-50 transition-all duration-300 ${side === 'right' ? 'right-4' : 'left-4'}`}
      style={{ touchAction: 'none' }}
    >
      <Button
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        size="lg"
        className={`h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 select-none ${isDragging ? 'scale-95 opacity-80' : ''}`}
      >
        <MessageCircle className="h-6 w-6" />
        {leadUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold shadow-sm animate-pulse">
            {leadUnreadCount > 99 ? "99+" : leadUnreadCount}
          </span>
        )}
      </Button>
    </div>
  );
}
