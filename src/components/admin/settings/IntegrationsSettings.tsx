import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, MessageSquare, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { SystemSettings, SystemSettingsValue } from '@/hooks/use-system-settings';

interface IntegrationsSettingsProps {
  settings: SystemSettings | null;
  onUpdate: (updates: Partial<SystemSettingsValue>) => Promise<void>;
}

export function IntegrationsSettings({ settings, onUpdate }: IntegrationsSettingsProps) {
  const [saving, setSaving] = useState(false);
  const [whatsapp, setWhatsapp] = useState({
    contact_number: '',
    notification_instance: ''
  });

  useEffect(() => {
    if (settings) {
      const value = (settings.value as SystemSettingsValue) || {};
      setWhatsapp({
        contact_number: value.contact_whatsapp || '',
        notification_instance: value.notification_instance_name || ''
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({ 
        contact_whatsapp: whatsapp.contact_number,
        notification_instance_name: whatsapp.notification_instance
      });
      toast.success('Configurações de integração salvas com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-500" />
            <div>
              <CardTitle>Contato WhatsApp</CardTitle>
              <CardDescription>Número de WhatsApp para novos interessados</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Número do WhatsApp</Label>
            <Input 
              value={whatsapp.contact_number} 
              onChange={(e) => setWhatsapp({ ...whatsapp, contact_number: e.target.value })}
              placeholder="Ex: 5511999999999"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-blue-500" />
            <div>
              <CardTitle>WhatsApp de Notificações (Global)</CardTitle>
              <CardDescription>
                Configure uma instância WhatsApp central para enviar notificações automáticas. 
                Organizações que possuem seu próprio WhatsApp de notificação usarão o deles. 
                As demais receberão notificações por este WhatsApp global.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da Instância (Evolution API)</Label>
            <Input 
              value={whatsapp.notification_instance} 
              onChange={(e) => setWhatsapp({ ...whatsapp, notification_instance: e.target.value })}
              placeholder="Digite o nome da instância"
            />
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Alterações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
