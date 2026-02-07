import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import { logAuditAction } from './use-audit-logs';
export type User = Tables<'users'>;

export function useOrganizationUsers() {
  return useQuery({
    queryKey: ['organization-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as User[];
    },
  });
}

// Alias for backward compatibility
export const useUsers = useOrganizationUsers;

export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<User> & { id: string }) => {
      // Fetch old data for audit log
      const { data: oldUser } = await supabase
        .from('users')
        .select('name, role, organization_id, is_active')
        .eq('id', id)
        .single();
      
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      
      // Sync with user_roles table if role changed
      if (updates.role) {
        // Remove old roles first (admin/user, keep super_admin)
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', id)
          .in('role', ['admin', 'user']);
        
        // Add new role
        await supabase
          .from('user_roles')
          .insert({ 
            user_id: id, 
            role: updates.role as 'admin' | 'user'
          });
      }
      
      // Audit log: user updated
      logAuditAction(
        'update',
        'user',
        id,
        oldUser || undefined,
        updates as Record<string, unknown>,
        oldUser?.organization_id || undefined
      ).catch(console.error);
      
      return { id, ...updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-users'] });
      toast.success('Usuário atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar usuário: ' + error.message);
    },
  });
}
