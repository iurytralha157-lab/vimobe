import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useAssignLeadRoundRobin() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();

  return useMutation({
    mutationFn: async (leadId: string) => {
      if (!organization?.id) throw new Error("No organization");

      // Get active round robin for the organization
      const { data: roundRobins, error: rrError } = await supabase
        .from("round_robins")
        .select(`
          *,
          members:round_robin_members(
            id,
            user_id,
            position,
            weight,
            user:users(id, name, is_active)
          )
        `)
        .eq("organization_id", organization.id)
        .eq("is_active", true)
        .limit(1);

      if (rrError) throw rrError;
      if (!roundRobins || roundRobins.length === 0) {
        throw new Error("Nenhuma roleta ativa configurada");
      }

      const roundRobin = roundRobins[0];
      const activeMembers = roundRobin.members
        ?.filter((m: any) => m.user?.is_active)
        .sort((a: any, b: any) => a.position - b.position);

      if (!activeMembers || activeMembers.length === 0) {
        throw new Error("Nenhum membro ativo na roleta");
      }

      // Find next user based on last assigned index
      const lastIndex = roundRobin.last_assigned_index || 0;
      const nextIndex = (lastIndex + 1) % activeMembers.length;
      const nextMember = activeMembers[nextIndex];

      // Update lead assignment
      const { error: updateError } = await supabase
        .from("leads")
        .update({ assigned_user_id: nextMember.user_id })
        .eq("id", leadId);

      if (updateError) throw updateError;

      // Update round robin last assigned index
      await supabase
        .from("round_robins")
        .update({ last_assigned_index: nextIndex })
        .eq("id", roundRobin.id);

      // Log the assignment
      await supabase.from("round_robin_logs").insert({
        organization_id: organization.id,
        round_robin_id: roundRobin.id,
        lead_id: leadId,
        assigned_user_id: nextMember.user_id,
        member_id: nextMember.id,
        reason: "manual_assign",
      });

      return { assignedTo: nextMember.user };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["stages-with-leads"] });
      toast.success(`Lead atribuído para ${data.assignedTo?.name || "usuário"}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
