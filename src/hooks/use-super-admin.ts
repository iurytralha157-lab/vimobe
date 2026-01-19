import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Organization {
  id: string;
  name: string;
  subscription_status: string;
  is_active: boolean;
  max_users: number;
  admin_notes: string | null;
  created_at: string;
  segment: string | null;
  logo_url: string | null;
  user_count?: number;
  lead_count?: number;
}

export interface SuperAdminStats {
  totalOrganizations: number;
  activeOrganizations: number;
  trialOrganizations: number;
  suspendedOrganizations: number;
  totalUsers: number;
  totalLeads: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  organization_id: string | null;
  organization?: { name: string } | null;
}

export function useOrganizations() {
  return useQuery({
    queryKey: ["admin-organizations"],
    queryFn: async () => {
      const { data: orgs, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get user counts per organization
      const { data: userCounts } = await supabase
        .from("users")
        .select("organization_id")
        .not("organization_id", "is", null);

      // Get lead counts per organization
      const { data: leadCounts } = await supabase
        .from("leads")
        .select("organization_id");

      const userCountMap = new Map<string, number>();
      const leadCountMap = new Map<string, number>();

      userCounts?.forEach((u) => {
        if (u.organization_id) {
          userCountMap.set(u.organization_id, (userCountMap.get(u.organization_id) || 0) + 1);
        }
      });

      leadCounts?.forEach((l) => {
        if (l.organization_id) {
          leadCountMap.set(l.organization_id, (leadCountMap.get(l.organization_id) || 0) + 1);
        }
      });

      return orgs.map((org) => ({
        ...org,
        subscription_status: (org as any).subscription_status || "active",
        is_active: (org as any).is_active ?? true,
        max_users: (org as any).max_users || 10,
        admin_notes: (org as any).admin_notes || null,
        user_count: userCountMap.get(org.id) || 0,
        lead_count: leadCountMap.get(org.id) || 0,
      })) as Organization[];
    },
  });
}

export function useSuperAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [orgsResult, usersResult, leadsResult] = await Promise.all([
        supabase.from("organizations").select("id, created_at"),
        supabase.from("users").select("id").not("organization_id", "is", null),
        supabase.from("leads").select("id"),
      ]);

      const orgs = orgsResult.data || [];
      
      return {
        totalOrganizations: orgs.length,
        activeOrganizations: orgs.length, // Simplified - all are active by default
        trialOrganizations: 0,
        suspendedOrganizations: 0,
        totalUsers: usersResult.data?.length || 0,
        totalLeads: leadsResult.data?.length || 0,
      } as SuperAdminStats;
    },
  });
}

export function useAllUsers() {
  return useQuery({
    queryKey: ["admin-all-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select(`
          id,
          name,
          email,
          role,
          is_active,
          created_at,
          organization_id,
          organizations:organization_id (name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data.map((user) => ({
        ...user,
        organization: user.organizations,
      })) as AdminUser[];
    },
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { 
      name: string; 
      segment?: string;
      adminEmail: string;
      adminName: string;
      adminPassword: string;
    }) => {
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({ name: data.name, segment: data.segment })
        .select()
        .single();

      if (orgError) throw orgError;

      // Create admin user via auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.adminEmail,
        password: data.adminPassword,
        options: {
          data: { name: data.adminName },
        },
      });

      if (authError) throw authError;

      // Update user with organization
      if (authData.user) {
        await supabase
          .from("users")
          .update({ 
            organization_id: org.id,
            role: "admin",
            name: data.adminName,
          })
          .eq("id", authData.user.id);
      }

      return org;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Organização criada com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar organização: " + error.message);
    },
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Organization> & { id: string }) => {
      const { error } = await supabase
        .from("organizations")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      toast.success("Organização atualizada");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Organização excluída");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir: " + error.message);
    },
  });
}

export function useOrganizationModules(organizationId: string) {
  return useQuery({
    queryKey: ["organization-modules", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_modules")
        .select("*")
        .eq("organization_id", organizationId);

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });
}

export function useToggleModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      organizationId, 
      moduleName, 
      isEnabled 
    }: { 
      organizationId: string; 
      moduleName: string; 
      isEnabled: boolean;
    }) => {
      const { data: existing } = await supabase
        .from("organization_modules")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("module_name", moduleName)
        .single();

      if (existing) {
        await supabase
          .from("organization_modules")
          .update({ is_enabled: isEnabled })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("organization_modules")
          .insert({ 
            organization_id: organizationId, 
            module_name: moduleName, 
            is_enabled: isEnabled 
          });
      }
    },
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({ queryKey: ["organization-modules", organizationId] });
      toast.success("Módulo atualizado");
    },
  });
}

export function useOrganizationUsers(organizationId: string) {
  return useQuery({
    queryKey: ["organization-users", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });
}
