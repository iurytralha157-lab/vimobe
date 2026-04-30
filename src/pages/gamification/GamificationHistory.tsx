import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Phone, MessageSquare, UserCheck, Calendar, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const SOURCE_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp / Grupos',
  spreadsheet: 'Planilha de Frios',
  referral: 'Indicação',
  recontact: 'Recontato de Base',
  canvassing: 'Panfletagem / PAP',
  other: 'Outros',
};

export default function GamificationHistory() {
  const { user } = useAuth();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['prospecting-reports-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('prospecting_reports' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Meu Histórico de Prospecção</h2>
        <p className="text-muted-foreground">Veja todos os seus lançamentos manuais e o impacto deles.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Lançamentos Realizados
          </CardTitle>
          <CardDescription>
            Lista cronológica de todas as suas atividades de prospecção ativa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-center">Ligações</TableHead>
                  <TableHead className="text-center">Mensagens</TableHead>
                  <TableHead className="text-center">Contatos</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!reports || reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum relatório de prospecção enviado ainda.
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {format(new Date(report.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {SOURCE_LABELS[report.source] || report.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{report.calls}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <MessageSquare className="h-3 w-3 text-muted-foreground" />
                          <span>{report.messages}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <UserCheck className="h-3 w-3 text-muted-foreground" />
                          <span>{report.contacts}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate group relative">
                        {report.description ? (
                          <div className="flex items-center gap-1">
                            <Info className="h-3 w-3 text-blue-500 shrink-0" />
                            <span className="truncate">{report.description}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
