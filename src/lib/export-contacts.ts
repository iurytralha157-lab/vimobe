import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';

export interface ContactExportData {
  name: string;
  email?: string | null;
  phone?: string | null;
  stage?: string;
  assigned_to?: string;
  created_at?: string;
  tags?: string[];
}

export function exportContacts(contacts: ContactExportData[], filename?: string): void {
  const data = contacts.map(contact => ({
    'Nome': contact.name,
    'Email': contact.email || '',
    'Telefone': contact.phone || '',
    'Estágio': contact.stage || '',
    'Responsável': contact.assigned_to || '',
    'Tags': contact.tags?.join(', ') || '',
    'Criado em': contact.created_at ? format(new Date(contact.created_at), 'dd/MM/yyyy', { locale: ptBR }) : '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Contatos');
  XLSX.writeFile(workbook, filename || `contatos-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}
