import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TelephonyCall {
  id: string;
  lead_id: string | null;
  user_id: string | null;
  organization_id: string;
  direction: "inbound" | "outbound";
  status: "answered" | "missed" | "no-answer" | "busy" | "failed";
  from_number: string | null;
  to_number: string | null;
  duration: number | null;
  recording_url: string | null;
  initiated_at: string;
  answered_at: string | null;
  ended_at: string | null;
  created_at: string;
  user?: {
    id: string;
    name: string;
  };
}

// Note: These hooks require the telephony_calls table to be created
// For now, they return empty data as placeholders

export function useLeadCalls(leadId: string | undefined) {
  return useQuery({
    queryKey: ["telephony-calls", "lead", leadId],
    queryFn: async (): Promise<TelephonyCall[]> => {
      // Table not yet created - return empty array
      return [];
    },
    enabled: !!leadId,
  });
}

export function useTelephonyCalls(filters?: {
  userId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["telephony-calls", filters],
    queryFn: async (): Promise<TelephonyCall[]> => {
      // Table not yet created - return empty array
      return [];
    },
  });
}

export function useRecordingUrl() {
  return useMutation({
    mutationFn: async (recordingPath: string) => {
      if (recordingPath.startsWith("http")) {
        return recordingPath;
      }
      const { data, error } = await supabase.storage
        .from("recordings")
        .createSignedUrl(recordingPath, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export function formatCallDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}:${remainingMins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function getCallStatusInfo(status: string) {
  switch (status) {
    case "answered":
      return { label: "Atendida", color: "text-emerald-500", bgColor: "bg-emerald-500/10" };
    case "missed":
      return { label: "Perdida", color: "text-red-500", bgColor: "bg-red-500/10" };
    case "no-answer":
      return { label: "Não atendida", color: "text-amber-500", bgColor: "bg-amber-500/10" };
    case "busy":
      return { label: "Ocupado", color: "text-orange-500", bgColor: "bg-orange-500/10" };
    case "failed":
      return { label: "Falhou", color: "text-red-500", bgColor: "bg-red-500/10" };
    default:
      return { label: status, color: "text-muted-foreground", bgColor: "bg-muted" };
  }
}
