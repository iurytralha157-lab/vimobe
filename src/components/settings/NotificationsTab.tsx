import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/integrations/supabase/client';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const NotificationsTab = () => {
  const { isSupported, permission, subscription, subscribeUser, unsubscribeUser } = usePushNotifications();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (subscription) {
        await unsubscribeUser();
        toast.success('Notificações desativadas');
      } else {
        console.log('Attempting to subscribe...');
        const sub = await subscribeUser();
        if (sub) {
          toast.success('Notificações ativadas com sucesso!');
        } else if (permission === 'denied') {
          toast.error('Permissão de notificação negada. Por favor, ative nas configurações do dispositivo.');
        } else {
          toast.error('Não foi possível completar a inscrição.');
        }
      }
    } catch (err: any) {
      console.error('Detailed error in handleToggle:', err);
      const errorMessage = err.message || 'Erro desconhecido';
      // Log specific known errors to help debugging
      if (errorMessage.includes('Registration failed')) {
        toast.error('Falha no registro do Service Worker. Tente recarregar a página.');
      } else if (errorMessage.includes('Permission')) {
        toast.error('Permissão de notificação não concedida.');
      } else {
        toast.error(`Erro ao processar notificações: ${errorMessage}`);
      }
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
          title: 'Teste de Notificação',
          message: 'Esta é uma notificação de teste enviada via Web Push API!',
          url: '/settings?tab=notifications'
        }
      });

      if (error) throw error;
      toast.success('Solicitação de teste enviada!');
    } catch (err) {
      console.error('Erro ao testar push:', err);
      toast.error('Erro ao enviar notificação de teste.');
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
            Seu navegador não suporta notificações push nativas.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificações Push</CardTitle>
        <CardDescription>
          Receba notificações em tempo real diretamente no seu dispositivo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {subscription ? (
              <Bell className="h-5 w-5 text-success" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">
                {subscription ? 'Notificações Ativas' : 'Notificações Inativas'}
              </p>
              <p className="text-sm text-muted-foreground">
                {permission === 'denied' 
                  ? 'Permissão negada no navegador' 
                  : subscription 
                    ? 'Você está inscrito para receber notificações neste dispositivo.' 
                    : 'Clique no botão para ativar as notificações.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={handleTestNotification}
              disabled={!subscription || loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar'}
            </Button>
            <Button 
              variant={subscription ? "destructive" : "default"}
              onClick={handleToggle}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (subscription ? 'Desativar' : 'Ativar')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};