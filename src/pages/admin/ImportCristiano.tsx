import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const ORGANIZATION_ID = '92a6789a-466c-4c0d-bd06-689ccd50e411';
const BATCH_SIZE = 200;

interface Customer {
  external_id: string | null;
  name: string;
  phone: string | null;
  uf: string | null;
  city: string | null;
  neighborhood: string | null;
  address: string | null;
  status: string;
  installation_date: string | null;
  plan_code: string | null;
  plan_value: number | null;
  due_day: number | null;
  seller_name: string | null;
}

// Parse Brazilian date format to ISO
function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '' || dateStr === 'FOLLOW UP') return null;
  
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) return null;
  
  let day = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);
  
  if (year < 100) {
    year = year > 50 ? 1900 + year : 2000 + year;
  }
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Parse Brazilian currency format
function parseCurrency(value: string): number | null {
  if (!value || value.trim() === '' || value.includes('-')) return null;
  
  const cleaned = value
    .replace(/R\$/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Map status from spreadsheet to system
function mapStatus(status: string): string {
  const s = status?.trim().toUpperCase() || '';
  if (s.includes('INSTALADO')) return 'INSTALADOS';
  if (s.includes('CANCELADO')) return 'CANCELADO';
  if (s.includes('AGUARDANDO') || s.includes('AGENDADO')) return 'AGUARDANDO';
  if (s.includes('SUSPENSO')) return 'SUSPENSO';
  if (s.includes('INADIMPLENTE')) return 'INADIMPLENTE';
  return 'NOVO';
}

// Parse CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export default function ImportCristiano() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ inserted: number; errors: number; skipped: number }>({ inserted: 0, errors: 0, skipped: 0 });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setProgress(0);
    setResults({ inserted: 0, errors: 0, skipped: 0 });
    
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      
      if (lines.length < 2) {
        toast.error('Arquivo CSV vazio ou inválido');
        setLoading(false);
        return;
      }

      setStatus('Analisando CSV...');
      
      // Parse customers
      const customers: Customer[] = [];
      const seenIds = new Set<string>();
      
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        if (cols.length < 15) continue;
        
        const name = cols[2]?.trim();
        if (!name) continue;
        
        const externalId = cols[1]?.trim();
        
        // Skip duplicates
        if (externalId && seenIds.has(externalId)) {
          setResults(prev => ({ ...prev, skipped: prev.skipped + 1 }));
          continue;
        }
        if (externalId) {
          seenIds.add(externalId);
        }
        
        const city = cols[8]?.trim().replace(/_/g, ' ');
        
        customers.push({
          external_id: externalId || null,
          name,
          phone: cols[3]?.trim() || null,
          uf: cols[7]?.trim() || null,
          city: city || null,
          neighborhood: cols[9]?.trim() || null,
          address: cols[10]?.trim() || null,
          status: mapStatus(cols[5]),
          installation_date: parseDate(cols[6]),
          plan_code: cols[14]?.trim() || null,
          plan_value: parseCurrency(cols[15]),
          due_day: parseInt(cols[21]?.trim() || '0', 10) || null,
          seller_name: cols[11]?.trim() || null,
        });
      }
      
      setStatus(`Encontrados ${customers.length} clientes. Buscando planos...`);
      
      // Get plan lookup
      const { data: plans } = await supabase
        .from('service_plans')
        .select('id, code')
        .eq('organization_id', ORGANIZATION_ID);
      
      const planLookup = new Map<string, string>();
      plans?.forEach(plan => {
        planLookup.set(plan.code, plan.id);
      });
      
      setStatus(`Importando em lotes de ${BATCH_SIZE}...`);
      
      let inserted = 0;
      let errors = 0;
      
      // Process in batches
      for (let i = 0; i < customers.length; i += BATCH_SIZE) {
        const batch = customers.slice(i, i + BATCH_SIZE);
        
        const records = batch.map(customer => {
          const planId = customer.plan_code ? planLookup.get(customer.plan_code) : null;
          
          return {
            organization_id: ORGANIZATION_ID,
            external_id: customer.external_id,
            name: customer.name,
            phone: customer.phone,
            uf: customer.uf,
            city: customer.city,
            neighborhood: customer.neighborhood,
            address: customer.address,
            status: customer.status,
            installation_date: customer.installation_date,
            plan_id: planId,
            plan_value: customer.plan_value,
            due_day: customer.due_day,
            notes: customer.seller_name ? `Vendedor: ${customer.seller_name}` : null,
          };
        });
        
        const { error } = await supabase
          .from('telecom_customers')
          .insert(records);
        
        if (error) {
          console.error(`Error batch ${i}-${i + BATCH_SIZE}:`, error);
          errors += batch.length;
        } else {
          inserted += batch.length;
        }
        
        const percent = Math.round(((i + batch.length) / customers.length) * 100);
        setProgress(percent);
        setStatus(`Importando... ${i + batch.length}/${customers.length}`);
        setResults({ inserted, errors, skipped: results.skipped });
      }
      
      setResults(prev => ({ ...prev, inserted, errors }));
      setStatus('Importação concluída!');
      toast.success(`Importados ${inserted} clientes. ${errors} erros.`);
      
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erro na importação');
      setStatus('Erro na importação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Importar Clientes - Cristiano Fixtell</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Selecione o arquivo CSV de clientes para importar na organização do Cristiano.
          </p>
          
          <input 
            type="file" 
            accept=".csv"
            onChange={handleFileUpload}
            disabled={loading}
            className="block w-full text-sm text-muted-foreground
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-primary file:text-primary-foreground
              hover:file:bg-primary/90"
          />
          
          {loading && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground">{status}</p>
            </div>
          )}
          
          {(results.inserted > 0 || results.errors > 0 || results.skipped > 0) && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Resultado:</h4>
              <ul className="text-sm space-y-1">
                <li>✅ Inseridos: {results.inserted}</li>
                <li>⏭️ Duplicados ignorados: {results.skipped}</li>
                <li>❌ Erros: {results.errors}</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
