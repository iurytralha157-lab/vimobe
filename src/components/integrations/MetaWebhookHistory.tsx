
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  RefreshCcw, 
  ExternalLink, 
  ChevronRight, 
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface WebhookEvent {
  id: string;
  received_at: string;
  status: string;
  page_id: string;
  leadgen_id: string;
  form_id: string;
  error_message: string;
  processed_at: string;
  raw_payload: any;
  attempts: number;
}

export const MetaWebhookHistory = () => {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [replaying, setReplaying] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();
  const meta = t.settings.integrations.meta;

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("meta_webhook_events")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      console.error("Error fetching events:", error);
      toast({
        title: "Erro ao carregar logs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleManualReplay = async (eventId: string) => {
    setReplaying(eventId);
    try {
      const { data, error } = await supabase.functions.invoke("meta-webhook-replay", {
        body: { eventId }
      });

      if (error) throw error;

      toast({
        title: "Replay processado",
        description: "O evento foi enviado para reprocessamento.",
      });
      fetchEvents();
    } catch (error: any) {
      toast({
        title: "Erro no replay",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setReplaying(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "processed":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" /> {meta.webhookStatusProcessed}</Badge>;
      case "failed":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> {meta.webhookStatusFailed}</Badge>;
      case "duplicate":
        return <Badge variant="outline" className="text-gray-500"><RotateCcw className="w-3 h-3 mr-1" /> {meta.webhookStatusDuplicate}</Badge>;
      case "skipped":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> {meta.webhookStatusSkipped}</Badge>;
      default:
        return <Badge variant="outline">{meta.webhookStatusPending}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{meta.webhookHistoryTitle}</h3>
        <Button variant="outline" size="sm" onClick={fetchEvents} disabled={loading}>
          <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{meta.webhookTableDate}</TableHead>
              <TableHead>{meta.webhookTableSource}</TableHead>
              <TableHead>{meta.webhookTableLeadId}</TableHead>
              <TableHead>{meta.webhookTableStatus}</TableHead>
              <TableHead>{meta.webhookTableAttempts}</TableHead>
              <TableHead className="text-right">{meta.webhookTableActions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum evento registrado ainda.
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-mono text-xs">
                    {format(new Date(event.received_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-sm">
                    {event.page_id || 'N/A'}
                  </TableCell>
                  <TableCell className="text-sm font-mono">
                    {event.leadgen_id || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(event.status)}
                  </TableCell>
                  <TableCell className="text-center">
                    {event.attempts || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{meta.webhookDetailTitle}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="font-semibold">ID do Evento</p>
                                <p className="font-mono text-xs">{event.id}</p>
                              </div>
                              <div>
                                <p className="font-semibold">{meta.webhookDetailProcessedAt}</p>
                                <p>{event.processed_at ? format(new Date(event.processed_at), "dd/MM/yyyy HH:mm:ss") : meta.webhookStatusPending}</p>
                              </div>
                            </div>
                            {event.error_message && (
                              <div className="p-3 bg-red-50 border border-red-100 rounded text-red-700 text-sm">
                                <p className="font-semibold flex items-center gap-1">
                                  <AlertCircle className="w-4 h-4" /> Erro:
                                </p>
                                <p>{event.error_message}</p>
                              </div>
                            )}
                            <div className="space-y-2">
                              <p className="font-semibold">{meta.webhookDetailPayload}</p>
                              <pre className="p-4 bg-gray-900 text-green-400 rounded-lg text-xs overflow-x-auto">
                                {JSON.stringify(event.raw_payload, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {event.status === "failed" && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleManualReplay(event.id)}
                          disabled={replaying === event.id}
                        >
                          <RotateCcw className={`w-4 h-4 ${replaying === event.id ? 'animate-spin' : ''}`} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
