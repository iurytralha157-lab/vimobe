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
  const { data: systemSettings, isLoading: settingsLoading } = useSystemSettings();
  const loginAttempts = useLoginAttempts();
  const securityLogger = useSecurityLogger();

  const logoUrl = useMemo(() => {
    if (!systemSettings) return null;
    return resolvedTheme === 'dark' 
      ? systemSettings.logo_url_dark || systemSettings.logo_url_light || '/logo.png'
      : systemSettings.logo_url_light || systemSettings.logo_url_dark || '/logo.png';
  }, [systemSettings, resolvedTheme]);

  const loginBgUrl = useMemo(() => {
    if (!systemSettings) return null;
    return systemSettings.login_bg_url || null;
  }, [systemSettings]);

  useEffect(() => {
    securityLogger.logPageAccess();
  }, []);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [forgotEmail, setForgotEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bgLoaded, setBgLoaded] = useState(false);
  
  const currentPasswordStrength = usePasswordStrength(loginData.password);

  // Pre-load background image
  useEffect(() => {
    if (!loginBgUrl) return;
    const img = new Image();
    img.onload = () => setBgLoaded(true);
    img.src = loginBgUrl;
  }, [loginBgUrl]);

  const setFieldErrorFromZod = (zodError: z.ZodError) => {
    const fieldErrors: Record<string, string> = {};
    zodError.errors.forEach(err => {
      const key = err.path[0]?.toString();
      if (key) fieldErrors[key] = err.message;
    });
    setErrors(fieldErrors);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

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

    const delay = loginAttempts.nextAttemptDelay;
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

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
        loginAttempts.recordFailedAttempt();
        securityLogger.logLoginAttempt(loginData.email, false, error.message);
        toast({
          variant: "destructive",
          title: "Erro ao entrar",
          description: "Credenciais inválidas. Verifique seu email e senha.",
        });
        setLoading(false);
        return;
      }

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

  // Show nothing until settings are loaded to avoid flash
  if (settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const showBg = loginBgUrl && bgLoaded;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Mobile hero image */}
      {showBg && (
        <div className="lg:hidden relative w-full h-[28vh] min-h-[180px] overflow-hidden">
          <img
            src={loginBgUrl!}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background" />
          {logoUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="h-10 w-auto drop-shadow-lg" 
                fetchPriority="high"
                decoding="async"
              />
            </div>
          )}
        </div>
      )}

      {/* Login form */}
      <div className="w-full lg:w-[420px] xl:w-[460px] flex flex-col items-center justify-center px-8 py-8 lg:py-10 flex-shrink-0 mx-auto lg:mx-0 flex-1 lg:flex-none">
        <div className="w-full max-w-sm">
          {/* LOGO - hidden on mobile when bg image is shown */}
          <div className={`flex flex-col items-center mb-8 ${showBg ? 'hidden lg:flex' : ''}`}>
            {logoUrl && (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="h-10 w-auto mb-4" 
                fetchPriority="high"
                decoding="async"
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {mode === 'login' 
              ? 'Acesse seu sistema de gestão imobiliário' 
              : 'Recupere o acesso à sua conta'}
          </p>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
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
                  className="h-11 rounded-xl bg-muted" 
                  disabled={loginAttempts.isLockedOut}
                />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-sm text-foreground">Sua senha</Label>
                </div>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    value={loginData.password} 
                    onChange={e => setLoginData({ ...loginData, password: e.target.value })} 
                    className="h-11 rounded-xl bg-muted pr-12" 
                    disabled={loginAttempts.isLockedOut}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={loginAttempts.isLockedOut}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
              </div>

              <Button 
                type="submit" 
                disabled={loading || loginAttempts.isLockedOut} 
                className="w-full h-11 rounded-xl font-semibold uppercase tracking-wider text-xs"
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
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrors({}); }}
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
                    className="h-11 rounded-xl bg-muted pl-11" 
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>

              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-11 rounded-xl font-semibold uppercase tracking-wider text-xs"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar link de recuperação
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Right panel - Background image */}
      {showBg && (
        <div className="hidden lg:block flex-1 relative">
          <img
            src={loginBgUrl!}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
}
