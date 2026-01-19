import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, CheckCircle2 } from 'lucide-react';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

const defaultStages = [
  { name: 'Novo Lead', stage_key: 'new', position: 0, color: '#3b82f6' },
  { name: 'Contactados', stage_key: 'contacted', position: 1, color: '#0891b2' },
  { name: 'Conversa Ativa', stage_key: 'active', position: 2, color: '#22c55e' },
  { name: 'Reunião Marcada', stage_key: 'meeting', position: 3, color: '#8b5cf6' },
  { name: 'No-show', stage_key: 'noshow', position: 4, color: '#f59e0b' },
  { name: 'Proposta em Negociação', stage_key: 'negotiation', position: 5, color: '#ec4899' },
  { name: 'Fechado', stage_key: 'closed', position: 6, color: '#22c55e' },
  { name: 'Perdido', stage_key: 'lost', position: 7, color: '#ef4444' },
];

interface WizardData {
  organizationName: string;
  segment: string;
  accentColor: string;
  teamSize: string;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<'wizard' | 'creating' | 'success' | 'error'>('wizard');
  const [isCreating, setIsCreating] = useState(false);

  // If user already has an organization, redirect
  useEffect(() => {
    if (profile?.organization_id) {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  const createOrganization = async (wizardData: WizardData) => {
    if (!user || isCreating) return;
    
    setIsCreating(true);
    setStatus('creating');

    try {
      // 1. Create organization with wizard data
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: wizardData.organizationName,
          segment: wizardData.segment,
          accent_color: wizardData.accentColor,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // 2. Update user profile with organization_id and admin role
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          organization_id: org.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
          email: user.email || '',
          role: 'admin',
        });

      if (userError) throw userError;

      // 3. Create user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'admin',
        });

      if (roleError) throw roleError;

      // 4. Create default pipeline
      const { data: pipeline, error: pipelineError } = await supabase
        .from('pipelines')
        .insert({
          organization_id: org.id,
          name: 'Pipeline Principal',
          is_default: true,
        })
        .select()
        .single();

      if (pipelineError) throw pipelineError;

      // 5. Create default stages
      const { error: stagesError } = await supabase
        .from('stages')
        .insert(
          defaultStages.map((stage) => ({
            pipeline_id: pipeline.id,
            ...stage,
          }))
        );

      if (stagesError) throw stagesError;

      // 6. Create meta integration placeholder
      await supabase
        .from('meta_integrations')
        .insert({
          organization_id: org.id,
        });

      setStatus('success');
      await refreshProfile();

      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);

    } catch (error: any) {
      setStatus('error');
      setIsCreating(false);
      toast({
        variant: 'destructive',
        title: 'Erro ao configurar conta',
        description: error.message,
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/20 p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-glow">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">Vetter CRM</span>
        </div>

        {status === 'wizard' && (
          <OnboardingWizard 
            onComplete={createOrganization}
            isLoading={isCreating}
          />
        )}

        {(status === 'creating' || status === 'success' || status === 'error') && (
          <Card className="border-border/50 shadow-soft max-w-md mx-auto">
            <CardContent className="pt-8 pb-8 text-center">
              {status === 'creating' && (
                <>
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Configurando sua conta...</h2>
                  <p className="text-muted-foreground">
                    Aguarde enquanto preparamos tudo para você
                  </p>
                </>
              )}

              {status === 'success' && (
                <>
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
                    <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Tudo pronto!</h2>
                  <p className="text-muted-foreground mb-4">
                    Sua conta foi criada com sucesso. Redirecionando...
                  </p>
                  <div className="flex justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                </>
              )}

              {status === 'error' && (
                <>
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
                    <Building2 className="h-8 w-8 text-destructive" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Ops! Algo deu errado</h2>
                  <p className="text-muted-foreground">
                    Tente recarregar a página ou entre em contato com o suporte
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
