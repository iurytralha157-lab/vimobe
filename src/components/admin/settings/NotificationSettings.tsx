import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Loader2, 
  Save, 
  Bell, 
  Mail, 
  Smartphone, 
  Plus, 
  Trash2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { SystemSettings, SystemSettingsValue } from '@/hooks/use-system-settings';

interface NotificationSettingsProps {
  settings: SystemSettings | null;
  onUpdate: (updates: Partial<SystemSettingsValue>) => Promise<void>;
}

export function NotificationSettings({ settings, onUpdate }: NotificationSettingsProps) {
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    email_enabled: false,
    push_enabled: false,
    sms_enabled: false,
    templates: [] as Array<{
      type: string;
      trigger: string;
      subject: string;
      body: string;
    }>
  });

  useEffect(() => {
    if (settings && settings.notifications_config) {
      setConfig(settings.notifications_config);
    }
  }, [settings]);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await onUpdate({ notifications: config });
      toast.success('Configurações de notificações salvas!');
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const addTemplate = () => {
    setConfig({
      ...config,
      templates: [
        ...config.templates,
        { type: 'email', trigger: '', subject: '', body: '' }
      ]
    });
  };

  const removeTemplate = (index: number) => {
    const newTemplates = [...config.templates];
    newTemplates.splice(index, 1);
    setConfig({ ...config, templates: newTemplates });
  };

  const updateTemplate = (index: number, field: string, value: string) => {
    const newTemplates = [...config.templates];
    (newTemplates[index] as any)[field] = value;
    setConfig({ ...config, templates: newTemplates });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Canais de Notificação</CardTitle>
          <CardDescription>Ative ou desative os canais de comunicação do sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-blue-500" />
                <div>
                  <Label className="text-base">Notificações por E-mail</Label>
                  <p className="text-sm text-muted-foreground">Envio de alertas e confirmações via e-mail.</p>
                </div>
              </div>
              <Switch 
                checked={config.email_enabled} 
                onCheckedChange={(checked) => setConfig({ ...config, email_enabled: checked })} 
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-purple-500" />
                <div>
                  <Label className="text-base">Notificações Push</Label>
                  <p className="text-sm text-muted-foreground">Alertas em tempo real no navegador ou app.</p>
                </div>
              </div>
              <Switch 
                checked={config.push_enabled} 
                onCheckedChange={(checked) => setConfig({ ...config, push_enabled: checked })} 
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-green-500" />
                <div>
                  <Label className="text-base">Notificações SMS</Label>
                  <p className="text-sm text-muted-foreground">Envio de mensagens curtas para celulares (requer integração ativa).</p>
                </div>
              </div>
              <Switch 
                checked={config.sms_enabled} 
                onCheckedChange={(checked) => setConfig({ ...config, sms_enabled: checked })} 
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveConfig} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Canais
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Templates de Notificação</CardTitle>
              <CardDescription>Gerencie os textos das notificações automáticas do sistema.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addTemplate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {config.templates.length > 0 ? (
            config.templates.map((template, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4 bg-muted/30">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select 
                        value={template.type} 
                        onValueChange={(val) => updateTemplate(index, 'type', val)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">E-mail</SelectItem>
                          <SelectItem value="push">Push</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Gatilho (Trigger)</Label>
                      <Input 
                        value={template.trigger} 
                        onChange={(e) => updateTemplate(index, 'trigger', e.target.value)}
                        placeholder="Ex: novo_usuario"
                      />
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive mt-6" onClick={() => removeTemplate(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Assunto (opcional para SMS/Push)</Label>
                  <Input 
                    value={template.subject} 
                    onChange={(e) => updateTemplate(index, 'subject', e.target.value)}
                    placeholder="Assunto da notificação"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Corpo da Mensagem</Label>
                  <Textarea 
                    value={template.body} 
                    onChange={(e) => updateTemplate(index, 'body', e.target.value)}
                    placeholder="Olá {{nome_usuario}}, ..."
                    className="min-h-[100px]"
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Use {"{{variavel}}"} para campos dinâmicos.
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
              <AlertCircle className="h-10 w-10 mb-2 opacity-20" />
              <p>Nenhum template cadastrado.</p>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={handleSaveConfig} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Todos Templates
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
