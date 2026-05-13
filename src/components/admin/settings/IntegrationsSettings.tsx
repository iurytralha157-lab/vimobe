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
    enabled: false,
    api_key: '',
    phone_number: '',
    template_default: ''
  });
  const [sms, setSms] = useState({
    enabled: false,
    api_key: ''
  });

  useEffect(() => {
    if (settings) {
      if (settings.whatsapp_config) setWhatsapp(settings.whatsapp_config);
      if (settings.sms_config) setSms(settings.sms_config);
    }
  }, [settings]);

  const handleSave = async (section: 'whatsapp' | 'sms') => {
    setSaving(true);
    try {
      const updates = section === 'whatsapp' ? { whatsapp } : { sms };
      await onUpdate(updates);
      toast.success(`Configurações de ${section.toUpperCase()} salvas!`);
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-500" />
              <div>
                <CardTitle>Integração WhatsApp</CardTitle>
                <CardDescription>Configure a API de envio de mensagens via WhatsApp.</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="wa-enabled">Ativo</Label>
              <Switch 
                id="wa-enabled" 
                checked={whatsapp.enabled} 
                onCheckedChange={(checked) => setWhatsapp({ ...whatsapp, enabled: checked })} 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Chave da API (API Key)</Label>
              <Input 
                type="password" 
                value={whatsapp.api_key} 
                onChange={(e) => setWhatsapp({ ...whatsapp, api_key: e.target.value })}
                placeholder="Insira a chave da API"
              />
            </div>
            <div className="space-y-2">
              <Label>Número de Telefone</Label>
              <Input 
                value={whatsapp.phone_number} 
                onChange={(e) => setWhatsapp({ ...whatsapp, phone_number: e.target.value })}
                placeholder="Ex: 5511999999999"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Template de Mensagem Padrão</Label>
            <Textarea 
              value={whatsapp.template_default} 
              onChange={(e) => setWhatsapp({ ...whatsapp, template_default: e.target.value })}
              placeholder="Olá {{nome_usuario}}, ..."
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Dica: Use {"{{nome_usuario}}"} para personalizar a mensagem.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => handleSave('whatsapp')} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-blue-500" />
              <div>
                <CardTitle>Integração SMS</CardTitle>
                <CardDescription>Configure o serviço de envio de mensagens SMS.</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="sms-enabled">Ativo</Label>
              <Switch 
                id="sms-enabled" 
                checked={sms.enabled} 
                onCheckedChange={(checked) => setSms({ ...sms, enabled: checked })} 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Chave da API (API Key)</Label>
            <Input 
              type="password" 
              value={sms.api_key} 
              onChange={(e) => setSms({ ...sms, api_key: e.target.value })}
              placeholder="Insira a chave da API SMS"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => handleSave('sms')} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar SMS
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
