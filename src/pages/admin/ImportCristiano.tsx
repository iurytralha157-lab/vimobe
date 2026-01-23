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
  contract_date: string | null;
  installation_date: string | null;
  plan_code: string | null;
  plan_value: number | null;
  due_day: number | null;
  seller_name: string | null;
  chip_category: string | null;
  chip_quantity: number | null;
  mesh_repeater: string | null;
  mesh_quantity: number | null;
  is_combo: boolean;
  // Billing data por mês
  billing_data: Record<string, { billing_status: string; payment_status: string }>;
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
  
  // Validate date components
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
    return null; // Invalid date - skip it
  }
  
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

// Map chip category
function mapChipCategory(value: string): string | null {
  const s = value?.trim().toUpperCase() || '';
  if (s.includes('CONVENCIONAL')) return 'CONVENCIONAL';
  if (s.includes('PROMOCIONAL')) return 'PROMOCIONAL';
  if (s.includes('SEM') || s === '' || s === '-') return 'SEM_CHIP';
  return s || null;
}

// Map mesh repeater
function mapMeshRepeater(value: string): string | null {
  const s = value?.trim().toUpperCase() || '';
  if (s.includes('NO ATO') || s.includes('NOATO')) return 'NO_ATO';
  if (s.includes('NORMAL')) return 'NORMAL';
  if (s.includes('SEM') || s === '' || s === '-') return 'SEM_REPETIDOR';
  return s || null;
}

// Map billing/payment status
function mapBillingStatus(value: string): string {
  const s = value?.trim().toUpperCase() || '';
  if (s.includes('COBRADO') && !s.includes('NÃO')) return 'COBRADO';
  return 'NAO_COBRADO';
}

