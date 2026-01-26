import { useState } from "react";
import { z } from "zod";
import { Loader2, Eye, EyeOff, ArrowLeft, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

/* =======================
   Schemas
======================= */
const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres")
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

export default function Auth() {
  const {
    signIn
  } = useAuth();
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });
  const [forgotEmail, setForgotEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
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
    const parsed = loginSchema.safeParse(loginData);
    if (!parsed.success) {
      setFieldErrorFromZod(parsed.error);
      return;
    }
    setLoading(true);
    const {
      error
    } = await signIn(loginData.email, loginData.password);
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao entrar",
        description: error.message === "Invalid login credentials" ? "Email ou senha incorretos" : error.message
      });
      setLoading(false);
      return;
    }

    // Não navegar aqui! O App.tsx vai redirecionar automaticamente
    // quando o AuthContext atualizar o estado com user e profile
    setLoading(false);
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
      return;
    }
    
    setLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar email",
        description: error.message,
      });
      setLoading(false);
      return;
    }
    
    toast({
      title: "Email enviado!",
      description: "Verifique sua caixa de entrada para redefinir sua senha.",
    });
    
    setMode('login');
    setForgotEmail("");
    setLoading(false);
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl p-9">

          {/* LOGO + SUBTÍTULO */}
          <div className="flex flex-col items-center mb-5">
            <img 
              src="/logo.png" 
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
              <div>
                <Label className="text-sm text-slate-700">Seu e-mail</Label>
                <Input 
                  type="email" 
                  placeholder="seu@email.com" 
                  value={loginData.email} 
                  onChange={e => setLoginData({ ...loginData, email: e.target.value })} 
                  className="h-12 rounded-2xl bg-slate-50" 
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <Label className="text-sm text-slate-700">Sua senha</Label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    value={loginData.password} 
                    onChange={e => setLoginData({ ...loginData, password: e.target.value })} 
                    className="h-12 rounded-2xl bg-slate-50 pr-12" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              </div>

              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-semibold"
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
                  className="text-sm text-primary hover:underline"
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
                  className="text-slate-400 hover:text-slate-600"
                >
                  <ArrowLeft size={20} />
                </button>
                <span className="text-sm font-medium text-slate-700">Recuperar senha</span>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Digite seu e-mail e enviaremos um link para redefinir sua senha.
              </p>
              
              <div>
                <Label className="text-sm text-slate-700">Seu e-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    type="email" 
                    placeholder="seu@email.com" 
                    value={forgotEmail} 
                    onChange={e => setForgotEmail(e.target.value)} 
                    className="h-12 rounded-2xl bg-slate-50 pl-11" 
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-semibold"
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