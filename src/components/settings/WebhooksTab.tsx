import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Webhook,
  Plus,
  Copy,
  Trash2,
  RefreshCw,
  ExternalLink,
  Loader2,
  Check,
  AlertCircle,
  Code,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-react';
import { useWebhooks, useCreateWebhook, useUpdateWebhook, useDeleteWebhook, useToggleWebhook, useRegenerateToken } from '@/hooks/use-webhooks';
import { usePipelines, useStages } from '@/hooks/use-stages';
import { useTeams } from '@/hooks/use-teams';
import { useProperties } from '@/hooks/use-properties';
import { InlineTagSelector } from '@/components/ui/tag-selector';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export function WebhooksTab() {
  const { data: webhooks = [], isLoading } = useWebhooks();
  const { data: pipelines = [] } = usePipelines();
  const { data: teams = [] } = useTeams();
  const { data: properties = [] } = useProperties();
  const createWebhook = useCreateWebhook();
  const updateWebhook = useUpdateWebhook();
  const deleteWebhook = useDeleteWebhook();
  const toggleWebhook = useToggleWebhook();
  const regenerateToken = useRegenerateToken();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'incoming' as 'incoming' | 'outgoing',
    target_pipeline_id: '',
    target_team_id: '',
    target_stage_id: '',
    target_tag_ids: [] as string[],
    target_property_id: '',
  });

  // Get stages for selected pipeline
  const { data: stages = [] } = useStages(formData.target_pipeline_id || undefined);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generic-webhook`;

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Informe o nome do webhook');
      return;
    }

    await createWebhook.mutateAsync({
      name: formData.name.trim(),
      type: formData.type,
      target_pipeline_id: formData.target_pipeline_id || undefined,
      target_team_id: formData.target_team_id || undefined,
      target_stage_id: formData.target_stage_id || undefined,
      target_tag_ids: formData.target_tag_ids.length > 0 ? formData.target_tag_ids : undefined,
      target_property_id: formData.target_property_id || undefined,
    });

    setDialogOpen(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!selectedWebhook) return;

    await updateWebhook.mutateAsync({
      id: selectedWebhook.id,
      name: formData.name.trim(),
      target_pipeline_id: formData.target_pipeline_id || null,
      target_team_id: formData.target_team_id || null,
      target_stage_id: formData.target_stage_id || null,
      target_tag_ids: formData.target_tag_ids,
      target_property_id: formData.target_property_id || null,
    });

    setDialogOpen(false);
    setSelectedWebhook(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'incoming',
      target_pipeline_id: '',
      target_team_id: '',
      target_stage_id: '',
      target_tag_ids: [],
      target_property_id: '',
    });
  };

  const openEditDialog = (webhook: any) => {
    setSelectedWebhook(webhook);
    setFormData({
      name: webhook.name,
      type: webhook.type,
      target_pipeline_id: webhook.target_pipeline_id || '',
      target_team_id: webhook.target_team_id || '',
      target_stage_id: webhook.target_stage_id || '',
      target_tag_ids: webhook.target_tag_ids || [],
      target_property_id: webhook.target_property_id || '',
    });
    setDialogOpen(true);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este webhook?')) return;
    await deleteWebhook.mutateAsync(id);
  };

  const handleRegenerateToken = async (id: string) => {
    if (!confirm('Isso invalidará o token atual. Continuar?')) return;
    await regenerateToken.mutateAsync(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhooks
            </CardTitle>
            <CardDescription>
              Receba leads de sistemas externos através de webhooks
            </CardDescription>
          </div>
          <Button onClick={() => { resetForm(); setSelectedWebhook(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Webhook
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {webhooks.length === 0 ? (
            <div className="text-center py-12">
              <Webhook className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum webhook configurado</p>
              <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro webhook
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Info */}
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${webhook.type === 'incoming' ? 'bg-primary/10' : 'bg-warning/10'}`}>
                        {webhook.type === 'incoming' ? (
                          <ArrowDownToLine className="h-5 w-5 text-primary" />
                        ) : (
                          <ArrowUpFromLine className="h-5 w-5 text-warning" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium">{webhook.name}</h4>
                          <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                            {webhook.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                          <Badge variant="outline">
                            {webhook.type === 'incoming' ? 'Entrada' : 'Saída'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                          <span>{webhook.leads_received || 0} leads recebidos</span>
                          {webhook.last_lead_at && (
                            <span>
                              Último: {formatDistanceToNow(new Date(webhook.last_lead_at), { addSuffix: true, locale: ptBR })}
                            </span>
                          )}
                        </div>
                        {webhook.pipeline && (
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              Pipeline: {webhook.pipeline.name}
                            </Badge>
                            {webhook.stage && (
                              <Badge variant="outline" className="text-xs" style={{ borderColor: webhook.stage.color, color: webhook.stage.color }}>
                                Estágio: {webhook.stage.name}
                              </Badge>
                            )}
                            {webhook.team && (
                              <Badge variant="outline" className="text-xs">
                                Equipe: {webhook.team.name}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={webhook.is_active}
                        onCheckedChange={(checked) => toggleWebhook.mutate({ id: webhook.id, is_active: checked })}
                      />
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(webhook)}>
                        <Code className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(webhook.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Expandable details */}
                  {webhook.type === 'incoming' && (
                    <Accordion type="single" collapsible className="mt-4">
                      <AccordionItem value="details" className="border-none">
                        <AccordionTrigger className="py-2 text-sm">
                          Ver configuração
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            {/* URL */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">URL do Webhook</Label>
                              <div className="flex gap-2">
                                <Input value={webhookUrl} readOnly className="font-mono text-xs" />
                                <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl, 'URL')}>
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Token */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Token de Autenticação</Label>
                              <div className="flex gap-2">
                                <Input
                                  value={webhook.api_token}
                                  readOnly
                                  type="password"
                                  className="font-mono text-xs"
                                />
                                <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhook.api_token, 'Token')}>
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => handleRegenerateToken(webhook.id)}>
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Example */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Exemplo de Requisição</Label>
                              <div className="bg-muted rounded-lg p-3 font-mono text-xs overflow-x-auto">
                                <pre>{`curl -X POST "${webhookUrl}" \\
  -H "Authorization: Bearer ${webhook.api_token}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "João Silva",
    "phone": "11999999999",
    "email": "joao@email.com",
    "message": "Interesse no imóvel",
    "renda_familiar": "5000-10000",
    "trabalha": true,
    "profissao": "Engenheiro",
    "faixa_valor_imovel": "300000-500000",
    "finalidade_compra": "Moradia",
    "procura_financiamento": true
  }'`}</pre>
                              </div>
                            </div>

                            {/* Field mapping */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Mapeamento de Campos</Label>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {Object.entries(webhook.field_mapping || {}).map(([target, source]) => (
                                  <div key={target} className="flex items-center gap-2 bg-muted/50 rounded px-2 py-1">
                                    <span className="text-muted-foreground">{String(source)}</span>
                                    <span>→</span>
                                    <span className="font-medium">{target}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documentation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Code className="h-5 w-5" />
            Documentação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Como usar webhooks</h4>
            <p className="text-sm text-muted-foreground">
              Webhooks permitem que sistemas externos enviem leads automaticamente para o CRM.
              Configure um webhook de entrada, copie a URL e o token, e configure seu sistema para enviar requisições POST.
            </p>
          </div>
          <Separator />
          <div className="space-y-2">
            <h4 className="font-medium">Campos aceitos</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { field: 'name', required: true },
                { field: 'phone', required: false },
                { field: 'email', required: false },
                { field: 'message', required: false },
                { field: 'renda_familiar', required: false },
                { field: 'trabalha', required: false },
                { field: 'profissao', required: false },
                { field: 'faixa_valor_imovel', required: false },
                { field: 'finalidade_compra', required: false },
                { field: 'procura_financiamento', required: false },
              ].map(({ field, required }) => (
                <div key={field} className="bg-muted rounded px-3 py-2 text-sm font-mono">
                  {field}{required && <span className="text-destructive">*</span>}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">* Campo obrigatório</p>
            <p className="text-xs text-muted-foreground mt-1">
              Campos booleanos (trabalha, procura_financiamento) aceitam: true, false, "sim", "nao"
            </p>
          </div>
          <Separator />
          <div className="space-y-2">
            <h4 className="font-medium">Respostas da API</h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-success">200</Badge>
                <span className="text-muted-foreground">Lead criado com sucesso</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-warning">400</Badge>
                <span className="text-muted-foreground">Campo obrigatório faltando</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-destructive">401</Badge>
                <span className="text-muted-foreground">Token inválido ou inativo</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setSelectedWebhook(null); resetForm(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedWebhook ? 'Editar Webhook' : 'Novo Webhook'}</DialogTitle>
            <DialogDescription>
              {selectedWebhook ? 'Altere as configurações do webhook' : 'Configure um novo webhook para receber leads'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nome do Webhook</Label>
              <Input
                placeholder="Ex: Leads do Site"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {!selectedWebhook && (
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, type: v as 'incoming' | 'outgoing' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incoming">Entrada (receber leads)</SelectItem>
                    <SelectItem value="outgoing" disabled>Saída (em breve)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <Label>Pipeline de Destino</Label>
              <Select
                value={formData.target_pipeline_id || "__none__"}
                onValueChange={(v) => setFormData(prev => ({ ...prev, target_pipeline_id: v === "__none__" ? '' : v, target_stage_id: '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Pipeline padrão</SelectItem>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.target_pipeline_id && (
              <div className="space-y-2">
                <Label>Estágio Inicial</Label>
                <Select
                  value={formData.target_stage_id || "__none__"}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, target_stage_id: v === "__none__" ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Primeiro estágio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Primeiro estágio</SelectItem>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Equipe de Destino (Round-Robin)</Label>
              <Select
                value={formData.target_team_id || "__none__"}
                onValueChange={(v) => setFormData(prev => ({ ...prev, target_team_id: v === "__none__" ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem distribuição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem distribuição automática</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Leads serão distribuídos automaticamente entre os membros da equipe
              </p>
            </div>

            <div className="space-y-2">
              <Label>Tags Automáticas</Label>
              <InlineTagSelector
                selectedTagIds={formData.target_tag_ids}
                onToggleTag={(tagId) => {
                  setFormData(prev => ({
                    ...prev,
                    target_tag_ids: prev.target_tag_ids.includes(tagId)
                      ? prev.target_tag_ids.filter(id => id !== tagId)
                      : [...prev.target_tag_ids, tagId]
                  }));
                }}
              />
              <p className="text-xs text-muted-foreground">
                Clique nas tags para selecioná-las. Serão aplicadas automaticamente aos leads recebidos.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Imóvel de Interesse</Label>
              <Select
                value={formData.target_property_id || "__none__"}
                onValueChange={(v) => setFormData(prev => ({ ...prev, target_property_id: v === "__none__" ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum imóvel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum imóvel</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} - {p.title || p.tipo_de_imovel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                O lead será automaticamente associado a este imóvel
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={selectedWebhook ? handleUpdate : handleCreate}
                disabled={createWebhook.isPending || updateWebhook.isPending}
              >
                {(createWebhook.isPending || updateWebhook.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {selectedWebhook ? 'Salvar' : 'Criar Webhook'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
