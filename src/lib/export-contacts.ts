import ExcelJS from 'exceljs';
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
};

export async function exportContacts({ leads, filename = 'contatos', exportFormat = 'xlsx' }: ExportOptions) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Contatos');

  // Define headers
  worksheet.columns = [
    { header: 'Nome', key: 'nome', width: 25 },
    { header: 'Telefone', key: 'telefone', width: 18 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Estágio', key: 'estagio', width: 20 },
    { header: 'Responsável', key: 'responsavel', width: 20 },
    { header: 'Tags', key: 'tags', width: 25 },
    { header: 'Fonte', key: 'fonte', width: 15 },
    { header: 'Mensagem', key: 'mensagem', width: 40 },
    { header: 'Data de Criação', key: 'criacao', width: 18 },
  ];

  // Add data rows
  leads.forEach(lead => {
    worksheet.addRow({
      nome: lead.name,
      telefone: lead.phone || '',
      email: lead.email || '',
      estagio: lead.stage?.name || '',
      responsavel: lead.assignee?.name || '',
      tags: (lead.tags || []).map(t => t.name).join(', '),
      fonte: sourceLabels[lead.source] || lead.source,
      mensagem: lead.message || '',
      criacao: formatDate(new Date(lead.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
    });
  });

  // Style header row
  worksheet.getRow(1).font = { bold: true };

  // Generate and download file
  if (exportFormat === 'csv') {
    const buffer = await workbook.csv.writeBuffer();
    downloadFile(buffer, `${filename}.csv`, 'text/csv;charset=utf-8;');
  } else {
    const buffer = await workbook.xlsx.writeBuffer();
    downloadFile(buffer, `${filename}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
}

function downloadFile(buffer: ExcelJS.Buffer, filename: string, mimeType: string) {
  const blob = new Blob([buffer], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
