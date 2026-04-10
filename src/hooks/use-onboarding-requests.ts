import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface OnboardingRequestData {
  company_name: string;
  cnpj?: string;
  company_address?: string;
  company_city?: string;
  company_neighborhood?: string;
  company_number?: string;
  company_complement?: string;
  company_phone?: string;
  company_whatsapp?: string;
  company_email?: string;
  segment?: string;
  responsible_name: string;
  responsible_email: string;
  responsible_cpf?: string;
  responsible_phone?: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color?: string;
  secondary_color?: string;
  site_title?: string;
  custom_domain?: string;
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

// Helper to get typed access to the table (not in generated types yet)
const onboardingTable = () => (supabase as any).from('onboarding_requests');

// Check if current user has a pending onboarding request
export function useMyOnboardingRequest() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-onboarding-request', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await onboardingTable()
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
      const { error } = await onboardingTable()
        .insert({ ...data, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Solicitação enviada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['my-onboarding-request'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao enviar solicitação: ' + error.message);
    },
  });
}

// Admin: list all onboarding requests
export function useAllOnboardingRequests() {
  return useQuery({
    queryKey: ['admin-onboarding-requests'],
    queryFn: async () => {
      const { data, error } = await onboardingTable()
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
    mutationFn: async (params: { id: string; status: string; admin_notes?: string }) => {
      const { error } = await onboardingTable()
        .update({
          status: params.status,
          admin_notes: params.admin_notes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-onboarding-requests'] });
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    },
  });
}
