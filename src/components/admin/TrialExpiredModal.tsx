import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSystemSettings } from '@/hooks/use-system-settings';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, MessageCircle } from 'lucide-react';

export function TrialExpiredModal() {
  const { organization, isSuperAdmin, impersonating } = useAuth();
  const { data: systemSettings } = useSystemSettings();
  const [isExpired, setIsExpired] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTrialStatus = async () => {
      if (!organization?.id || isSuperAdmin) {
        setLoading(false);
        return;
      }

      // Fetch fresh organization data with subscription info
      const { data: orgData } = await supabase
        .from('organizations')
        .select('subscription_type, trial_ends_at')
        .eq('id', organization.id)
        .single();

      if (orgData) {
        const isTrial = orgData.subscription_type === 'trial';
        const trialEnded = orgData.trial_ends_at && new Date(orgData.trial_ends_at) < new Date();
        
        setIsExpired(isTrial && !!trialEnded);
      }
      setLoading(false);
    };

    checkTrialStatus();
  }, [organization?.id, isSuperAdmin]);

  // Don't show for super admins or while loading
  if (loading || isSuperAdmin || !isExpired) {
    return null;
  }

  const whatsappNumber = systemSettings?.contact_whatsapp || systemSettings?.default_whatsapp || '5511999999999';
  const whatsappMessage = encodeURIComponent(
    `Olá! Meu período de teste no sistema expirou e gostaria de continuar utilizando. Organização: ${organization?.name}`
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${whatsappMessage}`;

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md [&>button]:hidden" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <DialogTitle className="text-xl">Seu período de teste expirou</DialogTitle>
          <DialogDescription className="text-base pt-2">
            O período de avaliação gratuita do sistema chegou ao fim. 
            Para continuar utilizando todas as funcionalidades, entre em contato conosco.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-4">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <Button className="w-full gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white">
              <MessageCircle className="h-5 w-5" />
              Falar via WhatsApp
            </Button>
          </a>
          <p className="text-sm text-muted-foreground text-center">
            Nossa equipe está pronta para ajudar você a escolher o melhor plano.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
