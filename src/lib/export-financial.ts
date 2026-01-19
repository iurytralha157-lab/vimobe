import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '-';
  try {
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '-';
  }
}

export function exportToExcel(data: Record<string, any>[], filename: string): void {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportToCSV(data: Record<string, any>[], filename: string): void {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
}

export function prepareFinancialEntriesExport(entries: any[]): Record<string, any>[] {
  return entries.map(entry => ({
    'Descrição': entry.description || '',
    'Tipo': entry.type === 'receivable' ? 'A Receber' : 'A Pagar',
    'Categoria': entry.category || '',
    'Valor': entry.amount || entry.value || 0,
    'Vencimento': formatDate(entry.due_date),
    'Status': entry.status || '',
    'Pagamento': formatDate(entry.paid_date),
    'Pessoa': entry.related_person_name || '',
  }));
}

export function prepareContractsExport(contracts: any[]): Record<string, any>[] {
  return contracts.map(contract => ({
    'Número': contract.contract_number || '',
    'Tipo': contract.contract_type || '',
    'Valor': contract.value || 0,
    'Status': contract.status || '',
    'Lead': contract.lead?.name || '',
    'Imóvel': contract.property?.code || '',
    'Assinatura': formatDate(contract.signing_date),
    'Fechamento': formatDate(contract.closing_date),
  }));
}

export function prepareCommissionsExport(commissions: any[]): Record<string, any>[] {
  return commissions.map(commission => ({
    'Corretor': commission.user?.name || '',
    'Valor': commission.amount || 0,
    'Percentual': commission.percentage ? `${commission.percentage}%` : '',
    'Status': commission.status || '',
    'Lead': commission.lead?.name || '',
    'Contrato': commission.contract?.contract_number || '',
    'Pago em': formatDate(commission.paid_at),
    'Criado em': formatDate(commission.created_at),
  }));
}
