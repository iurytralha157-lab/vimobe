import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/integrations/supabase/client';
import { Bell, BellOff, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export const NotificationsTab = () => {
  const {
    isSupported,
    permission,
    subscription,
    synced,
    isPreparing,
    subscribeUser,
    unsubscribeUser,
    refreshSubscription,
  } = usePushNotifications();
  const [loading, setLoading] = useState(false);

  // Auto-sync on mount
  useEffect(() => {
    if (permission === 'granted' && !synced && !loading) {
      refreshSubscription();
    }
  }, [permission, synced, loading, refreshSubscription]);

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

      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: user.id,
          title: 'Teste de Notificação 🚀',
          message: 'Se você está vendo isso, as notificações nativas estão funcionando!',
          url: '/notifications',
        },
      });

      if (error) throw error;
      if (data && data.success === false) {
        toast.error(`Não foi possível enviar: ${data.message || 'Erro desconhecido'}`);
        return;
      }
      toast.success('Notificação de teste enviada!');
    } catch (err: any) {
      console.error('[Push] Test error:', err);
      toast.error(err?.message || 'Erro ao enviar teste.');
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
            Este navegador não suporta notificações nativas. No iPhone, instale o app na Tela de Início (Safari → Compartilhar → Adicionar à Tela de Início).
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Notificações Push</CardTitle>
          <CardDescription>
            Receba alertas de leads e mensagens instantaneamente.
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refreshSubscription()}
          disabled={loading || isPreparing}
          title="Sincronizar"
        >
          <RefreshCw className={`h-4 w-4 text-muted-foreground ${(loading || isPreparing) ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${subscription && synced ? 'bg-success/10' : 'bg-muted'}`}>
              {subscription && synced ? (
                <Bell className="h-5 w-5 text-success" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-semibold text-sm">
                Status: {subscription ? (synced ? 'Ativo' : 'Sincronizando...') : 'Desativado'}
              </p>
              <p className="text-xs text-muted-foreground">
                {permission === 'denied'
                  ? 'Permissão bloqueada nas configurações do sistema.'
                  : subscription
                    ? 'Tudo pronto! Seu dispositivo está registrado.'
                    : 'Clique em Ativar para receber notificações neste dispositivo.'}
              </p>
            </div>
          </div>

          <div className="flex w-full sm:w-auto gap-2">
            {subscription && synced && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={handleTestNotification}
                disabled={loading}
              >
                Testar
              </Button>
            )}
            <Button
              variant={subscription ? 'secondary' : 'default'}
              size="lg"
              className="flex-1 sm:flex-none font-bold h-12 px-8 text-base shadow-lg animate-pulse"
              onClick={handleToggle}
              disabled={loading || isPreparing || permission === 'denied'}
            >
              {loading || isPreparing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : subscription ? (
                'Desativar'
              ) : (
                '🚀 ATIVAR NOTIFICAÇÕES AGORA'
              )}
            </Button>
          </div>
        </div>

        {permission === 'default' && !subscription && (
          <p className="text-[10px] text-center text-muted-foreground italic">
            * No iPhone, use "Adicionar à Tela de Início" para habilitar notificações.
          </p>
        )}
      </CardContent>
    </Card>
  );
};