import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateCommissionParams {
  leadId: string;
  organizationId: string;
  userId: string | null;
  propertyId: string | null;
  valorInteresse: number | null;
  leadCommissionPercentage?: number | null;
}

export function useCreateCommissionOnWon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, organizationId, userId, propertyId, valorInteresse, leadCommissionPercentage }: CreateCommissionParams) => {
      // Skip if no value or user
      if (!valorInteresse || !userId) {
        console.log('Skipping commission creation - missing data:', { valorInteresse, userId });
        return null;
      }

      // Check if commission already exists for this lead
      const { data: existingCommission } = await supabase
        .from('commissions')
        .select('id')
        .eq('lead_id', leadId)
        .maybeSingle();

      if (existingCommission) {
        console.log('Commission already exists for lead:', leadId);
        return null;
      }

      // Use lead commission percentage first, fallback to property if available
      let commissionPercentage = leadCommissionPercentage || 0;
      let propertyTitle = 'Negócio';

      // If no lead commission but has property, get from property
      if (commissionPercentage <= 0 && propertyId) {
        const { data: property, error: propertyError } = await supabase
          .from('properties')
          .select('commission_percentage, title')
          .eq('id', propertyId)
          .single();

        if (!propertyError && property) {
          commissionPercentage = property.commission_percentage || 0;
          propertyTitle = property.title || 'Imóvel';
        }
      }
      
      if (commissionPercentage <= 0) {
        console.log('No commission percentage configured (neither on lead nor property)');
        return null;
      }

      // Calculate commission amount
      const commissionAmount = valorInteresse * (commissionPercentage / 100);

      // Create commission record
      const { data: commission, error } = await supabase
        .from('commissions')
        .insert({
          organization_id: organizationId,
          lead_id: leadId,
          user_id: userId,
          property_id: propertyId,
          base_value: valorInteresse,
          amount: commissionAmount,
          status: 'forecast',
          notes: `Comissão automática - ${propertyTitle}`
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating commission:', error);
        throw error;
      }

      return commission;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['commissions'] });
        queryClient.invalidateQueries({ queryKey: ['financial-dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['enhanced-dashboard-stats'] });
        toast.success('Comissão gerada automaticamente!');
      }
    },
    onError: (error) => {
      console.error('Error creating commission:', error);
      // Don't show error toast - commission creation is a side effect
    }
  });
}
