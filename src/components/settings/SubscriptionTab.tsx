import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Calendar, History, Building2, User, Loader2, AlertCircle, CheckCircle2, Receipt } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SubscriptionTab() {
  const { organization, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  
  // Billing info form
  const [billingInfo, setBillingInfo] = useState({
    name: '',
    taxId: '', // CPF or CNPJ
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!organization?.id) return;
      
      try {
        // Fetch org and plan
        const { data: org } = await (supabase as any)
          .from('organizations')
          .select('*')
          .eq('id', organization.id)
          .maybeSingle();

        let plan = null;
        if (org?.plan_id) {
          const { data: p } = await (supabase as any)
            .from('admin_subscription_plans')
            .select('*')
            .eq('id', org.plan_id)
            .maybeSingle();
          plan = p;
        }

        // Fetch history
        const { data: hist } = await (supabase as any)
          .from('organization_subscriptions')
          .select('*')
          .eq('organization_id', organization.id)
          .order('due_date', { ascending: false });

        setData({ org, plan });
        setHistory(hist || []);

        // Initialize billing info from org or user
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
      } catch (error) {
        console.error('Error fetching subscription data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organization?.id]);

  const handleSaveBilling = async () => {
    if (!organization?.id) return;
    setSaving(true);
    try {
      const isCnpj = billingInfo.taxId.replace(/\D/g, '').length > 11;
      
      const { error } = await (supabase as any)
        .from('organizations')
        .update({
          razao_social: billingInfo.name,
          cnpj: isCnpj ? billingInfo.taxId : null,
          cep: billingInfo.cep,
          endereco: billingInfo.endereco,
          numero: billingInfo.numero,
          complemento: billingInfo.complemento,
          bairro: billingInfo.bairro,
          cidade: billingInfo.cidade,
          uf: billingInfo.uf,
        })
        .eq('id', organization.id);

      if (error) throw error;
      toast.success('Dados de faturamento atualizados!');
      await refreshProfile();
    } catch (error) {
      console.error('Error saving billing info:', error);
      toast.error('Erro ao salvar dados de faturamento');
    } finally {
      setSaving(false);
    }
  };

  const autoFillFromUser = () => {
    if (!profile) return;
    setBillingInfo({
      name: profile.name || '',
      taxId: profile.cpf || '',
      cep: profile.cep || '',
      endereco: profile.endereco || '',
      numero: profile.numero || '',
      complemento: profile.complemento || '',
      bairro: profile.bairro || '',
      cidade: profile.cidade || '',
      uf: profile.uf || '',
    });
    toast.info('Dados preenchidos a partir do seu perfil');
  };

  const autoFillFromOrg = () => {
    if (!data?.org) return;
    const org = data.org;
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
    toast.info('Dados preenchidos a partir da empresa');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  const org = data?.org;
  const plan = data?.plan;
  const status = org?.subscription_status || 'pending';
  const nextBilling = org?.next_billing_date;

  const statusLabel: Record<string, { label: string; variant: any }> = {
    active: { label: 'Ativa', variant: 'default' },
    trial: { label: 'Trial', variant: 'secondary' },
    pending: { label: 'Pagamento pendente', variant: 'destructive' },
    overdue: { label: 'Atrasada', variant: 'destructive' },
    canceled: { label: 'Cancelada', variant: 'outline' },
  };
  const s = statusLabel[status] || { label: status, variant: 'secondary' };

  const isBillingInfoComplete = billingInfo.name && billingInfo.taxId && billingInfo.cep && billingInfo.endereco;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Plan Summary & Status */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden border-primary/10">
            <CardHeader className="bg-primary/5 pb-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    {plan?.name || 'Nenhum plano selecionado'}
                  </CardTitle>
                  <CardDescription>
                    {plan ? `Plano ${plan.billing_cycle === 'monthly' ? 'Mensal' : 'Anual'}` : 'Selecione um plano para continuar'}
                  </CardDescription>
                </div>
                <Badge variant={s.variant} className="px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                  {s.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium uppercase tracking-tight">Próximo Vencimento</p>
                      <p className="text-lg font-bold">
                        {nextBilling ? format(new Date(nextBilling), "dd 'de' MMMM, yyyy", { locale: ptBR }) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  {plan && (
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Receipt className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground font-medium uppercase tracking-tight">Valor da Assinatura</p>
                        <p className="text-lg font-bold">
                          {Number(plan.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          <span className="text-sm font-normal text-muted-foreground ml-1">/ {plan.billing_cycle === 'monthly' ? 'mês' : 'ano'}</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-center gap-4">
                  {status !== 'active' && plan && (
                    <Button 
                      onClick={() => navigate(`/checkout/${org?.checkout_token}`)} 
                      size="lg" 
                      className="w-full shadow-lg shadow-primary/20"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pagar Fatura Agora
                    </Button>
                  )}
                  {status === 'active' && (
                    <div className="bg-success/10 border border-success/20 rounded-xl p-4 flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                      <div>
                        <p className="font-semibold text-success">Assinatura em dia</p>
                        <p className="text-sm text-success/80">Obrigado por utilizar nossa plataforma!</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                Histórico de Pagamentos
              </CardTitle>
              <CardDescription>
                Você já realizou {history.filter(h => h.status === 'paid').length} pagamentos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {history.length > 0 ? (
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 font-medium">Data</th>
                        <th className="px-4 py-3 font-medium">Valor</th>
                        <th className="px-4 py-3 font-medium">Método</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-right">Fatura</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {history.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-4 whitespace-nowrap">
                            {format(new Date(item.due_date), 'dd/MM/yyyy')}
                          </td>
                          <td className="px-4 py-4 font-medium">
                            {Number(item.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">
                            {item.payment_method === 'credit_card' ? 'Cartão' : 
                             item.payment_method === 'pix' ? 'Pix' : 
                             item.payment_method === 'boleto' ? 'Boleto' : item.payment_method || '-'}
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant={item.status === 'paid' ? 'default' : 'secondary'} className="text-[10px]">
                              {item.status === 'paid' ? 'Pago' : 'Pendente'}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 text-right">
                            {item.invoice_url ? (
                              <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                                <a href={item.invoice_url} target="_blank" rel="noreferrer">
                                  <History className="h-4 w-4" />
                                </a>
                              </Button>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">Nenhum histórico de pagamento encontrado.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Billing Information */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados de Faturamento</CardTitle>
              <CardDescription>Informações necessárias para geração de faturas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isBillingInfoComplete && (
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 flex items-start gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                  <p className="text-xs text-warning-foreground font-medium">
                    Complete seus dados para automatizar seus próximos pagamentos.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pb-2">
                <Button variant="outline" size="sm" className="flex-1 text-[10px] h-8" onClick={autoFillFromUser}>
                  <User className="h-3 w-3 mr-1" /> Usar meus dados
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-[10px] h-8" onClick={autoFillFromOrg}>
                  <Building2 className="h-3 w-3 mr-1" /> Usar dados empresa
                </Button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="billing-name" className="text-xs">Nome / Razão Social</Label>
                  <Input 
                    id="billing-name" 
                    value={billingInfo.name} 
                    onChange={(e) => setBillingInfo(prev => ({ ...prev, name: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="billing-taxid" className="text-xs">CPF ou CNPJ</Label>
                  <Input 
                    id="billing-taxid" 
                    value={billingInfo.taxId} 
                    onChange={(e) => setBillingInfo(prev => ({ ...prev, taxId: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="billing-cep" className="text-xs">CEP</Label>
                    <Input 
                      id="billing-cep" 
                      value={billingInfo.cep} 
                      onChange={(e) => setBillingInfo(prev => ({ ...prev, cep: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="billing-street" className="text-xs">Endereço</Label>
                    <Input 
                      id="billing-street" 
                      value={billingInfo.endereco} 
                      onChange={(e) => setBillingInfo(prev => ({ ...prev, endereco: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="billing-number" className="text-xs">Número</Label>
                    <Input 
                      id="billing-number" 
                      value={billingInfo.numero} 
                      onChange={(e) => setBillingInfo(prev => ({ ...prev, numero: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="billing-bairro" className="text-xs">Bairro</Label>
                    <Input 
                      id="billing-bairro" 
                      value={billingInfo.bairro} 
                      onChange={(e) => setBillingInfo(prev => ({ ...prev, bairro: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="billing-city" className="text-xs">Cidade</Label>
                    <Input 
                      id="billing-city" 
                      value={billingInfo.cidade} 
                      onChange={(e) => setBillingInfo(prev => ({ ...prev, cidade: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="billing-uf" className="text-xs">UF</Label>
                    <Input 
                      id="billing-uf" 
                      value={billingInfo.uf} 
                      onChange={(e) => setBillingInfo(prev => ({ ...prev, uf: e.target.value.toUpperCase() }))}
                      className="h-9 text-sm"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleSaveBilling} 
                className="w-full mt-2" 
                variant="secondary"
                disabled={saving}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Dados de Faturamento
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
