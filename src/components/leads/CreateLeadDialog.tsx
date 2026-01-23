import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PhoneInput } from '@/components/ui/phone-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TagSelector } from '@/components/ui/tag-selector';
import { Loader2, User, Briefcase, Building2, MapPin, DollarSign, Trophy, XCircle, CircleDot } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationUsers } from '@/hooks/use-users';
import { usePipelines, useStages } from '@/hooks/use-stages';
import { useProperties } from '@/hooks/use-properties';
import { useCreateLead } from '@/hooks/use-leads';

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStageId?: string | null;
  defaultPipelineId?: string | null;
}

const dealStatusOptions = [
  { value: 'open', label: 'Aberto', icon: CircleDot, color: 'text-blue-500' },
  { value: 'won', label: 'Ganho', icon: Trophy, color: 'text-green-500' },
  { value: 'lost', label: 'Perdido', icon: XCircle, color: 'text-red-500' },
];

const faixaImovelOptions = [
  { value: 'ate_200k', label: 'Até R$ 200 mil' },
  { value: '200k_400k', label: 'R$ 200 mil - R$ 400 mil' },
  { value: '400k_600k', label: 'R$ 400 mil - R$ 600 mil' },
  { value: '600k_1m', label: 'R$ 600 mil - R$ 1 milhão' },
  { value: 'acima_1m', label: 'Acima de R$ 1 milhão' },
];

