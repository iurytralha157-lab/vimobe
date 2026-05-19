import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Plays a short "plop" sound whenever a NEW inbound WhatsApp message arrives.
 *
 * - Subscribes to whatsapp_messages INSERT events scoped to the org via
 *   the per-conversation list (we filter client-side by from_me=false).
 * - Throttled to 1.5s to avoid sound spam.
 * - Different from the lead notification sound on purpose.
 *
 * The audio file is loaded from /sounds/whatsapp-pop.mp3 (public folder).
 */
export function useWhatsAppSound() {
  const { profile } = useAuth();
  const lastPlayedRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!profile?.organization_id) return;

    // Lazy-load audio
    const a = new Audio("/sounds/whatsapp-pop.mp3");
    a.volume = 0.4;
    a.preload = "auto";
    audioRef.current = a;

    const channel = supabase
      .channel(`whatsapp-sound-${profile.organization_id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "whatsapp_messages" },
        (payload) => {
          const m = payload.new as any;
          if (!m || m.from_me) return;
          const now = Date.now();
          if (now - lastPlayedRef.current < 1500) return;
          lastPlayedRef.current = now;
          audioRef.current?.play().catch(() => {});
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      audioRef.current = null;
    };
  }, [profile?.organization_id]);
}
