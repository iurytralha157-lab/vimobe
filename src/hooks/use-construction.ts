import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useConstructionProjects() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["construction-projects", organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("construction_projects")
        .select(`
          *,
          property:properties(id, title)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!organization?.id,
  });
}

export function useConstructionProject(id: string) {
  return useQuery({
    queryKey: ["construction-project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("construction_projects")
        .select(`
          *,
          property:properties(id, title)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateConstructionProject() {
  const queryClient = useQueryClient();
  const { organization, profile } = useAuth();

  return useMutation({
    mutationFn: async (values: any) => {
      const { data, error } = await supabase
        .from("construction_projects" as any)
        .insert([{
          ...values,
          organization_id: organization?.id,
          created_by: profile?.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["construction-projects"] });
      toast.success("Obra criada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar obra: ${error.message}`);
    }
  });
}

export function useConstructionDiaries(projectId: string) {
  return useQuery({
    queryKey: ["construction-diaries", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("construction_diaries" as any)
        .select(`
          *,
          created_by_profile:users!created_by(id, name, avatar_url)
        `)
        .eq("project_id", projectId)
        .order("entry_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useCreateConstructionDiary() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (values: any) => {
      const { data, error } = await supabase
        .from("construction_diaries" as any)
        .insert([{
          ...values,
          created_by: profile?.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["construction-diaries", variables.project_id] });
      toast.success("Diário registrado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao registrar diário: ${error.message}`);
    }
  });
}
