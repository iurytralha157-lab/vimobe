import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Webhook, 
  Copy, 
  Plus, 
  Trash2, 
  Loader2,
  ExternalLink,
  Key
} from 'lucide-react';
import { useWebhooks, useDeleteWebhook, useToggleWebhook } from '@/hooks/use-webhooks';
import { toast } from 'sonner';

export function WebhooksTab() {
  const { data: webhooks = [], isLoading } = useWebhooks();
  const deleteWebhook = useDeleteWebhook();
  const toggleWebhook = useToggleWebhook();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  const webhookBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wordpress-webhook`;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhooks
          </CardTitle>
          <CardDescription>
            Configure endpoints para receber leads de fontes externas
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Webhooks List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-medium mb-2">Nenhum webhook configurado</h3>
            <p className="text-sm">Configure webhooks via integrações</p>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map((webhook) => (
              <Card key={webhook.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{webhook.name}</h4>
                      <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                        {webhook.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={webhook.is_active || false}
                        onCheckedChange={() => toggleWebhook.mutate({ id: webhook.id, is_active: !webhook.is_active })}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteWebhook.mutate(webhook.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {webhook.url && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input 
                        value={webhook.url} 
                        readOnly 
                        className="font-mono text-sm"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => copyToClipboard(webhook.url)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Documentation */}
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <h4 className="font-medium mb-2">URL Padrão do Webhook</h4>
            <div className="flex gap-2">
              <Input value={webhookBaseUrl} readOnly className="font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookBaseUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
