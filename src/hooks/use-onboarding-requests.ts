import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface OnboardingRequestData {
  company_name: string;
  cnpj?: string;
  company_address?: string;
  company_phone?: string;
  company_whatsapp?: string;
  company_email?: string;
  segment?: string;
  responsible_name: string;
  responsible_email: string;
  responsible_cpf?: string;
  responsible_phone?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  site_title?: string;
  site_seo_description?: string;
  about_text?: string;
  banner_url?: string;
  banner_title?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  linkedin?: string;
  team_size?: string;
}

export interface OnboardingRequest extends OnboardingRequestData {
  id: string;
  user_id: string;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Check if current user has a pending onboarding request
export function useMyOnboardingRequest() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-onboarding-request', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('onboarding_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as OnboardingRequest | null;
    },
    enabled: !!user,
  });
}

// Submit onboarding request
export function useSubmitOnboardingRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: OnboardingRequestData) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { error } = await supabase
        .from('onboarding_requests')
        .insert({ ...data, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Solicitação enviada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['my-onboarding-request'] });
    },
    onError: (error) => {
      toast.error('Erro ao enviar solicitação: ' + error.message);
    },
  });
}

// Admin: list all onboarding requests
export function useAllOnboardingRequests() {
  return useQuery({
    queryKey: ['admin-onboarding-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as OnboardingRequest[];
    },
  });
}

// Admin: update onboarding request status
export function useUpdateOnboardingRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; status: string; admin_notes?: string }) => {
      const { error } = await supabase
        .from('onboarding_requests')
        .update({
          status: data.status,
          admin_notes: data.admin_notes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-onboarding-requests'] });
    },
    onError: (error) => {
      toast.error('Erro: ' + error.message);
    },
  });
}
