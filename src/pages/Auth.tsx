import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Building2, Loader2, Sparkles, AlertCircle, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

// Schemas de validação
const loginSchema = z.object({
  email: z.string().min(1, "E-mail é obrigatório").email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().min(1, "E-mail é obrigatório").email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não conferem",
  path: ["confirmPassword"],
});

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "E-mail é obrigatório").email("E-mail inválido"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<"auth" | "forgot-password">("auth");
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { signIn, signUp, sendPasswordReset } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Register form
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  // Forgot password form
  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const handleSignIn = async (data: LoginFormData) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);
    if (!error) navigate("/");
  };

  const handleSignUp = async (data: RegisterFormData) => {
    setIsLoading(true);
    await signUp(data.email, data.password, data.name);
    setIsLoading(false);
  };

  const handleForgotPassword = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    const { error } = await sendPasswordReset(data.email);
    setIsLoading(false);
    if (!error) {
      setResetEmailSent(true);
    }
  };

  const handleBackToLogin = () => {
    setView("auth");
    setResetEmailSent(false);
    forgotPasswordForm.reset();
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

        {/* Forgot Password View */}
        {view === "forgot-password" && (
          <Card className="border-0 shadow-soft-lg glass animate-scale-in">
            <CardHeader className="pb-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit -ml-2 text-muted-foreground hover:text-foreground"
                onClick={handleBackToLogin}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t("auth.backToLogin")}
              </Button>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {resetEmailSent ? (
                <div className="text-center space-y-4 py-4 animate-fade-in">
                  <div className="flex justify-center">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">{t("auth.resetLinkSent")}</h3>
                    <p className="text-sm text-muted-foreground">{t("auth.checkYourEmail")}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleBackToLogin}
                  >
                    {t("auth.backToLogin")}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="text-center space-y-2">
                    <div className="flex justify-center mb-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold">{t("auth.forgotPassword")}</h3>
                    <p className="text-sm text-muted-foreground">{t("auth.enterEmailForReset")}</p>
                  </div>

                  <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email" className="text-sm font-medium">
                        {t("auth.email")}
                      </Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="seu@email.com"
                        disabled={isLoading}
                        className={`h-11 bg-background/50 border-border/50 focus:bg-background transition-colors ${
                          forgotPasswordForm.formState.errors.email ? "border-destructive focus:border-destructive" : ""
                        }`}
                        {...forgotPasswordForm.register("email")}
                      />
                      <FieldError message={forgotPasswordForm.formState.errors.email?.message} />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 gradient-primary hover:opacity-90 transition-opacity font-medium"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("common.loading")}
                        </>
                      ) : (
                        t("auth.sendResetLink")
                      )}
                    </Button>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Auth Card (Login/Register) */}
        {view === "auth" && (
          <Card className="border-0 shadow-soft-lg glass animate-scale-in">
            <Tabs defaultValue="login" className="w-full">
              <CardHeader className="pb-4">
                <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted/50">
                  <TabsTrigger value="login" className="text-sm font-medium data-[state=active]:shadow-sm">
                    {t("auth.login")}
                  </TabsTrigger>
                  <TabsTrigger value="register" className="text-sm font-medium data-[state=active]:shadow-sm">
                    {t("auth.register")}
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Login Tab */}
                <TabsContent value="login" className="mt-0 space-y-4">
                  <CardDescription className="text-center">
                    {t("auth.welcomeBack")}
                  </CardDescription>

                  <form onSubmit={loginForm.handleSubmit(handleSignIn)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm font-medium">
                        {t("auth.email")}
                      </Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        disabled={isLoading}
                        className={`h-11 bg-background/50 border-border/50 focus:bg-background transition-colors ${
                          loginForm.formState.errors.email ? "border-destructive focus:border-destructive" : ""
                        }`}
                        {...loginForm.register("email")}
                      />
                      <FieldError message={loginForm.formState.errors.email?.message} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm font-medium">
                        {t("auth.password")}
                      </Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        disabled={isLoading}
                        className={`h-11 bg-background/50 border-border/50 focus:bg-background transition-colors ${
                          loginForm.formState.errors.password ? "border-destructive focus:border-destructive" : ""
                        }`}
                        {...loginForm.register("password")}
                      />
                      <FieldError message={loginForm.formState.errors.password?.message} />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 gradient-primary hover:opacity-90 transition-opacity font-medium"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("common.loading")}
                        </>
                      ) : (
                        t("auth.login")
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="link"
                      className="w-full text-sm text-muted-foreground hover:text-primary"
                      onClick={() => setView("forgot-password")}
                    >
                      {t("auth.forgotPassword")}
                    </Button>
                  </form>
                </TabsContent>

                {/* Register Tab */}
                <TabsContent value="register" className="mt-0 space-y-4">
                  <CardDescription className="text-center">
                    {t("auth.createAccount")}
                  </CardDescription>

                  <form onSubmit={registerForm.handleSubmit(handleSignUp)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name" className="text-sm font-medium">
                        {t("common.name")}
                      </Label>
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Seu nome"
                        disabled={isLoading}
                        className={`h-11 bg-background/50 border-border/50 focus:bg-background transition-colors ${
                          registerForm.formState.errors.name ? "border-destructive focus:border-destructive" : ""
                        }`}
                        {...registerForm.register("name")}
                      />
                      <FieldError message={registerForm.formState.errors.name?.message} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-email" className="text-sm font-medium">
                        {t("auth.email")}
                      </Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="seu@email.com"
                        disabled={isLoading}
                        className={`h-11 bg-background/50 border-border/50 focus:bg-background transition-colors ${
                          registerForm.formState.errors.email ? "border-destructive focus:border-destructive" : ""
                        }`}
                        {...registerForm.register("email")}
                      />
                      <FieldError message={registerForm.formState.errors.email?.message} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-password" className="text-sm font-medium">
                        {t("auth.password")}
                      </Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        disabled={isLoading}
                        className={`h-11 bg-background/50 border-border/50 focus:bg-background transition-colors ${
                          registerForm.formState.errors.password ? "border-destructive focus:border-destructive" : ""
                        }`}
                        {...registerForm.register("password")}
                      />
                      <FieldError message={registerForm.formState.errors.password?.message} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-confirm-password" className="text-sm font-medium">
                        {t("auth.confirmPassword")}
                      </Label>
                      <Input
                        id="register-confirm-password"
                        type="password"
                        placeholder="••••••••"
                        disabled={isLoading}
                        className={`h-11 bg-background/50 border-border/50 focus:bg-background transition-colors ${
                          registerForm.formState.errors.confirmPassword ? "border-destructive focus:border-destructive" : ""
                        }`}
                        {...registerForm.register("confirmPassword")}
                      />
                      <FieldError message={registerForm.formState.errors.confirmPassword?.message} />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 gradient-primary hover:opacity-90 transition-opacity font-medium"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("common.loading")}
                        </>
                      ) : (
                        t("auth.register")
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground animate-fade-in">
          © {new Date().getFullYear()} Vimob. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
