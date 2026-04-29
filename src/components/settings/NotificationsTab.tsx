import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/integrations/supabase/client';
import { Bell, BellOff, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export const NotificationsTab = () => {
  const { isSupported, permission, subscription, subscribeUser, unsubscribeUser, refreshSubscription } = usePushNotifications();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (subscription) {
        await unsubscribeUser();
        toast.success('Notificações desativadas');
      } else {
        const sub = await subscribeUser();
        if (sub) {
          toast.success('Notificações ativadas com sucesso!');
        }
      }
    } catch (err: any) {
      console.error('[Push] Toggle error:', err);
      toast.error(`Erro: ${err.message || 'Erro ao processar notificações'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('send-push', {
        body: {
          user_id: user.id,
          title: 'Teste de Notificação 🚀',
          message: 'Se você está vendo isso, as notificações PWA estão funcionando corretamente!',
          url: '/settings?tab=notifications'
        }
      });

      if (error) throw error;
      toast.success('Notificação de teste enviada!');
    } catch (err) {
      console.error('[Push] Test error:', err);
      toast.error('Erro ao enviar teste. Verifique se o app está aberto.');
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
            Este navegador não suporta notificações PWA ou o site não foi instalado como App.
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
            Receba alertas de leads e mensagens mesmo com o app fechado.
          </CardDescription>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => refreshSubscription()}
          title="Sincronizar"
        >
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
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
                  ? 'Acesso bloqueado pelo sistema. Ative nas configurações do iOS/Android.' 
                  : subscription 
                    ? 'Dispositivo pronto para receber notificações.' 
                    : 'Clique para solicitar permissão de envio.'}
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
              variant={subscription ? "secondary" : "default"}
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={handleToggle}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Ativar Agora
                </div>
              )}
            </Button>
          </div>
        </div>
        
        {permission === 'default' && !subscription && (
          <p className="text-[10px] text-center text-muted-foreground italic">
            * No iOS, você precisa ter o App adicionado à Tela de Início primeiro.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
