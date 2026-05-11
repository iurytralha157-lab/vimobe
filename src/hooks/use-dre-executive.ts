import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

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

export function useDREExecutive({ startDate, endDate, regime, compareWithPrevious = false, projectId }: UseDREParams) {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ['dre-executive', organization?.id, startDate.toISOString(), endDate.toISOString(), regime, compareWithPrevious, projectId],
    queryFn: async (): Promise<DREData> => {
      if (!organization?.id) throw new Error('No organization');

      const statusFilter = regime === 'cash' ? ['paid'] : ['pending', 'paid', 'overdue'];

      // Simplificação do fetch para evitar profundidade de tipo excessiva
      const fetchEntries = async (s: Date, e: Date) => {
        let q = supabase
          .from('financial_entries')
          .select('amount, type, status, category, due_date, paid_date, project_id' as any)
          .eq('organization_id', organization.id)
          .in('status', statusFilter);

        if (projectId) q = q.eq('project_id' as any, projectId);

        const dateField = regime === 'cash' ? 'paid_date' : 'due_date';
        q = q.gte(dateField, format(s, 'yyyy-MM-dd')).lte(dateField, format(e, 'yyyy-MM-dd'));

        const { data, error } = await q;
        if (error) throw error;
        return data || [];
      };

      const entries = await fetchEntries(startDate, endDate);

      let previousEntries: any[] = [];
      if (compareWithPrevious) {
        const interval = endDate.getTime() - startDate.getTime();
        const prevStart = new Date(startDate.getTime() - interval);
        const prevEnd = new Date(endDate.getTime() - interval);
        previousEntries = await fetchEntries(prevStart, prevEnd);
      }

      const calculateTotals = (data: any[]) => {
        const revenue = data.filter(e => e.type === 'revenue' || e.type === 'receivable').reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const expense = data.filter(e => e.type === 'expense' || e.type === 'payable').reduce((s, e) => s + (Number(e.amount) || 0), 0);
        return { revenue, expense };
      };

      const currentTotals = calculateTotals(entries);
      const prevTotals = calculateTotals(previousEntries);

      const ebitda = currentTotals.revenue - currentTotals.expense;
      const roi = currentTotals.expense > 0 ? (ebitda / currentTotals.expense) : 0;

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
