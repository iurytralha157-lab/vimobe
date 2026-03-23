import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { LoadingButton } from '@/components/ui/loading-button';
import { Building2, ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle2, Loader2, Mail, User, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { seedDemoProperties } from '@/lib/demo-properties';

const SEGMENTS = [
  { value: 'imobiliario', label: 'Imobiliário' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'servicos', label: 'Serviços' },
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'saude', label: 'Saúde' },
  { value: 'educacao', label: 'Educação' },
  { value: 'outros', label: 'Outros' },
];

const ACCENT_COLORS = [
  { value: 'orange', label: 'Laranja', class: 'bg-orange-500' },
  { value: 'amber', label: 'Âmbar', class: 'bg-amber-500' },
  { value: 'blue', label: 'Azul', class: 'bg-blue-500' },
  { value: 'purple', label: 'Roxo', class: 'bg-purple-500' },
  { value: 'pink', label: 'Rosa', class: 'bg-pink-500' },
  { value: 'red', label: 'Vermelho', class: 'bg-red-500' },
];

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

const steps = [
  { id: 1, title: 'Conta' },
  { id: 2, title: 'Empresa' },
  { id: 3, title: 'Personalizar' },
  { id: 4, title: 'Pronto!' },
];

export default function Signup() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'form' | 'creating' | 'success' | 'error'>('form');

  const [accountData, setAccountData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [orgData, setOrgData] = useState({
    organizationName: '',
    segment: 'imobiliario',
    accentColor: 'blue',
    teamSize: '1-5',
  });

  const progress = (currentStep / steps.length) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return accountData.name.trim().length >= 2 && 
               accountData.email.includes('@') && 
               accountData.password.length >= 8;
      case 2:
        return orgData.organizationName.trim().length >= 2;
      case 3:
        return orgData.segment && orgData.accentColor;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setStatus('creating');

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: accountData.email,
        password: accountData.password,
        options: {
          data: { name: accountData.name },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Erro ao criar usuário');

      const userId = authData.user.id;

      // 2. Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgData.organizationName,
          segment: orgData.segment,
          accent_color: orgData.accentColor,
          created_by: userId,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // 3. Create/update user profile
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          organization_id: org.id,
          name: accountData.name,
          email: accountData.email,
          role: 'admin',
        });

      if (userError) throw userError;

      // 4. Create user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (roleError) throw roleError;

      // 5. Create default pipeline
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

      // 6. Create default stages
      await supabase.from('stages').insert(
        defaultStages.map((stage) => ({
          pipeline_id: pipeline.id,
          ...stage,
        }))
      );

      // 7. Create meta integration placeholder
      await supabase.from('meta_integrations').insert({ organization_id: org.id });

      // 8. Seed demo properties
      await seedDemoProperties(org.id);

      setStatus('success');

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error: any) {
      console.error('Signup error:', error);
      setStatus('error');
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Erro ao criar conta',
        description: error.message || 'Tente novamente.',
      });
    }
  };

  if (status === 'creating' || status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/20 p-4">
        <Card className="w-full max-w-md border-border/50 shadow-soft">
          <CardContent className="pt-8 pb-8 text-center">
            {status === 'creating' && (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Criando sua conta...</h2>
                <p className="text-muted-foreground">Aguarde enquanto preparamos tudo para você</p>
              </>
            )}
            {status === 'success' && (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Tudo pronto! 🎉</h2>
                <p className="text-muted-foreground mb-4">Sua conta foi criada com sucesso. Redirecionando...</p>
                <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/20 p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-lg">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">Vetter CRM</span>
        </div>

        {/* Progress steps */}
        <div className="mb-6">
          <Progress value={progress} className="h-2 mb-4" />
          <div className="flex justify-between">
            {steps.map((step) => (
              <div
                key={step.id}
                className={cn(
                  "text-xs font-medium transition-colors",
                  currentStep >= step.id ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1 text-sm font-bold transition-colors",
                  currentStep >= step.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  {step.id}
                </div>
                <span className="hidden sm:block">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && 'Crie sua Conta'}
              {currentStep === 2 && 'Dados da Empresa'}
              {currentStep === 3 && 'Personalize'}
              {currentStep === 4 && 'Confirmar'}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && 'Preencha seus dados de acesso'}
              {currentStep === 2 && 'Informações da sua empresa'}
              {currentStep === 3 && 'Escolha a aparência do seu CRM'}
              {currentStep === 4 && 'Revise e finalize a criação da sua conta'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Step 1: Account */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Seu Nome *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="Digite seu nome completo"
                      value={accountData.name}
                      onChange={(e) => setAccountData({ ...accountData, name: e.target.value })}
                      className="pl-10"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={accountData.email}
                      onChange={(e) => setAccountData({ ...accountData, email: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha * (mínimo 8 caracteres)</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={accountData.password}
                      onChange={(e) => setAccountData({ ...accountData, password: e.target.value })}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Company */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Nome da Empresa *</Label>
                  <Input
                    id="orgName"
                    placeholder="Digite o nome da sua empresa"
                    value={orgData.organizationName}
                    onChange={(e) => setOrgData({ ...orgData, organizationName: e.target.value })}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label>Segmento de Atuação</Label>
                  <Select value={orgData.segment} onValueChange={(v) => setOrgData({ ...orgData, segment: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SEGMENTS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tamanho da Equipe</Label>
                  <Select value={orgData.teamSize} onValueChange={(v) => setOrgData({ ...orgData, teamSize: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-5">1-5 pessoas</SelectItem>
                      <SelectItem value="6-20">6-20 pessoas</SelectItem>
                      <SelectItem value="21-50">21-50 pessoas</SelectItem>
                      <SelectItem value="50+">Mais de 50 pessoas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 3: Personalize */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <Label>Cor de Destaque</Label>
                <div className="flex flex-wrap gap-3">
                  {ACCENT_COLORS.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setOrgData({ ...orgData, accentColor: color.value })}
                      className={cn(
                        "w-12 h-12 rounded-lg transition-all",
                        color.class,
                        orgData.accentColor === color.value
                          ? "ring-2 ring-offset-2 ring-primary scale-110"
                          : "hover:scale-105"
                      )}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Confirm */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <h4 className="font-medium">Resumo da sua conta:</h4>
                  <div className="text-sm space-y-1.5 text-muted-foreground">
                    <p><span className="font-medium text-foreground">Nome:</span> {accountData.name}</p>
                    <p><span className="font-medium text-foreground">E-mail:</span> {accountData.email}</p>
                    <p><span className="font-medium text-foreground">Empresa:</span> {orgData.organizationName}</p>
                    <p><span className="font-medium text-foreground">Segmento:</span> {SEGMENTS.find(s => s.value === orgData.segment)?.label}</p>
                  </div>
                </div>
                <div className="p-4 bg-primary/5 rounded-lg">
                  <h4 className="font-medium mb-2">O que será criado:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✓ Conta de administrador</li>
                    <li>✓ Pipeline de vendas com 8 estágios</li>
                    <li>✓ Configurações personalizadas</li>
                    <li>✓ Imóveis de demonstração</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>

              {currentStep < 4 ? (
                <Button onClick={handleNext} disabled={!canProceed()}>
                  Próximo
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <LoadingButton loading={loading} onClick={handleNext}>
                  Criar Conta
                  <ArrowRight className="h-4 w-4 ml-2" />
                </LoadingButton>
              )}
            </div>

            {/* Link to login */}
            <div className="text-center pt-2">
              <p className="text-sm text-muted-foreground">
                Já tem uma conta?{' '}
                <Link to="/auth" className="text-primary hover:underline font-medium">
                  Fazer login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
