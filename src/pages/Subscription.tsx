import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, ExternalLink, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

export default function Subscription() {
  const { organization } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      if (!organization?.id) return;
      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, subscription_status, subscription_type, trial_ends_at, plan_id, checkout_token, asaas_subscription_id')
        .eq('id', organization.id)
        .maybeSingle();
      let plan = null;
      if (org?.plan_id) {
        const { data: p } = await supabase
          .from('admin_subscription_plans')
          .select('*')
          .eq('id', org.plan_id)
          .maybeSingle();
        plan = p;
      }
      setData({ org, plan });
      setLoading(false);
    })();
  }, [organization?.id]);

  if (loading) {
    return <div className="container py-8 max-w-3xl space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  const org = data?.org;
  const plan = data?.plan;
  const status = org?.subscription_status || 'pending';
  const checkoutUrl = org?.checkout_token ? `${window.location.origin}/checkout/${org.checkout_token}` : null;

  const statusLabel: Record<string, { label: string; variant: any }> = {
    active: { label: 'Ativa', variant: 'default' },
    trial: { label: 'Trial', variant: 'secondary' },
    pending: { label: 'Pagamento pendente', variant: 'destructive' },
    overdue: { label: 'Atrasada', variant: 'destructive' },
  };
  const s = statusLabel[status] || { label: status, variant: 'secondary' };

  return (
    <div className="container py-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Assinatura</h1>
        <p className="text-muted-foreground">Gerencie seu plano e pagamentos</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{plan?.name || 'Sem plano selecionado'}</CardTitle>
            {plan && (
              <p className="text-sm text-muted-foreground mt-1">
                {Number(plan.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                {plan.billing_cycle === 'monthly' && '/mês'}
              </p>
            )}
          </div>
          <Badge variant={s.variant}>{s.label}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {plan && status !== 'active' && (
            <Button onClick={() => navigate(`/checkout/${org.checkout_token}`)} className="w-full" size="lg">
              <CreditCard className="h-4 w-4 mr-2" />
              Pagar agora
            </Button>
          )}

          {checkoutUrl && (
            <div className="border rounded-2xl p-4 space-y-2">
              <p className="text-sm font-medium">Link de pagamento compartilhável</p>
              <p className="text-xs text-muted-foreground">Envie esse link para concluir o pagamento de qualquer lugar.</p>
              <div className="flex gap-2">
                <input className="flex-1 text-xs bg-muted px-3 py-2 rounded-md" value={checkoutUrl} readOnly />
                <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(checkoutUrl); toast.success('Link copiado!'); }}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" asChild>
                  <a href={checkoutUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                </Button>
              </div>
            </div>
          )}

          {!plan && (
            <p className="text-sm text-muted-foreground">
              Nenhum plano selecionado para esta organização. Entre em contato com o suporte.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
