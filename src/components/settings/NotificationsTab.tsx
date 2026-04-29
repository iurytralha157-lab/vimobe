import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/integrations/supabase/client';
import { Bell, BellOff, Loader2, RefreshCw, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export const NotificationsTab = () => {
  const {
    isSupported,
    permission,
    subscription,
    swStatus,
    synced,
    subscribeUser,
    unsubscribeUser,
    refreshSubscription,
  } = usePushNotifications();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (subscription) {
        await unsubscribeUser();
        toast.success('Notificações desativadas');
      } else {
        const sub = await subscribeUser();
        if (sub) toast.success('Notificações ativadas com sucesso!');
      }
    } catch (err: any) {
      console.error('[Push] Toggle error:', err);
      toast.error(err?.message || 'Erro ao processar notificações');
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Você precisa estar logado para testar.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-push', {
        body: {
          user_id: user.id,
          title: 'Teste de Notificação 🚀',
          message: 'Se você está vendo isso, as notificações PWA estão funcionando!',
          url: '/notifications',
        },
      });

      if (error) throw error;
      if (data && data.success === false) {
        const reason = data.message || 'Inscrição não encontrada no servidor.';
        toast.error(`Não foi possível enviar: ${reason}`);
        return;
      }
      toast.success('Notificação de teste enviada! Aguarde alguns segundos.');
    } catch (err: any) {
      console.error('[Push] Test error:', err);
      toast.error(err?.message || 'Erro ao enviar teste.');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      const success = await refreshSubscription();
      if (success) {
        toast.success('Inscrição sincronizada com sucesso!');
      } else {
        // Se não sincronizou, talvez precise re-inscrever
        if (permission === 'granted') {
          await subscribeUser();
          toast.success('Serviço reativado e sincronizado.');
        } else {
          toast.error('Não foi possível sincronizar. Tente ativar novamente.');
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao sincronizar.');
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notificações Push</CardTitle>
          <CardDescription>
            Este navegador não suporta notificações PWA. No iPhone, instale o app na Tela de Início (Compartilhar → Adicionar à Tela de Início) e abra-o como aplicativo.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const StatusRow = ({
    label,
    ok,
    warn,
    text,
  }: { label: string; ok: boolean; warn?: boolean; text: string }) => (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 font-medium">
        {ok ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
        ) : warn ? (
          <AlertCircle className="h-3.5 w-3.5 text-warning" />
        ) : (
          <XCircle className="h-3.5 w-3.5 text-destructive" />
        )}
        {text}
      </span>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Notificações Push</CardTitle>
          <CardDescription>
            Receba alertas de leads e mensagens mesmo com o app fechado.
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSync}
          disabled={loading}
          title="Sincronizar com o servidor"
        >
          <RefreshCw className={`h-4 w-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${subscription ? 'bg-success/10' : 'bg-muted'}`}>
              {subscription ? (
                <Bell className="h-5 w-5 text-success" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-semibold text-sm">
                Status: {subscription ? 'Ativado' : 'Desativado'}
              </p>
              <p className="text-xs text-muted-foreground">
                {permission === 'denied'
                  ? 'Acesso bloqueado. Ative manualmente nas configurações do iOS/Android.'
                  : subscription
                    ? 'Dispositivo pronto para receber notificações.'
                    : 'Toque em Ativar para solicitar permissão.'}
              </p>
            </div>
          </div>

          <div className="flex w-full sm:w-auto gap-2">
            {subscription && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={handleTestNotification}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar Teste'}
              </Button>
            )}
            <Button
              variant={subscription ? 'secondary' : 'default'}
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={handleToggle}
              disabled={loading || permission === 'denied'}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : subscription ? (
                'Desativar'
              ) : (
                <span className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Ativar Agora
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Diagnostic status */}
        <div className="rounded-lg border bg-card p-3 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Diagnóstico</p>
          <StatusRow
            label="Permissão do navegador"
            ok={permission === 'granted'}
            warn={permission === 'default'}
            text={
              permission === 'granted' ? 'Concedida' : permission === 'denied' ? 'Bloqueada' : 'Pendente'
            }
          />
          <StatusRow
            label="Service Worker"
            ok={swStatus === 'active'}
            warn={swStatus === 'installing' || swStatus === 'waiting'}
            text={
              swStatus === 'active'
                ? 'Ativo'
                : swStatus === 'installing'
                  ? 'Instalando…'
                  : swStatus === 'waiting'
                    ? 'Aguardando ativar'
                    : swStatus === 'unknown'
                      ? 'Verificando…'
                      : 'Não registrado'
            }
          />
          <StatusRow
            label="Inscrição sincronizada"
            ok={!!subscription && synced}
            warn={!!subscription && !synced}
            text={subscription ? (synced ? 'Sincronizada' : 'Pendente') : 'Sem inscrição'}
          />
        </div>

        {permission === 'default' && !subscription && (
          <p className="text-[10px] text-center text-muted-foreground italic">
            * No iPhone, é preciso instalar o app na Tela de Início primeiro (Safari → Compartilhar → Adicionar à Tela de Início).
          </p>
        )}
      </CardContent>
    </Card>
  );
};
