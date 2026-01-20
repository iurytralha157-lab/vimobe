import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface OrganizationWithStats {
  id: string;
  name: string;
  logo_url: string | null;
  is_active: boolean;
  subscription_status: string;
  max_users: number;
  admin_notes: string | null;
  created_at: string;
  last_access_at: string | null;
  user_count?: number;
  lead_count?: number;
}

export function useSuperAdmin() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Only enable queries when auth is not loading and user is super admin
  const isReady = !authLoading && isSuperAdmin === true;

  // Fetch all organizations with stats
  const { data: organizations, isLoading: loadingOrgs } = useQuery({
    queryKey: ['super-admin-organizations'],
    queryFn: async () => {
      // Get organizations
      const { data: orgs, error } = await (supabase as any)
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user counts per org
      const { data: userCounts } = await supabase
        .from('users')
        .select('organization_id');

      // Get lead counts per org
      const { data: leadCounts } = await supabase
        .from('leads')
        .select('organization_id');

      // Aggregate counts
      const orgStats: OrganizationWithStats[] = ((orgs || []) as any[]).map(org => ({
        ...org,
        is_active: org.is_active ?? true,
        subscription_status: org.subscription_status ?? 'trial',
        max_users: org.max_users ?? 10,
        admin_notes: org.admin_notes ?? null,
        last_access_at: org.last_access_at ?? null,
        user_count: userCounts?.filter(u => u.organization_id === org.id).length || 0,
        lead_count: leadCounts?.filter(l => l.organization_id === org.id).length || 0,
      }));

      return orgStats;
    },
    enabled: isReady,
  });

  // Fetch all users across organizations
  const { data: allUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ['super-admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          organization:organizations(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: isReady,
  });

  // Create new organization with admin user via edge function
  const createOrganization = useMutation({
    mutationFn: async (data: { 
      name: string; 
      adminEmail: string; 
      adminName: string; 
      adminPassword: string;
    }) => {
      const { data: result, error } = await supabase.functions.invoke('create-organization-admin', {
        body: data,
      });

      if (error) {
        throw new Error(error.message || 'Erro ao criar organização');
      }

      if (result?.error) {
        throw new Error(result.error);
      }

      return result;
    },
    onSuccess: (data) => {
      toast.success(`Organização "${data.organization.name}" criada com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['super-admin-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-users'] });
    },
    onError: (error) => {
      toast.error('Erro ao criar organização: ' + error.message);
    },
  });

  // Update organization
  const updateOrganization = useMutation({
    mutationFn: async (data: { 
      id: string; 
      name?: string;
      is_active?: boolean;
      subscription_status?: string;
      max_users?: number;
      admin_notes?: string;
    }) => {
      const { id, ...updates } = data;
      const { error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Organização atualizada!');
      queryClient.invalidateQueries({ queryKey: ['super-admin-organizations'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  // Delete organization via edge function (bypasses RLS)
  const deleteOrganization = useMutation({
    mutationFn: async (organizationId: string) => {
      const { data: result, error } = await supabase.functions.invoke('delete-organization', {
        body: { organizationId },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao excluir organização');
      }

      if (result?.error) {
        throw new Error(result.error);
      }

      return result;
    },
    onSuccess: () => {
      toast.success('Organização excluída com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['super-admin-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-users'] });
    },
    onError: (error) => {
      toast.error('Erro ao excluir organização: ' + error.message);
    },
  });

  // Update module access for an organization
  const updateModuleAccess = useMutation({
    mutationFn: async (data: { 
      organizationId: string; 
      moduleName: string; 
      isEnabled: boolean;
    }) => {
      // Check if module record exists
      const { data: existing } = await supabase
        .from('organization_modules')
        .select('id')
        .eq('organization_id', data.organizationId)
        .eq('module_name', data.moduleName)
        .single();

      if (existing) {
        // Update
        const { error } = await supabase
          .from('organization_modules')
          .update({ is_enabled: data.isEnabled })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('organization_modules')
          .insert({
            organization_id: data.organizationId,
            module_name: data.moduleName,
            is_enabled: data.isEnabled,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Acesso ao módulo atualizado!');
      queryClient.invalidateQueries({ queryKey: ['organization-modules'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar módulo: ' + error.message);
    },
  });

  // Update user (activate/deactivate)
  const updateUser = useMutation({
    mutationFn: async (data: { 
      userId: string; 
      is_active?: boolean;
      organization_id?: string | null;
    }) => {
      const { userId, ...updates } = data;
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-users'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar usuário: ' + error.message);
    },
  });

  // Delete user via edge function
  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data: result, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'delete', userId },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao excluir usuário');
      }

      if (result?.error) {
        throw new Error(result.error);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-users'] });
    },
    onError: (error) => {
      toast.error('Erro ao excluir usuário: ' + error.message);
    },
  });

  // Get stats
  const stats = {
    totalOrganizations: organizations?.length || 0,
    activeOrganizations: organizations?.filter(o => o.is_active).length || 0,
    trialOrganizations: organizations?.filter(o => o.subscription_status === 'trial').length || 0,
    suspendedOrganizations: organizations?.filter(o => o.subscription_status === 'suspended').length || 0,
    totalUsers: allUsers?.length || 0,
  };

  return {
    organizations,
    allUsers,
    loadingOrgs,
    loadingUsers,
    stats,
    createOrganization,
    updateOrganization,
    updateModuleAccess,
    deleteOrganization,
    updateUser,
    deleteUser,
  };
}
