import * as XLSX from 'xlsx';

interface ExportData {
  [key: string]: string | number | boolean | null | undefined;
}

export function exportToExcel(data: ExportData[], filename: string, sheetName = 'Dados') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportToCSV(data: ExportData[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-BR');
}

export function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pendente',
    paid: 'Pago',
    overdue: 'Vencido',
    cancelled: 'Cancelado',
    forecast: 'Prevista',
    approved: 'Aprovada',
    draft: 'Rascunho',
    active: 'Ativo',
    finished: 'Encerrado',
  };
  return statusMap[status] || status;
}

export function prepareFinancialEntriesExport(entries: any[]): ExportData[] {
  return entries.map((entry) => ({
    Descrição: entry.description,
    Tipo: entry.type === 'receivable' ? 'A Receber' : 'A Pagar',
    Categoria: entry.category?.name || '-',
    Valor: formatCurrency(entry.value),
    Vencimento: formatDate(entry.due_date),
    Status: getStatusLabel(entry.status),
    'Valor Pago': formatCurrency(entry.paid_value),
    'Data Pagamento': formatDate(entry.paid_at),
    Parcela: entry.installment_number && entry.total_installments 
      ? `${entry.installment_number}/${entry.total_installments}` 
      : '-',
  }));
}

export function prepareCommissionsExport(commissions: any[]): ExportData[] {
  return commissions.map((c) => ({
    Corretor: c.user?.name || '-',
    Contrato: c.contract?.contract_number || '-',
    Imóvel: c.property?.code || '-',
    'Valor Base': formatCurrency(c.base_value),
    Percentual: c.percentage ? `${c.percentage}%` : '-',
    'Valor Calculado': formatCurrency(c.calculated_value),
    Status: getStatusLabel(c.status),
    'Data Previsão': formatDate(c.forecast_date),
    'Data Aprovação': formatDate(c.approved_at),
    'Data Pagamento': formatDate(c.paid_at),
  }));
}

export function prepareContractsExport(contracts: any[]): ExportData[] {
  return contracts.map((c) => ({
    Número: c.contract_number,
    Cliente: c.client_name,
    Tipo: c.type === 'sale' ? 'Venda' : c.type === 'rent' ? 'Locação' : 'Serviço',
    Imóvel: c.property?.code || '-',
    'Valor Total': formatCurrency(c.total_value),
    Entrada: formatCurrency(c.down_payment),
    Parcelas: c.installments || '-',
    Status: getStatusLabel(c.status),
    'Data Início': formatDate(c.start_date),
    'Data Fim': formatDate(c.end_date),
    'Data Assinatura': formatDate(c.signing_date),
  }));
}
