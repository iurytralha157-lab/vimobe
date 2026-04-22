import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { LoadingButton } from '@/components/ui/loading-button';
import { Building2, ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle2, Loader2, Mail, User, Lock, ShieldAlert, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePasswordStrength, type PasswordStrength } from "@/hooks/use-password-strength";
import { getFriendlyErrorMessage } from '@/lib/error-handler';

const SEGMENTS = [
  { value: 'imobiliario', label: 'Imobiliário' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'servicos', label: 'Serviços' },
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'saude', label: 'Saúde' },
  { value: 'educacao', label: 'Educação' },
  { value: 'outros', label: 'Outros' },
];

const steps = [
  { id: 1, title: 'Conta' },
  { id: 2, title: 'Empresa' },
  { id: 3, title: 'Confirmar' },
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
      // Call edge function that uses service role (bypasses RLS)
      const { data, error } = await supabase.functions.invoke('public-signup', {
        body: {
          name: accountData.name,
          email: accountData.email,
          password: accountData.password,
          organizationName: orgData.organizationName,
          segment: orgData.segment,
          teamSize: orgData.teamSize,
        },
      });

      if (error) throw new Error(error.message || 'Erro ao criar conta');
      if (data?.error) throw new Error(data.error);

      // Now sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: accountData.email,
        password: accountData.password,
      });

      if (signInError) throw signInError;

      setStatus('success');

      setTimeout(() => {
        navigate('/crm/conversas');
      }, 2000);
    } catch (error: any) {
      console.error('Signup error:', error);
      setStatus('error');
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Erro ao criar conta',
        description: getFriendlyErrorMessage(error),
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
                <span className="hidden sm:block text-center">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        <Card className="border-border/50 shadow-soft">
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && 'Crie sua Conta'}
              {currentStep === 2 && 'Dados da Empresa'}
              {currentStep === 3 && 'Confirmar'}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && 'Preencha seus dados de acesso'}
              {currentStep === 2 && 'Informações da sua empresa'}
              {currentStep === 3 && 'Revise e finalize a criação da sua conta'}
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

            {/* Step 3: Confirm */}
            {currentStep === 3 && (
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
                    <li>✓ Pipeline de vendas padrão</li>
                    <li>✓ Módulos configurados por segmento</li>
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

              {currentStep < 3 ? (
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
