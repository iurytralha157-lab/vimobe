import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateCommissionParams {
  leadId: string;
  organizationId: string;
  userId: string | null;
  propertyId: string | null;
  valorInteresse: number | null;
}

export function useCreateCommissionOnWon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, organizationId, userId, propertyId, valorInteresse }: CreateCommissionParams) => {
      // Skip if no property or value
      if (!propertyId || !valorInteresse || !userId) {
        console.log('Skipping commission creation - missing data:', { propertyId, valorInteresse, userId });
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

      // Get property commission percentage
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('commission_percentage, title')
        .eq('id', propertyId)
        .single();

      if (propertyError || !property) {
        console.error('Error fetching property:', propertyError);
        return null;
      }

      const commissionPercentage = property.commission_percentage || 0;
      
      if (commissionPercentage <= 0) {
        console.log('Property has no commission percentage configured');
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
          notes: `Comissão automática - ${property.title || 'Imóvel'}`
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
