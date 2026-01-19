import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Search, X } from "lucide-react";
import { usePipelines, useStages } from "@/hooks/use-pipelines";
import { useTags } from "@/hooks/use-tags";
import { useProperties } from "@/hooks/use-properties";
import { useUsers } from "@/hooks/use-users";
import { useSaveFormConfig, MetaForm, MetaFormConfig } from "@/hooks/use-meta-forms";

interface MetaFormConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: MetaForm | null;
  config?: MetaFormConfig;
  integrationId: string;
}

const STATUS_OPTIONS = [
  { value: "novo", label: "Novo" },
  { value: "contatado", label: "Contatado" },
  { value: "qualificado", label: "Qualificado" },
  { value: "negociando", label: "Negociando" },
];

const LEAD_FIELDS = [
  { key: "name", label: "Nome" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Telefone" },
  { key: "message", label: "Mensagem" },
  { key: "cargo", label: "Cargo" },
  { key: "empresa", label: "Empresa" },
  { key: "cidade", label: "Cidade" },
  { key: "bairro", label: "Bairro" },
  { key: "custom", label: "Campo Extra (salvar em custom_fields)" },
];

export function MetaFormConfigDialog({
  open,
  onOpenChange,
  form,
  config,
  integrationId,
}: MetaFormConfigDialogProps) {
  const [pipelineId, setPipelineId] = useState("");
  const [stageId, setStageId] = useState("");
  const [defaultStatus, setDefaultStatus] = useState("novo");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [propertySearch, setPropertySearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<string[]>([]);

  const { data: pipelines } = usePipelines();
  const { data: stages } = useStages(pipelineId || undefined);
  const { data: tags } = useTags();
  const { data: properties } = useProperties();
  const { data: users } = useUsers();
  const saveConfig = useSaveFormConfig();

  useEffect(() => {
    if (config) {
      setPipelineId(config.pipeline_id || "");
      setStageId(config.stage_id || "");
      setDefaultStatus(config.default_status || "novo");
      setAssignedUserId(config.assigned_user_id || "");
      setPropertyId(config.property_id || "");
      setSelectedTags(config.auto_tags || []);
      setFieldMapping(config.field_mapping || {});
      setCustomFields(config.custom_fields_config || []);
    } else {
      setPipelineId("");
      setStageId("");
      setDefaultStatus("novo");
      setAssignedUserId("");
      setPropertyId("");
      setPropertySearch("");
      setSelectedTags([]);
      setFieldMapping({});
      setCustomFields([]);
    }
  }, [config, open]);

  const handleSave = async () => {
    if (!form || !pipelineId || !stageId) {
      return;
    }

    await saveConfig.mutateAsync({
      integrationId,
      formId: form.id,
      formName: form.name,
      pipelineId,
      stageId,
      defaultStatus,
      assignedUserId: assignedUserId || undefined,
      propertyId: propertyId || undefined,
      autoTags: selectedTags,
      fieldMapping,
      customFieldsConfig: customFields,
      isActive: true,
    });

    onOpenChange(false);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const updateFieldMapping = (metaField: string, crmField: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [metaField]: crmField,
    }));

    if (crmField === "custom" && !customFields.includes(metaField)) {
      setCustomFields(prev => [...prev, metaField]);
    } else if (crmField !== "custom" && customFields.includes(metaField)) {
      setCustomFields(prev => prev.filter(f => f !== metaField));
    }
  };

  const filteredStages = stages?.filter(s => s.pipeline_id === pipelineId) || [];
  
  const filteredProperties = properties?.filter(p => 
    propertySearch === "" || 
    p.code?.toLowerCase().includes(propertySearch.toLowerCase()) ||
    p.title?.toLowerCase().includes(propertySearch.toLowerCase()) ||
    p.endereco?.toLowerCase().includes(propertySearch.toLowerCase())
  ).slice(0, 10) || [];

  const selectedProperty = properties?.find(p => p.id === propertyId);

  if (!open || !form) {
    return null;
  }

  return (
    <Dialog key={form.id} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Configurar Formulário: {form.name}</DialogTitle>
          <DialogDescription>
            Configure onde os leads deste formulário serão recebidos
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Destination Section */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Destino do Lead</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pipeline *</Label>
                  <Select value={pipelineId} onValueChange={(v) => {
                    setPipelineId(v);
                    setStageId("");
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelines?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Etapa Inicial *</Label>
                  <Select value={stageId} onValueChange={setStageId} disabled={!pipelineId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredStages.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status do Lead</Label>
                  <Select value={defaultStatus} onValueChange={setDefaultStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Atribuir a</Label>
                  <Select value={assignedUserId || "_none"} onValueChange={(v) => setAssignedUserId(v === "_none" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ninguém (usar round-robin)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Ninguém</SelectItem>
                      {users?.filter(u => u.is_active).map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Property Section */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Vincular Imóvel</h4>
              <p className="text-xs text-muted-foreground">
                Leads deste formulário serão automaticamente vinculados a este imóvel
              </p>
              
              {selectedProperty ? (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{selectedProperty.code}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedProperty.title || selectedProperty.endereco || "Sem descrição"}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setPropertyId("")}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar imóvel por código ou endereço..."
                      value={propertySearch}
                      onChange={(e) => setPropertySearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  {propertySearch && filteredProperties.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-40 overflow-auto">
                      {filteredProperties.map((p) => (
                        <button
                          key={p.id}
                          className="w-full text-left p-2 hover:bg-muted transition-colors"
                          onClick={() => {
                            setPropertyId(p.id);
                            setPropertySearch("");
                          }}
                        >
                          <p className="font-medium text-sm">{p.code}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {p.title || p.endereco}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Tags Section */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Tags Automáticas</h4>
              <p className="text-xs text-muted-foreground">
                Estas tags serão automaticamente aplicadas aos leads
              </p>
              
              <div className="flex flex-wrap gap-2">
                {tags?.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    style={{
                      backgroundColor: selectedTags.includes(tag.id) ? tag.color : undefined,
                      borderColor: tag.color,
                    }}
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                  </Badge>
                ))}
                {(!tags || tags.length === 0) && (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma tag criada. Crie tags em Gestão do CRM.
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Field Mapping Section */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Mapeamento de Campos</h4>
              <p className="text-xs text-muted-foreground">
                Configure como os campos do formulário Meta serão salvos no CRM
              </p>
              
              {form.questions && form.questions.length > 0 ? (
                <div className="space-y-3">
                  {form.questions.map((question) => (
                    <div key={question.key} className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{question.label}</p>
                        <p className="text-xs text-muted-foreground">{question.key}</p>
                      </div>
                      <div className="w-48">
                        <Select
                          value={fieldMapping[question.key] || "_ignore"}
                          onValueChange={(v) => updateFieldMapping(question.key, v === "_ignore" ? "" : v)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Ignorar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_ignore">Ignorar</SelectItem>
                            {LEAD_FIELDS.map((f) => (
                              <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Campos do formulário serão carregados automaticamente após o primeiro lead
                </p>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saveConfig.isPending || !pipelineId || !stageId}
          >
            {saveConfig.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Configuração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
