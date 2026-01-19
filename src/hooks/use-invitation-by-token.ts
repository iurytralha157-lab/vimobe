import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Interface para o retorno da RPC get_invitation_by_token
interface InvitationByToken {
  id: string;
  email: string | null;
  role: 'admin' | 'user';
  organization_id: string;
  expires_at: string;
}

/**
 * Hook seguro para buscar convite por token usando RPC
 * Evita enumeration de convites via SELECT direto
 */
export function useInvitationByToken(token: string | null) {
  return useQuery({
    queryKey: ['invitation-by-token', token],
    queryFn: async (): Promise<InvitationByToken | null> => {
      if (!token) return null;
      
      // Usar RPC segura que não expõe listagem de convites
      const { data, error } = await supabase
        .rpc('get_invitation_by_token', { _token: token });
      
      if (error) {
        console.error('Error fetching invitation:', error);
        return null;
      }
      
      // RPC retorna array, pegamos o primeiro (ou null se vazio)
      const invitation = data?.[0] || null;
      return invitation as InvitationByToken | null;
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: false, // Não retentar se falhar (pode ser token inválido)
  });
}