export function CreateLeadDialog({ 
  open, 
  onOpenChange, 
  defaultStageId, 
  defaultPipelineId 
}: CreateLeadDialogProps) {
  const { profile, organization } = useAuth();
  const { data: users = [] } = useOrganizationUsers();
  const { data: pipelines = [] } = usePipelines();
  const { data: properties = [] } = useProperties();
  const createLead = useCreateLead();

  const isTelecom = organization?.segment === 'telecom';

  // Form state
  const [formData, setFormData] = useState({
    // Basic
    name: '',
    phone: '',
    email: '',
    message: '',
    // Professional
    cargo: '',
    empresa: '',
    profissao: '',
    // Address
    endereco: '',
    cidade: '',
    uf: '',
    // Financial
    renda_familiar: '',
    faixa_valor_imovel: '',
    valor_interesse: '',
    // Lead management
    assigned_user_id: '',
    pipeline_id: '',
    stage_id: '',
    property_id: '',
    deal_status: 'open',
    // Tags
    tag_ids: [] as string[],
  });

  // Get stages for selected pipeline
  const { data: stages = [] } = useStages(formData.pipeline_id || undefined);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      const defaultPipeline = pipelines.find(p => p.is_default) || pipelines[0];
      setFormData({
        name: '',
        phone: '',
        email: '',
        message: '',
        cargo: '',
        empresa: '',
        profissao: '',
        endereco: '',
        cidade: '',
        uf: '',
        renda_familiar: '',
        faixa_valor_imovel: '',
        valor_interesse: '',
        assigned_user_id: profile?.id || '',
        pipeline_id: defaultPipelineId || defaultPipeline?.id || '',
        stage_id: defaultStageId || '',
        property_id: '',
        deal_status: 'open',
        tag_ids: [],
      });
    }
  }, [open, profile?.id, pipelines, defaultStageId, defaultPipelineId]);

  // Update stage when pipeline changes
  useEffect(() => {
    if (formData.pipeline_id && stages.length > 0 && !formData.stage_id) {
      setFormData(prev => ({ ...prev, stage_id: stages[0].id }));
    }
  }, [formData.pipeline_id, stages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createLead.mutateAsync({
        name: formData.name,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        message: formData.message || undefined,
        pipeline_id: formData.pipeline_id || undefined,
        stage_id: formData.stage_id || undefined,
        assigned_user_id: formData.assigned_user_id || undefined,
        tag_ids: formData.tag_ids.length > 0 ? formData.tag_ids : undefined,
        // Additional fields passed via source for now
        source: 'manual',
      });
      
      // If we have additional fields, update the lead separately
      const additionalFields: Record<string, any> = {};
      if (formData.cargo) additionalFields.cargo = formData.cargo;
      if (formData.empresa) additionalFields.empresa = formData.empresa;
      if (formData.profissao) additionalFields.profissao = formData.profissao;
      if (formData.endereco) additionalFields.endereco = formData.endereco;
      if (formData.cidade) additionalFields.cidade = formData.cidade;
      if (formData.uf) additionalFields.uf = formData.uf;
      if (formData.renda_familiar) additionalFields.renda_familiar = formData.renda_familiar;
      if (formData.faixa_valor_imovel) additionalFields.faixa_valor_imovel = formData.faixa_valor_imovel;
      if (formData.valor_interesse) additionalFields.valor_interesse = parseFloat(formData.valor_interesse) || null;
      if (formData.property_id) additionalFields.property_id = formData.property_id;
      if (formData.deal_status !== 'open') additionalFields.deal_status = formData.deal_status;
      
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[calc(90vh-140px)]">
            <div className="px-6 pb-4">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="basic" className="text-xs">Básico</TabsTrigger>
                  <TabsTrigger value="profile" className="text-xs">Perfil</TabsTrigger>
                  <TabsTrigger value="management" className="text-xs">Gestão</TabsTrigger>
                </TabsList>

                {/* Basic Info Tab */}
                <TabsContent value="basic" className="space-y-4 mt-0">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        placeholder="Nome do lead"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <PhoneInput
                        value={formData.phone}
                        onChange={(value) => updateField('phone', value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Mensagem / Observações</Label>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => updateField('message', e.target.value)}
                      placeholder="Interesse, observações iniciais..."
                      rows={3}
                    />
                  </div>
                </TabsContent>

                {/* Profile Tab */}
                <TabsContent value="profile" className="space-y-4 mt-0">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Briefcase className="h-3.5 w-3.5" />
                        Cargo
                      </Label>
                      <Input
                        value={formData.cargo}
                        onChange={(e) => updateField('cargo', e.target.value)}
                        placeholder="Ex: Gerente, Diretor..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5" />
                        Empresa
                      </Label>
                      <Input
                        value={formData.empresa}
                        onChange={(e) => updateField('empresa', e.target.value)}
                        placeholder="Nome da empresa"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Profissão</Label>
                    <Input
                      value={formData.profissao}
                      onChange={(e) => updateField('profissao', e.target.value)}
                      placeholder="Área de atuação"
                    />
                  </div>

                  {!isTelecom && (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <DollarSign className="h-3.5 w-3.5" />
                            Renda Familiar
                          </Label>
                          <Input
                            value={formData.renda_familiar}
                            onChange={(e) => updateField('renda_familiar', e.target.value)}
                            placeholder="Ex: R$ 10.000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Faixa de Imóvel</Label>
                          <Select 
                            value={formData.faixa_valor_imovel} 
                            onValueChange={(v) => updateField('faixa_valor_imovel', v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a faixa" />
                            </SelectTrigger>
                            <SelectContent>
                              {faixaImovelOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Valor de Interesse (R$)</Label>
                        <Input
                          type="number"
                          value={formData.valor_interesse}
                          onChange={(e) => updateField('valor_interesse', e.target.value)}
                          placeholder="Ex: 500000"
                        />
                      </div>
                    </>
                  )}

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2 space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" />
                        Cidade
                      </Label>
                      <Input
                        value={formData.cidade}
                        onChange={(e) => updateField('cidade', e.target.value)}
                        placeholder="Cidade"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>UF</Label>
                      <Input
                        value={formData.uf}
                        onChange={(e) => updateField('uf', e.target.value)}
                        placeholder="SP"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Management Tab */}
                <TabsContent value="management" className="space-y-4 mt-0">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5" />
                        Responsável
                      </Label>
                      <Select 
                        value={formData.assigned_user_id} 
                        onValueChange={(v) => updateField('assigned_user_id', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status do Negócio</Label>
                      <Select 
                        value={formData.deal_status} 
                        onValueChange={(v) => updateField('deal_status', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {dealStatusOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div className="flex items-center gap-2">
                                <opt.icon className={`h-3.5 w-3.5 ${opt.color}`} />
                                {opt.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Pipeline</Label>
                      <Select 
                        value={formData.pipeline_id} 
                        onValueChange={(v) => {
                          updateField('pipeline_id', v);
                          updateField('stage_id', '');
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a pipeline" />
                        </SelectTrigger>
                        <SelectContent>
                          {pipelines.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Estágio</Label>
                      <Select 
                        value={formData.stage_id} 
                        onValueChange={(v) => updateField('stage_id', v)}
                        disabled={!formData.pipeline_id}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o estágio" />
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="h-2.5 w-2.5 rounded-full" 
                                  style={{ backgroundColor: s.color }}
                                />
                                {s.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {!isTelecom && properties.length > 0 && (
                    <div className="space-y-2">
                      <Label>Imóvel de Interesse</Label>
                      <Select 
                        value={formData.property_id} 
                        onValueChange={(v) => updateField('property_id', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um imóvel (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhum</SelectItem>
                          {properties.slice(0, 50).map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.title} {p.code ? `(${p.code})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <TagSelector
                      selectedTagIds={formData.tag_ids}
                      onSelectTag={(tagId) => {
                        if (!formData.tag_ids.includes(tagId)) {
                          updateField('tag_ids', [...formData.tag_ids, tagId]);
                        }
                      }}
                      onRemoveTag={(tagId) => {
                        updateField('tag_ids', formData.tag_ids.filter(id => id !== tagId));
                      }}
                      placeholder="Adicionar tags..."
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/30">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createLead.isPending || !formData.name.trim()}>
              {createLead.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