function mapPaymentStatus(value: string): string {
  const s = value?.trim().toUpperCase() || '';
  if (s.includes('PAGO') || s === 'PAGO') return 'PAGO';
  if (s.includes('VENCIDO')) return 'VENCIDO';
  if (s.includes('RENEGOCIADO')) return 'RENEGOCIADO';
  if (s.includes('CHURN')) return 'CHURN';
  if (s.includes('CANCELADO')) return 'CANCELADO';
  return 'PENDENTE';
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
  const [results, setResults] = useState<{ inserted: number; errors: number; skipped: number; billings: number }>({ 
    inserted: 0, errors: 0, skipped: 0, billings: 0 
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setProgress(0);
    setResults({ inserted: 0, errors: 0, skipped: 0, billings: 0 });
    
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      
      if (lines.length < 2) {
        toast.error('Arquivo CSV vazio ou inválido');
        setLoading(false);
        return;
      }

      setStatus('Analisando cabeçalhos...');
      
      // Parse header to find column indices
      const headers = parseCSVLine(lines[0]);
      console.log('Headers found:', headers);
      
      // Find column indices by header name (case insensitive)
      const findCol = (names: string[]): number => {
        return headers.findIndex(h => 
          names.some(n => h.toLowerCase().includes(n.toLowerCase()))
        );
      };
      
      const colMap = {
        external_id: findCol(['external_id', 'id_externo', 'cod']),
        name: findCol(['name', 'nome', 'cliente']),
        phone: findCol(['phone', 'telefone', 'cel']),
        status: findCol(['status']),
        contract_date: findCol(['contract_date', 'data_contrato', 'contratação']),
        installation_date: findCol(['installation_date', 'data_instalação', 'instalação']),
        uf: findCol(['uf', 'estado']),
        city: findCol(['city', 'cidade']),
        neighborhood: findCol(['neighborhood', 'bairro']),
        address: findCol(['address', 'endereço', 'endereco']),
        plan_code: findCol(['plan_code', 'plano', 'codigo_plano', 'TIPO DE PRODUTO']),
        plan_value: findCol(['plan_value', 'valor', 'mensalidade']),
        due_day: findCol(['due_day', 'vencimento', 'dia_vencimento', 'dia_de_devido']),
        seller: findCol(['seller', 'vendedor', 'seller_id']),
        chip_category: findCol(['chip_category', 'cat_chip', 'categoria_chip']),
        chip_quantity: findCol(['chip_quantity', 'qtd_chip', 'quantidade_chip']),
        mesh_repeater: findCol(['mesh_repeater', 'repetidor', 'REPETIDOR MESH']),
        mesh_quantity: findCol(['mesh_quantity', 'qtd_rept', 'quantidade_repetidor']),
        is_combo: findCol(['is_combo', 'combo']),
        notes: findCol(['notes', 'observacao', 'obs']),
      };
      
      console.log('Column mapping:', colMap);

      setStatus('Analisando CSV...');
      
      // Parse customers
      const customers: Customer[] = [];
      const seenIds = new Set<string>();
      let skippedCount = 0;
      
      // Find billing month columns (looking for patterns like JAN/25, FEV/25, etc)
      const billingMonthCols: { col: number; month: string }[] = [];
      const monthPatterns = [
        { pattern: /JAN.*\/(\d{2,4})/i, month: '01' },
        { pattern: /FEV.*\/(\d{2,4})/i, month: '02' },
        { pattern: /MAR.*\/(\d{2,4})/i, month: '03' },
        { pattern: /ABR.*\/(\d{2,4})/i, month: '04' },
        { pattern: /MAI.*\/(\d{2,4})/i, month: '05' },
        { pattern: /JUN.*\/(\d{2,4})/i, month: '06' },
        { pattern: /JUL.*\/(\d{2,4})/i, month: '07' },
        { pattern: /AGO.*\/(\d{2,4})/i, month: '08' },
        { pattern: /SET.*\/(\d{2,4})/i, month: '09' },
        { pattern: /OUT.*\/(\d{2,4})/i, month: '10' },
        { pattern: /NOV.*\/(\d{2,4})/i, month: '11' },
        { pattern: /DEZ.*\/(\d{2,4})/i, month: '12' },
      ];
      
      headers.forEach((h, idx) => {
        for (const mp of monthPatterns) {
          const match = h.match(mp.pattern);
          if (match) {
            let year = parseInt(match[1], 10);
            if (year < 100) year = 2000 + year;
            billingMonthCols.push({ 
              col: idx, 
              month: `${year}-${mp.month}-01` 
            });
            break;
          }
        }
      });
      
      console.log('Billing month columns:', billingMonthCols);
      
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        
        const name = colMap.name >= 0 ? cols[colMap.name]?.trim() : cols[2]?.trim();
        if (!name) continue;
        
        const externalId = colMap.external_id >= 0 ? cols[colMap.external_id]?.trim() : cols[1]?.trim();
        
        // Skip duplicates
        if (externalId && seenIds.has(externalId)) {
          skippedCount++;
          continue;
        }
        if (externalId) {
          seenIds.add(externalId);
        }
        
        const city = (colMap.city >= 0 ? cols[colMap.city] : cols[8])?.trim().replace(/_/g, ' ');
        
        // Parse billing data
        const billing_data: Record<string, { billing_status: string; payment_status: string }> = {};
        for (const bc of billingMonthCols) {
          const val = cols[bc.col]?.trim() || '';
          if (val) {
            billing_data[bc.month] = {
              billing_status: mapBillingStatus(val),
              payment_status: mapPaymentStatus(val),
            };
          }
        }
        
        customers.push({
          external_id: externalId || null,
          name,
          phone: (colMap.phone >= 0 ? cols[colMap.phone] : cols[3])?.trim() || null,
          uf: (colMap.uf >= 0 ? cols[colMap.uf] : cols[7])?.trim() || null,
          city: city || null,
          neighborhood: (colMap.neighborhood >= 0 ? cols[colMap.neighborhood] : cols[9])?.trim() || null,
          address: (colMap.address >= 0 ? cols[colMap.address] : cols[10])?.trim() || null,
          status: mapStatus(colMap.status >= 0 ? cols[colMap.status] : cols[5]),
          contract_date: parseDate(colMap.contract_date >= 0 ? cols[colMap.contract_date] : ''),
          installation_date: parseDate(colMap.installation_date >= 0 ? cols[colMap.installation_date] : cols[6]),
          plan_code: (colMap.plan_code >= 0 ? cols[colMap.plan_code] : cols[14])?.trim() || null,
          plan_value: parseCurrency(colMap.plan_value >= 0 ? cols[colMap.plan_value] : cols[15]),
          due_day: parseInt((colMap.due_day >= 0 ? cols[colMap.due_day] : cols[21])?.trim() || '0', 10) || null,
          seller_name: (colMap.seller >= 0 ? cols[colMap.seller] : cols[11])?.trim() || null,
          chip_category: mapChipCategory(colMap.chip_category >= 0 ? cols[colMap.chip_category] : ''),
          chip_quantity: parseInt((colMap.chip_quantity >= 0 ? cols[colMap.chip_quantity] : '')?.trim() || '0', 10) || null,
          mesh_repeater: mapMeshRepeater(colMap.mesh_repeater >= 0 ? cols[colMap.mesh_repeater] : ''),
          mesh_quantity: parseInt((colMap.mesh_quantity >= 0 ? cols[colMap.mesh_quantity] : '')?.trim() || '0', 10) || null,
          is_combo: (colMap.is_combo >= 0 ? cols[colMap.is_combo] : '')?.trim().toUpperCase() === 'SIM',
          billing_data,
        });
      }
      
      setResults(prev => ({ ...prev, skipped: skippedCount }));
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
      const insertedCustomerIds: { external_id: string | null; id: string }[] = [];
      
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
            contract_date: customer.contract_date,
            installation_date: customer.installation_date,
            plan_id: planId,
            plan_value: customer.plan_value,
            due_day: customer.due_day,
            chip_category: customer.chip_category,
            chip_quantity: customer.chip_quantity,
            mesh_repeater: customer.mesh_repeater,
            mesh_quantity: customer.mesh_quantity,
            is_combo: customer.is_combo,
            notes: customer.seller_name ? `Vendedor: ${customer.seller_name}` : null,
          };
        });
        
        const { data, error } = await supabase
          .from('telecom_customers')
          .insert(records)
          .select('id, external_id');
        
        if (error) {
          console.error(`Error batch ${i}-${i + BATCH_SIZE}:`, error);
          errors += batch.length;
        } else {
          inserted += data?.length || 0;
          if (data) {
            insertedCustomerIds.push(...data);
          }
        }
        
        const percent = Math.round(((i + batch.length) / customers.length) * 50);
        setProgress(percent);
        setStatus(`Importando clientes... ${i + batch.length}/${customers.length}`);
      }
      
      setResults(prev => ({ ...prev, inserted, errors }));
      
      // Now import billing data
      setStatus('Importando dados de cobrança...');
      
      // Create a map of external_id to customer_id
      const customerIdMap = new Map<string, string>();
      insertedCustomerIds.forEach(c => {
        if (c.external_id) {
          customerIdMap.set(c.external_id, c.id);
        }
      });
      
      // Build billing records
      const billingRecords: {
        organization_id: string;
        customer_id: string;
        billing_month: string;
        billing_status: string;
        payment_status: string;
      }[] = [];
      
      customers.forEach(customer => {
        if (!customer.external_id) return;
        const customerId = customerIdMap.get(customer.external_id);
        if (!customerId) return;
        
        Object.entries(customer.billing_data).forEach(([month, data]) => {
          billingRecords.push({
            organization_id: ORGANIZATION_ID,
            customer_id: customerId,
            billing_month: month,
            billing_status: data.billing_status,
            payment_status: data.payment_status,
          });
        });
      });
      
      let billingsInserted = 0;
      
      if (billingRecords.length > 0) {
        // Insert billing records in batches
        for (let i = 0; i < billingRecords.length; i += BATCH_SIZE) {
          const batch = billingRecords.slice(i, i + BATCH_SIZE);
          
          const { data, error } = await supabase
            .from('telecom_billing')
            .upsert(batch, { onConflict: 'customer_id,billing_month' })
            .select('id');
          
          if (error) {
            console.error('Billing error:', error);
          } else {
            billingsInserted += data?.length || 0;
          }
          
          const percent = 50 + Math.round(((i + batch.length) / billingRecords.length) * 50);
          setProgress(percent);
          setStatus(`Importando cobranças... ${i + batch.length}/${billingRecords.length}`);
        }
      }
      
      setResults(prev => ({ ...prev, billings: billingsInserted }));
      setProgress(100);
      setStatus('Importação concluída!');
      toast.success(`Importados ${inserted} clientes e ${billingsInserted} cobranças. ${errors} erros.`);
      
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
            Selecione o arquivo CSV de clientes para importar. Os novos campos serão mapeados automaticamente:
          </p>
          
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>Data de contratação (contract_date)</li>
            <li>Data de instalação (installation_date)</li>
            <li>Categoria do chip (chip_category)</li>
            <li>Quantidade de chips (chip_quantity)</li>
            <li>Repetidor mesh (mesh_repeater)</li>
            <li>Quantidade de repetidores (mesh_quantity)</li>
            <li>É combo? (is_combo)</li>
            <li>Dados de cobrança mensal (colunas JAN/25, FEV/25, etc.)</li>
          </ul>
          
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
                <li>✅ Clientes inseridos: {results.inserted}</li>
                <li>📅 Cobranças importadas: {results.billings}</li>
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
