import { useQuery } from "@tanstack/react-query";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export function NotificationLogsTable() {
  const { data: logs, isLoading, error } = useQuery({
    queryKey: ["notification-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_logs" as any)
        .select(`
          *,
          notification_templates (
            name,
            slug
          )
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-10 text-destructive">
        <AlertCircle className="mr-2 h-5 w-5" />
        <span>Erro ao carregar logs: {(error as Error).message}</span>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Template</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Destinatário</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Execução</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                Nenhum log encontrado.
              </TableCell>
            </TableRow>
          ) : (
            logs?.map((log: any) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap">
                  {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{log.notification_templates?.name || 'N/A'}</div>
                  <div className="text-xs text-muted-foreground">{log.notification_templates?.slug || log.template_id}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {log.channel}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {log.recipient}
                </TableCell>
                <TableCell>
                  {log.status === "sent" ? (
                    <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Enviado
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Falhou
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="font-mono text-[10px]">
                  {log.payload?.executionTime || 'N/A'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
