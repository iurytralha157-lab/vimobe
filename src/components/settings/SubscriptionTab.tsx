import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Calendar, History, Building2, User, Loader2, AlertCircle, CheckCircle2, Receipt, QrCode, FileText, Copy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SubscriptionTab() {
  const { organization, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<any>(null);

  const [billingInfo, setBillingInfo] = useState({
    name: '', taxId: '', cep: '', endereco: '', numero: '',
    complemento: '', bairro: '', cidade: '', uf: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!organization?.id) return;
      try {
        const { data: org } = await supabase.from('organizations').select('*').eq('id', organization.id).maybeSingle();
        let plan = null;
        if (org?.plan_id) {
          const { data: p } = await supabase.from('admin_subscription_plans').select('*').eq('id', org.plan_id).maybeSingle();
          plan = p;
        }
        const { data: hist } = await supabase.from('asaas_payments').select('*').eq('organization_id', organization.id).order('due_date', { ascending: false });
        setData({ org, plan });
        setHistory(hist || []);
        if (org) {
          setBillingInfo({
            name: org.razao_social || org.name || '',
            taxId: org.cnpj || '',
            cep: org.cep || '',
            endereco: org.endereco || '',
            numero: org.numero || '',
            complemento: org.complemento || '',
            bairro: org.bairro || '',
            cidade: org.cidade || '',
            uf: org.uf || '',
          });
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchData();
  }, [organization?.id]);

  const handleCheckout = async (type: 'PIX' | 'CREDIT_CARD' | 'BOLETO') => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('asaas-create-charge', {
        body: {
          organization_id: organization?.id,
          billing_type: type,
          holder_email: profile?.email,
          holder_cpf_cnpj: billingInfo.taxId,
          holder_name: billingInfo.name,
        }
      });
      if (error) throw error;
      setCheckoutResult(data);
      toast.success('Checkout gerado com sucesso!');
    } catch (e: any) { toast.error(e.message); } finally { setSubmitting(false); }
  };

  const handleSaveBilling = async () => {
    if (!organization?.id) return;
    setSaving(true);
    const isCnpj = billingInfo.taxId.replace(/\D/g, '').length > 11;
    const { error } = await supabase.from('organizations').update({
      razao_social: billingInfo.name,
      cnpj: isCnpj ? billingInfo.taxId : null,
      cep: billingInfo.cep,
      endereco: billingInfo.endereco,
      numero: billingInfo.numero,
      bairro: billingInfo.bairro,
      cidade: billingInfo.cidade,
      uf: billingInfo.uf,
    }).eq('id', organization.id);
    if (error) toast.error('Erro ao salvar');
    else toast.success('Dados salvos');
    setSaving(false);
  };

  if (loading) return <Skeleton className="h-[400px] w-full" />;

  const org = data?.org;
  const plan = data?.plan;
  const status = org?.subscription_status || 'pending';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {checkoutResult ? (
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-4">Pagamento</h3>
              {checkoutResult.type === 'PIX' && (
                <div className="text-center space-y-4">
                  <img src={`data:image/png;base64,${checkoutResult.qr_code}`} className="w-64 h-64 mx-auto" />
                  <Input value={checkoutResult.qr_payload} readOnly />
                  <Button onClick={() => navigator.clipboard.writeText(checkoutResult.qr_payload)}>Copiar payload</Button>
                </div>
              )}
              {checkoutResult.type === 'BOLETO' && (
                <div className="space-y-4">
                  <p>Linha digitável: {checkoutResult.identification_field}</p>
                  <Button asChild><a href={checkoutResult.bank_slip_url} target="_blank">Download Boleto</a></Button>
                </div>
              )}
              <Button variant="outline" onClick={() => setCheckoutResult(null)}>Voltar</Button>
            </Card>
          ) : (
            <Card>
              <CardHeader><CardTitle>Pagamento</CardTitle></CardHeader>
              <CardContent>
                <Tabs defaultValue="PIX">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="PIX"><QrCode className="w-4 h-4 mr-2" /> PIX</TabsTrigger>
                    <TabsTrigger value="BOLETO"><FileText className="w-4 h-4 mr-2" /> Boleto</TabsTrigger>
                    <TabsTrigger value="CREDIT_CARD"><CreditCard className="w-4 h-4 mr-2" /> Cartão</TabsTrigger>
                  </TabsList>
                  <TabsContent value="PIX" className="pt-4"><Button onClick={() => handleCheckout('PIX')} className="w-full">Gerar PIX</Button></TabsContent>
                  <TabsContent value="BOLETO" className="pt-4"><Button onClick={() => handleCheckout('BOLETO')} className="w-full">Gerar Boleto</Button></TabsContent>
                  <TabsContent value="CREDIT_CARD" className="pt-4">Formulário de cartão...</TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-6">
           <Card>
             <CardHeader><CardTitle>Faturamento</CardTitle></CardHeader>
             <CardContent className="space-y-4">
                <Input value={billingInfo.name} onChange={(e) => setBillingInfo({...billingInfo, name: e.target.value})} placeholder="Nome/Razão Social" />
                <Input value={billingInfo.taxId} onChange={(e) => setBillingInfo({...billingInfo, taxId: e.target.value})} placeholder="CPF/CNPJ" />
                <Input value={billingInfo.cep} onChange={(e) => setBillingInfo({...billingInfo, cep: e.target.value})} placeholder="CEP" />
                <Button onClick={handleSaveBilling} disabled={saving} className="w-full">Salvar</Button>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
