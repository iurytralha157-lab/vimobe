import { useState, useMemo, useEffect, useCallback } from "react";
import { z } from "zod";
import { Loader2, Eye, EyeOff, ArrowLeft, Mail, AlertCircle, Check, ShieldAlert } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSystemSettings } from "@/hooks/use-system-settings";
import { useLoginAttempts } from "@/hooks/use-login-attempts";
import { usePasswordStrength, type PasswordStrength } from "@/hooks/use-password-strength";
import { useSecurityLogger } from "@/hooks/use-security-logger";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getFriendlyErrorMessage } from "@/lib/error-handler";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres")
});

const RESET_COOLDOWN_MS = 60 * 1000; // 1 minuto entre resets

const STRENGTH_COLORS: Record<PasswordStrength['level'], string> = {
  'very-weak': 'bg-red-500',
  'weak': 'bg-orange-500',
  'fair': 'bg-yellow-500',
  'good': 'bg-lime-500',
  'strong': 'bg-green-500',
};

const STRENGTH_LABELS: Record<PasswordStrength['level'], string> = {
  'very-weak': 'Muito fraca',
  'weak': 'Fraca',
  'fair': 'Razoável',
  'good': 'Boa',
  'strong': 'Forte',
};

const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

export default function Auth() {
  const { signIn, resetPassword } = useAuth();
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

  const logPageAccess = useCallback(() => {
    securityLogger.logPageAccess();
  }, [securityLogger]);

  useEffect(() => {
    logPageAccess();
  }, [logPageAccess]);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [forgotEmail, setForgotEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bgLoaded, setBgLoaded] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('remember_me') === 'true';
  });
  const [lastResetTime, setLastResetTime] = useState<number>(() => {
    const stored = localStorage.getItem('last_password_reset');
    return stored ? parseInt(stored, 10) : 0;
  });
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Pre-load background image only on desktop (mobile uses CSS gradient to save 500KB+)
  useEffect(() => {
    if (!loginBgUrl) return;
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) return;
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

  const handleCapsLock = useCallback((e: React.KeyboardEvent) => {
    setCapsLockOn(e.getModifierState('CapsLock'));
  }, []);

  const switchMode = useCallback((newMode: 'login' | 'forgot') => {
    setIsTransitioning(true);
    setTimeout(() => {
      setMode(newMode);
      setErrors({});
      if (newMode === 'forgot') {
        setForgotEmail(loginData.email);
      }
      setTimeout(() => setIsTransitioning(false), 50);
    }, 200);
  }, [loginData.email]);

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
          description: getFriendlyErrorMessage(error),
        });
        return;
      }

      loginAttempts.resetOnSuccess();
      securityLogger.logLoginAttempt(loginData.email, true);
    } catch (error) {
      loginAttempts.recordFailedAttempt();
      securityLogger.logLoginAttempt(loginData.email, false, String(error));
      toast({
        variant: "destructive",
        title: "Erro ao entrar",
        description: getFriendlyErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Rate limiting: 1 reset por minuto
    const now = Date.now();
    const timeSinceLastReset = now - lastResetTime;
    if (timeSinceLastReset < RESET_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((RESET_COOLDOWN_MS - timeSinceLastReset) / 1000);
      toast({
        variant: "destructive",
        title: "Aguarde",
        description: `Você já solicitou um reset recentemente. Tente novamente em ${remainingSeconds} segundos.`,
      });
      return;
    }

    const parsed = forgotPasswordSchema.safeParse({ email: forgotEmail });
    if (!parsed.success) {
      setFieldErrorFromZod(parsed.error);
      securityLogger.logValidationError('email', 'Email inválido para reset');
      return;
    }

    setLoading(true);

    try {
      const { error } = await resetPassword(forgotEmail);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao enviar email",
          description: getFriendlyErrorMessage(error),
        });
        securityLogger.logEvent({
          type: 'password_reset_requested',
          email: forgotEmail,
          details: { error: error.message },
        });
        return;
      }

      // Registrar timestamp do reset para rate limiting
      setLastResetTime(now);
      localStorage.setItem('last_password_reset', now.toString());

      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
      securityLogger.logPasswordResetRequest(forgotEmail);
      switchMode('login');
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
    } finally {
      setLoading(false);
    }
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-background relative">
      {/* Mobile: lightweight gradient background instead of heavy image to improve LCP/CLS */}
      <div className="lg:hidden absolute inset-0 w-full h-[55vh] overflow-hidden bg-gradient-to-br from-primary/30 via-primary/10 to-background pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/5 to-background" />
      </div>

      {/* Mobile spacer to push form below image - reduced to allow move the form up */}
      <div className="lg:hidden h-[25vh] min-h-[150px] flex-shrink-0" />

      {/* Login form container */}
      <div className="w-full lg:w-[420px] xl:w-[460px] flex flex-col items-center justify-start lg:justify-center px-8 py-8 lg:py-10 flex-shrink-0 mx-auto lg:mx-0 flex-1 lg:flex-none relative z-10 -mt-16 lg:mt-0">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-2">
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-14 w-auto mb-2"
                fetchPriority="high"
                decoding="async"
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground text-center mb-6" aria-live="polite">
            {mode === 'login'
              ? 'Acesse seu sistema de gestão imobiliário'
              : 'Recupere o acesso à sua conta'}
          </p>

          <div
            className={`transition-all duration-200 ease-in-out ${isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
              }`}
          >
            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-5">
                {loginAttempts.isLockedOut && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2" role="alert">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-destructive">
                      <p className="font-semibold">Temporariamente bloqueado</p>
                      <p>Muitas tentativas. Tente novamente em {Math.ceil(loginAttempts.remainingLockoutTime / 1000 / 60)} minutos.</p>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="login-email" className="text-sm text-foreground">Seu e-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginData.email}
                      onChange={e => setLoginData({ ...loginData, email: e.target.value })}
                      className="h-11 rounded-xl bg-muted pl-11"
                      disabled={loginAttempts.isLockedOut}
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? 'login-email-error' : undefined}
                    />
                  </div>
                  {errors.email && <p id="login-email-error" className="text-xs text-destructive mt-1" role="alert">{errors.email}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="login-password" className="text-sm text-foreground">Sua senha</Label>
                  </div>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                      onKeyDown={handleCapsLock}
                      onKeyUp={handleCapsLock}
                      className="h-11 rounded-xl bg-muted pr-12"
                      disabled={loginAttempts.isLockedOut}
                      aria-invalid={!!errors.password}
                      aria-describedby={errors.password ? 'login-password-error' : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={loginAttempts.isLockedOut}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && <p id="login-password-error" className="text-xs text-destructive mt-1" role="alert">{errors.password}</p>}

                  <div className="flex items-center justify-between mt-3 px-1">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember-me"
                        checked={rememberMe}
                        onCheckedChange={(checked) => {
                          const isChecked = checked === true;
                          setRememberMe(isChecked);
                          localStorage.setItem('remember_me', isChecked.toString());
                        }}
                      />
                      <label htmlFor="remember-me" className="text-xs text-muted-foreground cursor-pointer select-none">
                        Lembrar-me
                      </label>
                    </div>
                  </div>

                  {/* Caps Lock warning */}
                  {capsLockOn && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-warning">
                      <ShieldAlert size={14} />
                      <span>Caps Lock está ativado</span>
                    </div>
                  )}
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
                    onClick={() => switchMode('forgot')}
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
                    onClick={() => switchMode('login')}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Voltar para login"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <span className="text-sm font-medium text-foreground">Recuperar senha</span>
                </div>

                <p className="text-sm text-muted-foreground">
                  Digite seu e-mail e enviaremos um link para redefinir sua senha.
                </p>

                <div>
                  <Label htmlFor="forgot-email" className="text-sm text-foreground">Seu e-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      className="h-11 rounded-xl bg-muted pl-11"
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? 'forgot-email-error' : undefined}
                    />
                  </div>
                  {errors.email && <p id="forgot-email-error" className="text-xs text-destructive mt-1" role="alert">{errors.email}</p>}
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
      </div>

      {/* Right panel - Background image (desktop only, lazy-loaded) */}
      {showBg && (
        <div className="hidden lg:block flex-1 relative">
          <img
            src={loginBgUrl!}
            alt=""
            aria-hidden="true"
            role="presentation"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Horizontal gradient to blend form background with image */}
          <div className="absolute inset-y-0 left-0 w-72 bg-gradient-to-r from-background via-background/80 to-transparent pointer-events-none" />
        </div>
      )}
    </div>
  );
}
