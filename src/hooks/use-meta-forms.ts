import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MetaFormQuestion {
  key: string;
  label: string;
  type?: string;
}

export interface MetaForm {
  id: string;
  name: string;
  status?: string;
  questions?: MetaFormQuestion[];
}

export interface MetaFormConfig {
  id: string;
  integration_id: string;
  form_id: string;
  form_name: string;
  pipeline_id: string | null;
  stage_id: string | null;
  default_status: string | null;
  assigned_user_id: string | null;
  property_id: string | null;
  auto_tags: string[] | null;
  field_mapping: Record<string, string> | null;
  custom_fields_config: string[] | null;
  is_active: boolean;
  leads_received: number;
  created_at: string;
  updated_at: string;
}

export function useMetaFormConfigs(integrationId?: string) {
  return useQuery({
    queryKey: ["meta-form-configs", integrationId],
    queryFn: async () => {
      if (!integrationId) return [];

      // Using meta_integrations field_mapping as a simple store for form configs
      // In a real app, you might have a separate table for this
      const { data, error } = await supabase
        .from("meta_integrations")
        .select("*")
        .eq("id", integrationId)
        .single();

      if (error) throw error;

      // Parse form_ids as configs
      const formIds = data?.form_ids as unknown as MetaFormConfig[] | null;
      return formIds || [];
    },
    enabled: !!integrationId,
  });
}

export function useFetchPageForms() {
  return useMutation({
    mutationFn: async ({
      pageId,
      accessToken,
    }: {
      pageId: string;
      accessToken: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("meta-auth", {
        body: { action: "get_forms", page_id: pageId, access_token: accessToken },
      });

      if (error) throw error;
      return data as { forms: MetaForm[] };
    },
    onError: (error: Error) => {
      console.error("Error fetching forms:", error);
    },
  });
}

export function useSaveFormConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      integrationId,
      formId,
      formName,
      pipelineId,
      stageId,
      defaultStatus,
      assignedUserId,
      propertyId,
      autoTags,
      fieldMapping,
      customFieldsConfig,
      isActive,
    }: {
      integrationId: string;
      formId: string;
      formName: string;
      pipelineId: string;
      stageId: string;
      defaultStatus: string;
      assignedUserId?: string;
      propertyId?: string;
      autoTags?: string[];
      fieldMapping?: Record<string, string>;
      customFieldsConfig?: string[];
      isActive: boolean;
    }) => {
      // Get current form configs
      const { data: integration, error: fetchError } = await supabase
        .from("meta_integrations")
        .select("form_ids")
        .eq("id", integrationId)
        .single();

      if (fetchError) throw fetchError;

      const currentConfigs = (integration?.form_ids as unknown as MetaFormConfig[]) || [];
      
      // Create or update config
      const newConfig: MetaFormConfig = {
        id: formId,
        integration_id: integrationId,
        form_id: formId,
        form_name: formName,
        pipeline_id: pipelineId,
        stage_id: stageId,
        default_status: defaultStatus,
        assigned_user_id: assignedUserId || null,
        property_id: propertyId || null,
        auto_tags: autoTags || null,
        field_mapping: fieldMapping || null,
        custom_fields_config: customFieldsConfig || null,
        is_active: isActive,
        leads_received: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Update or add config
      const existingIndex = currentConfigs.findIndex(c => c.form_id === formId);
      if (existingIndex >= 0) {
        newConfig.leads_received = currentConfigs[existingIndex].leads_received;
        newConfig.created_at = currentConfigs[existingIndex].created_at;
        currentConfigs[existingIndex] = newConfig;
      } else {
        currentConfigs.push(newConfig);
      }

      // Save back to integration
      const { error: updateError } = await supabase
        .from("meta_integrations")
        .update({ form_ids: currentConfigs as unknown as string[] })
        .eq("id", integrationId);

      if (updateError) throw updateError;

      return newConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meta-form-configs"] });
      toast.success("Configuração salva!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao salvar configuração");
    },
  });
}

export function useToggleFormConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      formId,
      isActive,
      integrationId,
    }: {
      formId: string;
      isActive: boolean;
      integrationId: string;
    }) => {
      // Get current configs
      const { data: integration, error: fetchError } = await supabase
        .from("meta_integrations")
        .select("form_ids")
        .eq("id", integrationId)
        .single();

      if (fetchError) throw fetchError;

      const configs = (integration?.form_ids as unknown as MetaFormConfig[]) || [];
      const configIndex = configs.findIndex(c => c.form_id === formId);

      if (configIndex >= 0) {
        configs[configIndex].is_active = isActive;
        configs[configIndex].updated_at = new Date().toISOString();

        const { error: updateError } = await supabase
          .from("meta_integrations")
          .update({ form_ids: configs as unknown as string[] })
          .eq("id", integrationId);

        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meta-form-configs"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar formulário");
    },
  });
}
