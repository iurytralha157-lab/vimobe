import * as XLSX from 'xlsx';
import { Lead } from '@/hooks/use-leads';
import { format as formatDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExportOptions {
  leads: Lead[];
  filename?: string;
  exportFormat?: 'xlsx' | 'csv';
}

const sourceLabels: Record<string, string> = {
  manual: 'Manual',
  meta: 'Meta Ads',
  site: 'Site',
  wordpress: 'WordPress',
};

export function exportContacts({ leads, filename = 'contatos', exportFormat = 'xlsx' }: ExportOptions) {
  // Transform leads to export format
  const exportData = leads.map(lead => ({
    'Nome': lead.name,
    'Telefone': lead.phone || '',
    'Email': lead.email || '',
    'Estágio': lead.stage?.name || '',
    'Responsável': lead.assignee?.name || '',
    'Tags': (lead.tags || []).map(t => t.name).join(', '),
    'Fonte': sourceLabels[lead.source] || lead.source,
    'Mensagem': lead.message || '',
    'Data de Criação': formatDate(new Date(lead.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
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
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Contatos');

  if (exportFormat === 'csv') {
    XLSX.writeFile(workbook, `${filename}.csv`, { bookType: 'csv' });
  } else {
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  }
}
