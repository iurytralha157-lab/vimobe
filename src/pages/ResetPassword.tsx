import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Loader2, Eye, EyeOff, Check, ShieldAlert, Lock } from "lucide-react";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";
import { useSystemSettings } from "@/hooks/use-system-settings";
import { usePasswordStrength, type PasswordStrength } from "@/hooks/use-password-strength";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

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

const resetSchema = z.object({
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const { data: systemSettings } = useSystemSettings();

  const [loading, setLoading] = useState(false);
  const [validatingSession, setValidatingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const logoUrl = useMemo(() => {
    if (!systemSettings) return '/logo.png';
    return resolvedTheme === 'dark'
      ? systemSettings.logo_url_dark || systemSettings.logo_url_light || '/logo.png'
      : systemSettings.logo_url_light || systemSettings.logo_url_dark || '/logo.png';
  }, [systemSettings, resolvedTheme]);

  const passwordStrength = usePasswordStrength(password);

  // Detect recovery session — Supabase places tokens in URL hash and emits PASSWORD_RECOVERY event
  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        if (mounted) {
          setHasRecoverySession(true);
          setValidatingSession(false);
        }
      }
    });

    // Also check existing session in case event fired before listener attached
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        if (session) setHasRecoverySession(true);
        setValidatingSession(false);
      }
    })();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = resetSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[String(err.path[0])] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!passwordStrength.isValid) {
      setErrors({ password: "A senha não atende aos critérios mínimos de segurança" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccess(true);
      toast({
        title: "Senha alterada com sucesso!",
        description: "Você já pode fazer login com a nova senha.",
      });

      // Sign out so user logs in fresh with the new password
      await supabase.auth.signOut();

      setTimeout(() => navigate('/auth', { replace: true }), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao alterar senha";
      toast({
        title: "Erro ao alterar senha",
        description: message,
        variant: "destructive",
      });
      setErrors({ password: message });
    } finally {
      setLoading(false);
    }
  };

  if (validatingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasRecoverySession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold">Link inválido ou expirado</h1>
          <p className="text-sm text-muted-foreground">
            Este link de recuperação não é mais válido. Solicite um novo link de redefinição de senha.
          </p>
          <Button className="w-full" onClick={() => navigate('/auth')}>
            Voltar para o login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 space-y-6">
        <div className="flex flex-col items-center space-y-3">
          <img src={logoUrl} alt="Logo" className="h-12 object-contain" />
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-center">Definir nova senha</h1>
          <p className="text-sm text-muted-foreground text-center">
            Digite e confirme sua nova senha de acesso.
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-3 py-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-sm text-foreground">
              Senha alterada com sucesso! Redirecionando para o login...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {password && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= passwordStrength.score
                            ? STRENGTH_COLORS[passwordStrength.level]
                            : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Força: <span className="font-medium">{STRENGTH_LABELS[passwordStrength.level]}</span>
                  </p>
                  {passwordStrength.feedback.length > 0 && !passwordStrength.isValid && (
                    <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
                      {passwordStrength.feedback.map((f, i) => (
                        <li key={i}>• {f}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !passwordStrength.isValid || password !== confirmPassword}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Alterar senha
            </Button>

            <button
              type="button"
              onClick={() => navigate('/auth')}
              disabled={loading}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
