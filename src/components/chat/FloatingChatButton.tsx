import { useFloatingChat } from "@/contexts/FloatingChatContext";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useWhatsAppConversations, useWhatsAppRealtimeConversations } from "@/hooks/use-whatsapp-conversations";
import { useWhatsAppSessions } from "@/hooks/use-whatsapp-sessions";
import { useLocation } from "react-router-dom";
import { useHasWhatsAppAccess } from "@/hooks/use-whatsapp-access";
import { useState, useRef, useCallback, useEffect } from "react";

export function FloatingChatButton() {
  const { state, toggleChat } = useFloatingChat();
  const { data: sessions } = useWhatsAppSessions();
  const { data: conversations } = useWhatsAppConversations(undefined, { hideGroups: true });
  const location = useLocation();
  const { data: hasWhatsAppAccess, isLoading: loadingWhatsAppAccess } = useHasWhatsAppAccess();
  
  useWhatsAppRealtimeConversations();

  const [side, setSide] = useState<'right' | 'left'>('right');
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dragState = useRef({ startX: 0, startY: 0, moved: false, pointerId: -1 });

  const hasConnectedSession = sessions?.some((s) => s.status === "connected");
  
  const leadUnreadCount = conversations?.reduce((acc, c) => {
    if (c.lead_id) {
      return acc + (c.unread_count || 0);
    }
    return acc;
  }, 0) || 0;

  const isOnConversationsPage = location.pathname === "/crm/conversas";

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, moved: false, pointerId: e.pointerId };
    setOffsetX(0);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragState.current.pointerId === -1) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = Math.abs(e.clientY - dragState.current.startY);
    if (Math.abs(dx) > 10 || dy > 10) {
      dragState.current.moved = true;
      setIsDragging(true);
      setOffsetX(dx);
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (dragState.current.moved) {
      const screenMid = window.innerWidth / 2;
      setSide(e.clientX < screenMid ? 'left' : 'right');
    }
    dragState.current.pointerId = -1;
    setOffsetX(0);
    setIsDragging(false);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (dragState.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragState.current.moved = false;
      return;
    }
    toggleChat();
  }, [toggleChat]);

  if (state.isOpen || !hasConnectedSession || isOnConversationsPage || (!loadingWhatsAppAccess && !hasWhatsAppAccess)) return null;

  return (
    <div
      className={`fixed bottom-20 z-50 ${side === 'right' ? 'right-4' : 'left-4'}`}
      style={{
        touchAction: 'none',
        transform: isDragging ? `translateX(${offsetX}px)` : undefined,
        transition: isDragging ? 'none' : 'transform 0.3s ease',
      }}
    >
      <Button
        ref={btnRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
          dragState.current.pointerId = -1;
          setOffsetX(0);
          setIsDragging(false);
        }}
        onClick={handleClick}
        size="lg"
        className={`h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow duration-200 hover:scale-105 select-none ${isDragging ? 'scale-95 opacity-80 cursor-grabbing' : 'cursor-grab'}`}
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
