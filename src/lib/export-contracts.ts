import * as XLSX from 'xlsx';
import { Contract } from '@/hooks/use-contracts';
import { format as formatDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExportOptions {
  contracts: Contract[];
  filename?: string;
  exportFormat?: 'xlsx' | 'csv';
}

const typeLabels: Record<string, string> = {
  sale: 'Venda',
  rental: 'Locação',
  service: 'Serviço',
};

const statusLabels: Record<string, string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDateSafe(date: string | null | undefined): string {
  if (!date) return '-';
  try {
    return formatDate(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '-';
  }
}

export function exportContracts({ contracts, filename = 'contratos', exportFormat = 'xlsx' }: ExportOptions) {
  const exportData = contracts.map(contract => ({
    'Número': contract.contract_number || '',
    'Tipo': contract.contract_type ? (typeLabels[contract.contract_type] || contract.contract_type) : '',
    'Status': contract.status ? (statusLabels[contract.status] || contract.status) : '',
    'Imóvel': contract.property?.code || '',
    'Valor': formatCurrency(contract.value),
    'Comissão %': contract.commission_percentage || '',
    'Valor Comissão': formatCurrency(contract.commission_value),
    'Data Assinatura': formatDateSafe(contract.signing_date),
    'Data Fechamento': formatDateSafe(contract.closing_date),
    'Lead': contract.lead?.name || '',
    'Observações': contract.notes || '',
    'Criado em': formatDateSafe(contract.created_at),
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  // Auto-size columns
  const maxWidths: number[] = [];
  const headers = Object.keys(exportData[0] || {});
  
  headers.forEach((header, i) => {
    maxWidths[i] = header.length;
    exportData.forEach(row => {
      const value = String(row[header as keyof typeof row] || '');
      maxWidths[i] = Math.max(maxWidths[i], value.length);
    });
  });

  worksheet['!cols'] = maxWidths.map(w => ({ wch: Math.min(w + 2, 50) }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Contratos');

  if (exportFormat === 'csv') {
    XLSX.writeFile(workbook, `${filename}.csv`, { bookType: 'csv' });
  } else {
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  }
}