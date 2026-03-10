import { useState, useMemo, useEffect } from "react";
import { z } from "zod";
import { Loader2, Eye, EyeOff, ArrowLeft, Mail, AlertCircle, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSystemSettings } from "@/hooks/use-system-settings";
import { useLoginAttempts } from "@/hooks/use-login-attempts";
import { usePasswordStrength } from "@/hooks/use-password-strength";
import { useSecurityLogger } from "@/hooks/use-security-logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

/* =======================
   Schemas
======================= */
// Schema simples para login - validação forte ocorre no hook
const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres")
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

export default function Auth() {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const { data: systemSettings } = useSystemSettings();
  const loginAttempts = useLoginAttempts();
  const securityLogger = useSecurityLogger();
  const passwordStrength = usePasswordStrength("");

  const logoUrl = useMemo(() => {
    if (!systemSettings) return '/logo.png';
    return resolvedTheme === 'dark' 
      ? systemSettings.logo_url_dark || systemSettings.logo_url_light || '/logo.png'
      : systemSettings.logo_url_light || systemSettings.logo_url_dark || '/logo.png';
  }, [systemSettings, resolvedTheme]);

  // Logar acesso à página
  useEffect(() => {
    securityLogger.logPageAccess();
  }, []);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });
  const [forgotEmail, setForgotEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Calcular força de senha em tempo real
  const currentPasswordStrength = usePasswordStrength(loginData.password);

  const setFieldErrorFromZod = (zodError: z.ZodError) => {
    const fieldErrors: Record<string, string> = {};
    zodError.errors.forEach(err => {
      const key = err.path[0]?.toString();
      if (key) fieldErrors[key] = err.message;
    });
    setErrors(fieldErrors);
  };

  /* =======================
     Login
  ======================= */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Verificar se está bloqueado por brute force
    if (loginAttempts.isLockedOut) {
      const remainingTime = Math.ceil(loginAttempts.remainingLockoutTime / 1000 / 60);
      toast({
        variant: "destructive",
        title: "Muitas tentativas",
        description: `Sua conta foi temporariamente bloqueada. Tente novamente em ${remainingTime} minutos.`,
      });
      securityLogger.logBruteForce(loginData.email, loginAttempts.attemptCount);
      return;
    }

    // Aguardar delay progressivo
    const delay = loginAttempts.nextAttemptDelay;
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Validação básica
    const parsed = loginSchema.safeParse(loginData);
    if (!parsed.success) {
      setFieldErrorFromZod(parsed.error);
      securityLogger.logValidationError('email/password', 'Validação básica falhou');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signIn(loginData.email, loginData.password);

      if (error) {
        // Registrar tentativa falhada
        loginAttempts.recordFailedAttempt();
        securityLogger.logLoginAttempt(loginData.email, false, error.message);

        // Mensagem genérica para não revelar se email existe
        toast({
          variant: "destructive",
          title: "Erro ao entrar",
          description: "Credenciais inválidas. Verifique seu email e senha.",
        });
        setLoading(false);
        return;
      }

      // Login bem-sucedido
      loginAttempts.resetOnSuccess();
      securityLogger.logLoginAttempt(loginData.email, true);
      setLoading(false);
    } catch (error) {
      loginAttempts.recordFailedAttempt();
      securityLogger.logLoginAttempt(loginData.email, false, String(error));
      
      toast({
        variant: "destructive",
        title: "Erro ao entrar",
        description: "Ocorreu um erro. Tente novamente.",
      });
      setLoading(false);
    }
  };

  /* =======================
     Forgot Password
  ======================= */
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const parsed = forgotPasswordSchema.safeParse({ email: forgotEmail });
    if (!parsed.success) {
      setFieldErrorFromZod(parsed.error);
      securityLogger.logValidationError('email', 'Email inválido para reset');
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao enviar email",
          description: "Não foi possível enviar o email de recuperação. Tente novamente.",
        });
        securityLogger.logEvent({
          type: 'password_reset_requested',
          email: forgotEmail,
          details: { error: error.message },
        });
        setLoading(false);
        return;
      }
      
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
      securityLogger.logPasswordResetRequest(forgotEmail);
      
      setMode('login');
      setForgotEmail("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar email",
        description: "Ocorreu um erro. Tente novamente.",
      });
      securityLogger.logEvent({
        type: 'password_reset_requested',
        email: forgotEmail,
        details: { error: String(error) },
      });
    }

    setLoading(false);
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-3xl p-9 border border-border">

          {/* LOGO + SUBTÍTULO */}
          <div className="flex flex-col items-center mb-5">
            <img 
              src={logoUrl} 
              alt="Vetter CRM" 
              className="h-16 w-auto mb-4" 
              width={175}
              height={64}
              fetchPriority="high"
              decoding="async"
            />
            <p className="text-center text-xs text-foreground">
              {mode === 'login' 
                ? 'Acesse seu sistema de gestão imobiliário' 
                : 'Recupere o acesso à sua conta'}
            </p>
          </div>

          {mode === 'login' ? (
            /* LOGIN FORM */
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Aviso de bloqueio */}
              {loginAttempts.isLockedOut && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-destructive">
                    <p className="font-semibold">Temporariamente bloqueado</p>
                    <p>Muitas tentativas. Tente novamente em {Math.ceil(loginAttempts.remainingLockoutTime / 1000 / 60)} minutos.</p>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm text-foreground">Seu e-mail</Label>
                <Input 
                  type="email" 
                  placeholder="seu@email.com" 
                  value={loginData.email} 
                  onChange={e => setLoginData({ ...loginData, email: e.target.value })} 
                  className="h-12 rounded-2xl bg-muted" 
                  disabled={loginAttempts.isLockedOut}
                />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm text-foreground">Sua senha</Label>
                  <button
                    type="button"
                    onClick={() => setShowPasswordStrength(!showPasswordStrength)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPasswordStrength ? 'Ocultar' : 'Ver requisitos'}
                  </button>
                </div>

                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    value={loginData.password} 
                    onChange={e => setLoginData({ ...loginData, password: e.target.value })} 
                    className="h-12 rounded-2xl bg-muted pr-12" 
                    disabled={loginAttempts.isLockedOut}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={loginAttempts.isLockedOut}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}

                {/* Indicador de força de senha */}
                {showPasswordStrength && loginData.password && (
                  <div className="mt-3 p-3 bg-muted rounded-lg space-y-2">
                    {/* Barra de força */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-foreground">Força da senha</span>
                        <span className={`text-xs font-semibold ${
                          currentPasswordStrength.level === 'very-weak' ? 'text-red-500' :
                          currentPasswordStrength.level === 'weak' ? 'text-orange-500' :
                          currentPasswordStrength.level === 'fair' ? 'text-yellow-500' :
                          currentPasswordStrength.level === 'good' ? 'text-blue-500' :
                          'text-green-500'
                        }`}>
                          {currentPasswordStrength.level === 'very-weak' && 'Muito fraca'}
                          {currentPasswordStrength.level === 'weak' && 'Fraca'}
                          {currentPasswordStrength.level === 'fair' && 'Razoável'}
                          {currentPasswordStrength.level === 'good' && 'Boa'}
                          {currentPasswordStrength.level === 'strong' && 'Forte'}
                        </span>
                      </div>
                      <div className="w-full bg-muted-foreground/20 rounded-full h-1.5">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            currentPasswordStrength.score === 1 ? 'w-1/5 bg-red-500' :
                            currentPasswordStrength.score === 2 ? 'w-2/5 bg-orange-500' :
                            currentPasswordStrength.score === 3 ? 'w-3/5 bg-yellow-500' :
                            currentPasswordStrength.score === 4 ? 'w-4/5 bg-blue-500' :
                            'w-full bg-green-500'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Feedback */}
                    <div className="space-y-1">
                      {currentPasswordStrength.feedback.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          {currentPasswordStrength.isValid ? (
                            <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="text-xs text-muted-foreground">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                disabled={loading || loginAttempts.isLockedOut} 
                className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setErrors({});
                    setForgotEmail(loginData.email);
                  }}
                  disabled={loginAttempts.isLockedOut}
                  className="text-sm text-primary hover:underline disabled:opacity-50"
                >
                  Esqueceu sua senha?
                </button>
              </div>
            </form>
          ) : (
            /* FORGOT PASSWORD FORM */
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrors({});
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <span className="text-sm font-medium text-foreground">Recuperar senha</span>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Digite seu e-mail e enviaremos um link para redefinir sua senha.
              </p>
              
              <div>
                <Label className="text-sm text-foreground">Seu e-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="email" 
                    placeholder="seu@email.com" 
                    value={forgotEmail} 
                    onChange={e => setForgotEmail(e.target.value)} 
                    className="h-12 rounded-2xl bg-muted pl-11" 
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>

              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar link de recuperação
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}