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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Search, X, Info } from "lucide-react";
import { useProperties } from "@/hooks/use-properties";
import { useSaveFormConfig, MetaForm, MetaFormConfig } from "@/hooks/use-meta-forms";
import { InlineTagSelector } from "@/components/ui/tag-selector";
import { Link } from "react-router-dom";

interface MetaFormConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: MetaForm | null;
  config?: MetaFormConfig;
  integrationId: string;
}

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
  // Form state - simplified without destination fields
  const [propertyId, setPropertyId] = useState("");
  const [propertySearch, setPropertySearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<string[]>([]);

  // Data hooks
  const { data: properties } = useProperties();
  const saveConfig = useSaveFormConfig();

  // Load existing config when dialog opens
  useEffect(() => {
    if (config) {
      setPropertyId(config.property_id || "");
      setSelectedTags(config.auto_tags || []);
      setFieldMapping(config.field_mapping || {});
      setCustomFields(config.custom_fields_config || []);
    } else {
      // Reset form
      setPropertyId("");
      setPropertySearch("");
      setSelectedTags([]);
      setFieldMapping({});
      setCustomFields([]);
    }
  }, [config, open]);

  const handleSave = async () => {
    if (!form) return;

    await saveConfig.mutateAsync({
      integrationId,
      formId: form.id,
      formName: form.name,
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

    // If mapping to custom, add to customFields
    if (crmField === "custom" && !customFields.includes(metaField)) {
      setCustomFields(prev => [...prev, metaField]);
    } else if (crmField !== "custom" && customFields.includes(metaField)) {
      setCustomFields(prev => prev.filter(f => f !== metaField));
    }
  };
  
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
            Configure enriquecimento automático para leads deste formulário
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Distribution Info Alert */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                A distribuição dos leads (pipeline, etapa e responsável) é feita automaticamente pelas{" "}
                <Link to="/crm-management" className="text-primary underline font-medium">
                  Filas de Distribuição
                </Link>
                {" "}em Gestão CRM.
              </AlertDescription>
            </Alert>

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
              
              <InlineTagSelector
                selectedTagIds={selectedTags}
                onToggleTag={toggleTag}
              />
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
            disabled={saveConfig.isPending}
          >
            {saveConfig.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Configuração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
