import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Building2, Loader2, Sparkles, AlertCircle, CheckCircle2, KeyRound } from "lucide-react";

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não conferem",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { updatePassword, session } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // Verifica se o usuário tem uma sessão válida (veio do link de reset)
  useEffect(() => {
    if (!session) {
      // Aguarda um pouco para dar tempo do Supabase processar o token da URL
      const timeout = setTimeout(() => {
        if (!session) {
          setError(t("auth.invalidResetLink"));
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [session, t]);

  const handleResetPassword = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    const { error } = await updatePassword(data.password);
    setIsLoading(false);
    
    if (error) {
      setError(error.message);
    } else {
      setIsSuccess(true);
    }
  };

  const handleGoToLogin = () => {
    navigate("/auth");
  };

  // Componente de erro inline
  const FieldError = ({ message }: { message?: string }) => {
    if (!message) return null;
    return (
      <p className="text-sm text-destructive flex items-center gap-1 mt-1 animate-fade-in">
        <AlertCircle className="h-3 w-3 shrink-0" />
        {message}
      </p>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 gradient-bg" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-8 p-4 z-10">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-4 animate-fade-in">
          <div className="relative">
            <div className="flex items-center justify-center h-20 w-20 rounded-2xl gradient-primary shadow-glow-lg">
              <Building2 className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 flex items-center justify-center h-6 w-6 rounded-full bg-accent">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-gradient">Vimob</h1>
            <p className="text-muted-foreground">CRM Imobiliário Inteligente</p>
          </div>
        </div>

        {/* Reset Password Card */}
        <Card className="border-0 shadow-soft-lg glass animate-scale-in">
          <CardHeader className="pb-4">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                {isSuccess ? (
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                ) : (
                  <KeyRound className="h-6 w-6 text-primary" />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {isSuccess ? (
              <div className="text-center space-y-4 py-4 animate-fade-in">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">{t("auth.passwordUpdated")}</h3>
                  <p className="text-sm text-muted-foreground">{t("auth.passwordUpdatedDesc")}</p>
                </div>
                <Button
                  type="button"
                  className="w-full h-11 gradient-primary hover:opacity-90 transition-opacity font-medium"
                  onClick={handleGoToLogin}
                >
                  {t("auth.goToLogin")}
                </Button>
              </div>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">{t("auth.resetPassword")}</h3>
                  <p className="text-sm text-muted-foreground">{t("auth.enterNewPassword")}</p>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2 animate-fade-in">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <form onSubmit={form.handleSubmit(handleResetPassword)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-sm font-medium">
                      {t("auth.newPassword")}
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="••••••••"
                      disabled={isLoading}
                      className={`h-11 bg-background/50 border-border/50 focus:bg-background transition-colors ${
                        form.formState.errors.password ? "border-destructive focus:border-destructive" : ""
                      }`}
                      {...form.register("password")}
                    />
                    <FieldError message={form.formState.errors.password?.message} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-new-password" className="text-sm font-medium">
                      {t("auth.confirmNewPassword")}
                    </Label>
                    <Input
                      id="confirm-new-password"
                      type="password"
                      placeholder="••••••••"
                      disabled={isLoading}
                      className={`h-11 bg-background/50 border-border/50 focus:bg-background transition-colors ${
                        form.formState.errors.confirmPassword ? "border-destructive focus:border-destructive" : ""
                      }`}
                      {...form.register("confirmPassword")}
                    />
                    <FieldError message={form.formState.errors.confirmPassword?.message} />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 gradient-primary hover:opacity-90 transition-opacity font-medium"
                    disabled={isLoading || !session}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("common.loading")}
                      </>
                    ) : (
                      t("auth.resetPassword")
                    )}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground animate-fade-in">
          © {new Date().getFullYear()} Vimob. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
