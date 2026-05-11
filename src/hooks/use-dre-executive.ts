import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subMonths, format } from 'date-fns';

export interface DRELine {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  percentage?: number;
  variation?: number;
  isTotal?: boolean;
  type?: string;
  level?: number;
}

export interface DREData {
  period: { start: string; end: string };
  previousPeriod?: { start: string; end: string };
  lines: DRELine[];
  totals: {
    grossRevenue: number;
    netRevenue: number;
    grossProfit: number;
    operatingResult: number;
    netResult: number;
    ebitda: number;
    roi: number;
  };
}

interface UseDREParams {
  startDate: Date;
  endDate: Date;
  regime: 'cash' | 'accrual';
  compareWithPrevious?: boolean;
  projectId?: string;
}

export function useDRE({ startDate, endDate, regime, compareWithPrevious = false, projectId }: UseDREParams) {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ['dre-executive', organization?.id, startDate.toISOString(), endDate.toISOString(), regime, compareWithPrevious, projectId],
    queryFn: async (): Promise<DREData> => {
      if (!organization?.id) throw new Error('No organization');

      const statusFilter = regime === 'cash' ? ['paid'] : ['pending', 'paid', 'overdue'];

      // Simplificação: Agrupar diretamente por categoria se as tabelas de mapeamento não existirem
      let query = supabase
        .from('financial_entries')
        .select('*')
        .eq('organization_id', organization.id)
        .in('status', statusFilter);

      if (projectId) {
        // Se houver project_id na tabela
        query = query.eq('project_id' as any, projectId);
      }

      if (regime === 'cash') {
        query = query.gte('paid_date', format(startDate, 'yyyy-MM-dd')).lte('paid_date', format(endDate, 'yyyy-MM-dd'));
      } else {
        query = query.gte('due_date', format(startDate, 'yyyy-MM-dd')).lte('due_date', format(endDate, 'yyyy-MM-dd'));
      }

      const { data: entries, error: entriesError } = await query;
      if (entriesError) throw entriesError;

      // Calcular períodos anteriores para comparação
      let previousEntries: any[] = [];
      if (compareWithPrevious) {
        const interval = endDate.getTime() - startDate.getTime();
        const prevStart = new Date(startDate.getTime() - interval);
        const prevEnd = new Date(endDate.getTime() - interval);

        let prevQuery = supabase
          .from('financial_entries')
          .select('*')
          .eq('organization_id', organization.id)
          .in('status', statusFilter);

        if (projectId) prevQuery = prevQuery.eq('project_id' as any, projectId);

        if (regime === 'cash') {
          prevQuery = prevQuery.gte('paid_date', format(prevStart, 'yyyy-MM-dd')).lte('paid_date', format(prevEnd, 'yyyy-MM-dd'));
        } else {
          prevQuery = prevQuery.gte('due_date', format(prevStart, 'yyyy-MM-dd')).lte('due_date', format(prevEnd, 'yyyy-MM-dd'));
        }

        const { data: prevData } = await prevQuery;
        previousEntries = prevData || [];
      }

      // Lógica de agregação executiva
      const calculateTotals = (data: any[]) => {
        const revenue = data.filter(e => e.type === 'revenue' || e.type === 'receivable').reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const expense = data.filter(e => e.type === 'expense' || e.type === 'payable').reduce((s, e) => s + (Number(e.amount) || 0), 0);
        return { revenue, expense };
      };

      const currentTotals = calculateTotals(entries || []);
      const prevTotals = calculateTotals(previousEntries);

      const ebitda = currentTotals.revenue - currentTotals.expense;
      const roi = currentTotals.expense > 0 ? (ebitda / currentTotals.expense) : 0;

      // Montar linhas do relatório
      const lines: DRELine[] = [
        { id: 'rev', name: '(+) Receita Operacional', value: currentTotals.revenue, previousValue: prevTotals.revenue, isTotal: true, type: 'revenue' },
        { id: 'exp', name: '(-) Despesas/Custos', value: currentTotals.expense, previousValue: prevTotals.expense, isTotal: true, type: 'expense' },
        { id: 'ebitda', name: '(=) EBITDA', value: ebitda, previousValue: prevTotals.revenue - prevTotals.expense, isTotal: true, type: 'total' }
      ];

      return {
        period: { start: format(startDate, 'yyyy-MM-dd'), end: format(endDate, 'yyyy-MM-dd') },
        lines,
        totals: {
          grossRevenue: currentTotals.revenue,
          netRevenue: currentTotals.revenue,
          grossProfit: ebitda,
          operatingResult: ebitda,
          netResult: ebitda,
          ebitda,
          roi
        }
      };
    },
    enabled: !!organization?.id
  });
}
