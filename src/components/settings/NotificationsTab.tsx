import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const NotificationsTab = () => {
  const { isSupported, permission, subscription, subscribeUser, unsubscribeUser } = usePushNotifications();

  const handleToggle = async () => {
    if (subscription) {
      await unsubscribeUser();
      toast.success('Notificações desativadas');
    } else {
      const sub = await subscribeUser();
      if (sub) {
        toast.success('Notificações ativadas com sucesso!');
      } else if (permission === 'denied') {
        toast.error('Permissão de notificação negada. Por favor, ative nas configurações do navegador.');
      }
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
          <Button 
            variant={subscription ? "outline" : "default"}
            onClick={handleToggle}
          >
            {subscription ? 'Desativar' : 'Ativar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
