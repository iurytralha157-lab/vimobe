import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { WhatsAppConversation } from "@/hooks/use-whatsapp";

interface FloatingChatState {
  isOpen: boolean;
  isMinimized: boolean;
  activeConversation: WhatsAppConversation | null;
  pendingPhone: string | null;
  pendingLeadName: string | null;
  pendingMessage: string | null;
}

interface FloatingChatContextType {
  state: FloatingChatState;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  minimizeChat: () => void;
  maximizeChat: () => void;
  openConversation: (conversation: WhatsAppConversation) => void;
  clearActiveConversation: () => void;
  openNewConversation: (phone: string, leadName?: string, message?: string) => void;
  clearPendingMessage: () => void;
}

const FloatingChatContext = createContext<FloatingChatContextType | undefined>(undefined);

const initialState: FloatingChatState = {
  isOpen: false,
  isMinimized: false,
  activeConversation: null,
  pendingPhone: null,
  pendingLeadName: null,
  pendingMessage: null,
};

export function FloatingChatProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FloatingChatState>(initialState);

  const openChat = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: true, isMinimized: false }));
  }, []);

  const closeChat = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
      isMinimized: false,
      activeConversation: null,
      pendingPhone: null,
      pendingLeadName: null,
      pendingMessage: null,
    }));
  }, []);

  const toggleChat = useCallback(() => {
    setState((prev) => {
      if (prev.isOpen && !prev.isMinimized) {
        return { ...prev, isOpen: false };
      }
      return { ...prev, isOpen: true, isMinimized: false };
    });
  }, []);

  const minimizeChat = useCallback(() => {
    setState((prev) => ({ ...prev, isMinimized: true }));
  }, []);

  const maximizeChat = useCallback(() => {
    setState((prev) => ({ ...prev, isMinimized: false }));
  }, []);

  const openConversation = useCallback((conversation: WhatsAppConversation) => {
    setState((prev) => ({
      ...prev,
      activeConversation: conversation,
      pendingPhone: null,
      pendingLeadName: null,
    }));
  }, []);

  const clearActiveConversation = useCallback(() => {
    setState((prev) => ({ ...prev, activeConversation: null }));
  }, []);

  const openNewConversation = useCallback((phone: string, leadName?: string, message?: string) => {
    setState((prev) => ({
      ...prev,
      isOpen: true,
      isMinimized: false,
      pendingPhone: phone,
      pendingLeadName: leadName || null,
      pendingMessage: message || null,
    }));
  }, []);

  const clearPendingMessage = useCallback(() => {
    setState((prev) => ({ ...prev, pendingMessage: null }));
  }, []);

  return (
    <FloatingChatContext.Provider
      value={{
        state,
        openChat,
        closeChat,
        toggleChat,
        minimizeChat,
        maximizeChat,
        openConversation,
        clearActiveConversation,
        openNewConversation,
        clearPendingMessage,
      }}
    >
      {children}
    </FloatingChatContext.Provider>
  );
}

export function useFloatingChat() {
  const context = useContext(FloatingChatContext);
  if (!context) {
    throw new Error("useFloatingChat must be used within a FloatingChatProvider");
  }
  return context;
}
