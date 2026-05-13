import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Loader2, 
  Plus, 
  Trash2,
  MessageSquare,
  History,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { NotificationTemplate, NotificationChannel } from '@/services/NotificationService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function NotificationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [originalTemplates, setOriginalTemplates] = useState<NotificationTemplate[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState('templates');
  const [changedIds, setChangedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: templatesData, error: templatesError } = await supabase
        .from('notification_templates' as any)
        .select('*')
        .order('name');
      
      if (templatesError) throw templatesError;
      const data = templatesData as any[] || [];
      setTemplates(data);
      setOriginalTemplates(JSON.parse(JSON.stringify(data)));

      const { data: logsData, error: logsError } = await supabase
        .from('notification_logs' as any)
        .select(`
          *,
          template:notification_templates(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (logsError) throw logsError;
      setLogs(logsData as any[] || []);
    } catch (error: any) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Não foi possível carregar os templates. Verifique se as tabelas foram criadas.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (id: string) => {
    const template = templates.find(t => t.id === id);
    if (!template) return;

    setSaving(id);
    try {
      const { error } = await supabase
        .from('notification_templates' as any)
        .update({
          name: template.name,
          message: template.message,
          channel: template.channel,
          is_active: template.is_active,
          category: template.category
        })
        .eq('id', id);

      if (error) throw error;
      
      // Update original state to match current
      setOriginalTemplates(prev => prev.map(t => t.id === id ? { ...template } : t));
      setChangedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success('Template salvo com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setSaving(null);
    }
  };

  const handleCancelEdit = (id: string) => {
    const original = originalTemplates.find(t => t.id === id);
    if (!original) return;

    setTemplates(prev => prev.map(t => t.id === id ? { ...original } : t));
    setChangedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleLocalUpdate = (id: string, updates: Partial<NotificationTemplate>) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    setChangedIds(prev => new Set(prev).add(id));
  };

  const handleAddTemplate = async () => {
    const newTemplate = {
      name: 'Novo Template',
      slug: `new_template_${Date.now()}`,
      channel: 'whatsapp' as NotificationChannel,
      message: 'Olá {name}, sua mensagem aqui.',
      category: 'info',
      variables: ['name'],
      is_active: true
    };

    try {
      const { data, error } = await supabase
        .from('notification_templates' as any)
        .insert([newTemplate])
        .select()
        .single();

      if (error) throw error;
      const created = data as any;
      setTemplates([created, ...templates]);
      setOriginalTemplates([JSON.parse(JSON.stringify(created)), ...originalTemplates]);
      toast.success('Novo template criado!');
    } catch (error: any) {
      toast.error('Erro ao criar template: ' + error.message);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;

    try {
      const { error } = await supabase
        .from('notification_templates' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTemplates(prev => prev.filter(t => t.id !== id));
      setOriginalTemplates(prev => prev.filter(t => t.id !== id));
      setChangedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success('Template removido.');
    } catch (error: any) {
      toast.error('Erro ao remover: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Templates de Notificações</h3>
              <p className="text-sm text-muted-foreground">Centralize e personalize todas as mensagens enviadas.</p>
            </div>
            <Button onClick={handleAddTemplate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className={cn(
                "overflow-hidden transition-all border-2 flex flex-col h-full",
                changedIds.has(template.id) ? "border-primary shadow-md" : "border-transparent"
              )}>
                <CardHeader className="bg-muted/30 pb-4 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base truncate">{template.name}</CardTitle>
                        <Badge variant={template.is_active ? "default" : "secondary"} className="shrink-0">
                          {template.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Badge variant="outline" className="capitalize shrink-0">
                          {template.channel}
                        </Badge>
                      </div>
                      <code className="text-[10px] text-muted-foreground block truncate">{template.slug}</code>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch 
                        checked={template.is_active} 
                        onCheckedChange={(checked) => handleLocalUpdate(template.id, { is_active: checked })}
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive h-8 w-8 hover:bg-destructive/10" 
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4 flex-1 flex flex-col">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground font-bold">Nome amigável</Label>
                      <Input 
                        value={template.name} 
                        onChange={(e) => handleLocalUpdate(template.id, { name: e.target.value })}
                        className="bg-background h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground font-bold">Canal</Label>
                      <Select 
                        value={template.channel} 
                        onValueChange={(val: NotificationChannel) => handleLocalUpdate(template.id, { channel: val })}
                      >
                        <SelectTrigger className="bg-background h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="push">Push Notification</SelectItem>
                          <SelectItem value="system">Sistema (Interno)</SelectItem>
                          <SelectItem value="email">E-mail</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2 flex-1 flex flex-col min-h-[180px]">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase text-muted-foreground font-bold">Mensagem do Template</Label>
                      <span className="text-[10px] text-muted-foreground italic">Markdown suportado</span>
                    </div>
                    <Textarea 
                      value={template.message} 
                      onChange={(e) => handleLocalUpdate(template.id, { message: e.target.value })}
                      className="flex-1 font-mono text-xs bg-background resize-none leading-relaxed"
                    />
                    <div className="bg-muted/20 p-2 rounded-md border border-dashed mt-2">
                      <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">Variáveis disponíveis:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {template.variables && template.variables.length > 0 ? (
                          template.variables.map((v, i) => (
                            <Badge key={i} variant="secondary" className="text-[9px] font-mono px-1.5 py-0 h-4">
                              {`{${v}}`}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[9px] text-muted-foreground italic">Nenhuma variável configurada</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-4 border-t mt-auto shrink-0">
                    <div className="flex items-center gap-2">
                      {changedIds.has(template.id) ? (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleCancelEdit(template.id)}
                            disabled={saving === template.id}
                            className="h-8 text-xs"
                          >
                            Descartar
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleSaveTemplate(template.id)}
                            disabled={saving === template.id}
                            className="gap-2 h-8 text-xs bg-green-600 hover:bg-green-700"
                          >
                            {saving === template.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                            Salvar
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          Sincronizado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground">ID: {template.id.split('-')[0]}...</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Logs de Disparo</CardTitle>
              <CardDescription>Acompanhe em tempo real as notificações enviadas pelo sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Data/Hora</th>
                      <th className="px-4 py-3 text-left font-medium">Template</th>
                      <th className="px-4 py-3 text-left font-medium">Canal</th>
                      <th className="px-4 py-3 text-left font-medium">Destinatário</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length > 0 ? (
                      logs.map((log) => (
                        <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {format(new Date(log.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {log.template?.name || 'Manual / Removido'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="capitalize text-[10px]">
                              {log.channel}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground truncate max-w-[150px]">
                            {log.recipient}
                          </td>
                          <td className="px-4 py-3">
                            {log.status === 'sent' ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="h-3 w-3" />
                                <span className="text-xs">Enviado</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-destructive">
                                <XCircle className="h-3 w-3" />
                                <span className="text-xs">Erro</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                          Nenhum disparo registrado recentemente.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
