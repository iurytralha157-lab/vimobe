import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Settings2,
  RefreshCw,
  Users,
  Home,
  Tag,
} from "lucide-react";
import {
  useMetaFormConfigs,
  useFetchPageForms,
  useToggleFormConfig,
  MetaForm,
  MetaFormConfig,
} from "@/hooks/use-meta-forms";
import { MetaFormConfigDialog } from "./MetaFormConfigDialog";
import { MetaIntegration } from "@/hooks/use-meta-integration";

interface MetaFormManagerProps {
  integration: MetaIntegration;
}

export function MetaFormManager({ integration }: MetaFormManagerProps) {
  const [forms, setForms] = useState<MetaForm[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(false);
  const [editingForm, setEditingForm] = useState<{ form: MetaForm; config?: MetaFormConfig } | null>(null);

  const { data: formConfigs, isLoading: loadingConfigs } = useMetaFormConfigs(integration.id);
  const fetchForms = useFetchPageForms();
  const toggleForm = useToggleFormConfig();

  useEffect(() => {
    if (integration.page_id) {
      loadForms();
    }
  }, [integration.page_id]);

  const loadForms = async () => {
    if (!integration.page_id) return;
    
    setIsLoadingForms(true);
    try {
      const result = await fetchForms.mutateAsync({
        pageId: integration.page_id,
        accessToken: "",
      });
      setForms(result.forms || []);
    } catch (error) {
      console.error("Error loading forms:", error);
    } finally {
      setIsLoadingForms(false);
    }
  };

  const getFormConfig = (formId: string): MetaFormConfig | undefined => {
    return formConfigs?.find(c => c.form_id === formId);
  };

  const handleToggleForm = (formId: string, isActive: boolean) => {
    toggleForm.mutate({ 
      formId, 
      isActive, 
      integrationId: integration.id 
    });
  };

  if (loadingConfigs || isLoadingForms) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const configuredForms = forms.filter(f => getFormConfig(f.id));
  const unconfiguredForms = forms.filter(f => !getFormConfig(f.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">Formulários da Página</h4>
          <p className="text-sm text-muted-foreground">
            Configure cada formulário individualmente
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadForms} disabled={isLoadingForms}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingForms ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-8">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum formulário encontrado nesta página</p>
              <p className="text-sm mt-1">
                Crie formulários no Gerenciador de Anúncios do Facebook
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {configuredForms.map((form) => {
            const config = getFormConfig(form.id)!;
            return (
              <FormCard
                key={form.id}
                form={form}
                config={config}
                onToggle={(isActive) => handleToggleForm(form.id, isActive)}
                onEdit={() => setEditingForm({ form, config })}
              />
            );
          })}

          {unconfiguredForms.map((form) => (
            <FormCard
              key={form.id}
              form={form}
              onEdit={() => setEditingForm({ form })}
            />
          ))}
        </div>
      )}

      <MetaFormConfigDialog
        open={!!editingForm}
        onOpenChange={(open) => !open && setEditingForm(null)}
        form={editingForm?.form || null}
        config={editingForm?.config}
        integrationId={integration.id}
      />
    </div>
  );
}

interface FormCardProps {
  form: MetaForm;
  config?: MetaFormConfig;
  onToggle?: (isActive: boolean) => void;
  onEdit: () => void;
}

function FormCard({ form, config, onToggle, onEdit }: FormCardProps) {
  const isConfigured = !!config;
  const isActive = config?.is_active ?? false;

  return (
    <Card className={!isConfigured ? "border-dashed" : ""}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${isConfigured ? 'bg-primary/10' : 'bg-muted'}`}>
              <FileText className={`h-4 w-4 ${isConfigured ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{form.name}</span>
                {isConfigured ? (
                  <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                    {isActive ? "Ativo" : "Inativo"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    Não configurado
                  </Badge>
                )}
              </div>

              {isConfigured && config && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{config.leads_received || 0} leads</span>
                  </div>
                  
                  {config.property_id && (
                    <div className="flex items-center gap-1">
                      <Home className="h-3 w-3" />
                      <span>Imóvel vinculado</span>
                    </div>
                  )}
                  
                  {config.auto_tags && config.auto_tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      <span>{config.auto_tags.length} tag(s)</span>
                    </div>
                  )}
                </div>
              )}

              {!isConfigured && (
                <p className="text-xs text-muted-foreground">
                  Configure para receber leads deste formulário
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isConfigured && onToggle && (
              <Switch
                checked={isActive}
                onCheckedChange={onToggle}
                aria-label="Toggle form"
              />
            )}
            
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Settings2 className="h-4 w-4 mr-1" />
              {isConfigured ? "Editar" : "Configurar"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
