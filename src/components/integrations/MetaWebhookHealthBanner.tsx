import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";

export function MetaWebhookHealthBanner() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const { t } = useLanguage();
  const meta = t.settings.integrations.meta;

  const STATUS_LABELS: Record<string, string> = {
    failed: meta.webhookStatusFailed.toLowerCase(),
    skipped: meta.webhookStatusSkipped.toLowerCase(),
    duplicate: meta.webhookStatusDuplicate.toLowerCase(),
  };

  const { data } = useQuery({
    queryKey: ["meta-webhook-health", orgId],
    enabled: !!orgId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await (supabase as any)
        .from("meta_webhook_events")
        .select("status, error_message, received_at")
        .eq("organization_id", orgId!)
        .gte("received_at", since)
        .in("status", ["failed", "skipped"])
        .order("received_at", { ascending: false })
        .limit(200);
      if (error) {
        return { counts: {} as Record<string, number>, lastError: null as string | null, missing: true };
      }
      const counts: Record<string, number> = {};
      let lastError: string | null = null;
      for (const row of data || []) {
        counts[row.status] = (counts[row.status] || 0) + 1;
        if (!lastError && row.error_message) lastError = row.error_message;
      }
      return { counts, lastError, missing: false };
    },
  });

  if (!data || data.missing) return null;
  const failed = data.counts.failed || 0;
  const skipped = data.counts.skipped || 0;
  if (failed === 0 && skipped === 0) return null;

  const variant = failed > 0 ? "destructive" : "default";
  const Icon = failed > 0 ? AlertTriangle : AlertCircle;

  const parts: string[] = [];
  if (failed > 0) parts.push(`${failed} ${STATUS_LABELS.failed}`);
  if (skipped > 0) parts.push(`${skipped} ${STATUS_LABELS.skipped}`);

  return (
    <Alert variant={variant as any}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{meta.webhookHealthAlert}</AlertTitle>
      <AlertDescription className="space-y-1">
        <p>
          {parts.join(" e ")} {meta.webhookHealthParts}
          {skipped > 0 && ` ${meta.webhookHealthNote}`}
        </p>
        {data.lastError && (
          <p className="text-xs opacity-80">{meta.webhookHealthLastError} {data.lastError}</p>
        )}
      </AlertDescription>
    </Alert>
  );
}
