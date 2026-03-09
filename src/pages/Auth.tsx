import { useState } from "react";
import { z } from "zod";
import { Loader2, Eye, EyeOff, ArrowLeft, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/hooks/use-system-settings";
import loginBgFallback from "@/assets/login-bg.jpg";
import logoWhiteFallback from "@/assets/logo-white.png";

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
  const { data: systemSettings } = useSystemSettings();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [forgotEmail, setForgotEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const logoSrc = systemSettings?.logo_url_dark || logoWhiteFallback;
  const loginBgSrc = systemSettings?.login_bg_url || loginBgFallback;

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
    const parsed = loginSchema.safeParse(loginData);
    if (!parsed.success) { setFieldErrorFromZod(parsed.error); return; }
    setLoading(true);
    const { error } = await signIn(loginData.email, loginData.password);
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao entrar",
        description: error.message === "Invalid login credentials" ? "Email ou senha incorretos" : error.message
      });
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = forgotPasswordSchema.safeParse({ email: forgotEmail });
    if (!parsed.success) { setFieldErrorFromZod(parsed.error); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) {
      toast({ variant: "destructive", title: "Erro ao enviar email", description: error.message });
      setLoading(false);
      return;
    }
    toast({ title: "Email enviado!", description: "Verifique sua caixa de entrada para redefinir sua senha." });
    setMode('login');
    setForgotEmail("");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#1f1f1f' }}>
      {/* Left side - Form */}
      <div className="w-full lg:w-[480px] xl:w-[520px] flex flex-col items-center justify-center px-8 md:px-14 py-12 relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <img 
            src={logoSrc} 
            alt="Vimob" 
            className="h-14 w-auto mb-5" 
          />
          <p className="text-center text-sm" style={{ color: '#ff482a' }}>
            {mode === 'login' 
              ? 'Acesse seu sistema de gestão imobiliário' 
              : 'Recupere o acesso à sua conta'}
          </p>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-5 w-full max-w-sm">
            <div>
              <Label className="text-sm" style={{ color: '#a0a0a0' }}>Seu e-mail</Label>
              <Input 
                type="email" 
                placeholder="seu@email.com" 
                value={loginData.email} 
                onChange={e => setLoginData({ ...loginData, email: e.target.value })} 
                className="h-12 rounded-2xl border-0 text-white placeholder:text-gray-500 focus-visible:ring-1"
                style={{ backgroundColor: '#2a2a2a', borderColor: '#333' }}
              />
              {errors.email && <p className="text-xs mt-1" style={{ color: '#ff482a' }}>{errors.email}</p>}
            </div>

            <div>
              <Label className="text-sm" style={{ color: '#a0a0a0' }}>Sua senha</Label>
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={loginData.password} 
                  onChange={e => setLoginData({ ...loginData, password: e.target.value })} 
                  className="h-12 rounded-2xl border-0 pr-12 text-white placeholder:text-gray-500 focus-visible:ring-1"
                  style={{ backgroundColor: '#2a2a2a', borderColor: '#333' }}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#666' }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && <p className="text-xs mt-1" style={{ color: '#ff482a' }}>{errors.password}</p>}
            </div>

            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full h-12 rounded-full font-semibold text-white border-0 text-base tracking-wide"
              style={{ backgroundColor: '#ff482a' }}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ENTRAR
            </Button>
            
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setMode('forgot'); setErrors({}); setForgotEmail(loginData.email); }}
                className="text-sm hover:underline"
                style={{ color: '#ff482a' }}
              >
                Esqueceu sua senha?
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-5 w-full max-w-sm">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => { setMode('login'); setErrors({}); }}
                className="transition-colors"
                style={{ color: '#a0a0a0' }}
              >
                <ArrowLeft size={20} />
              </button>
              <span className="text-sm font-medium text-white">Recuperar senha</span>
            </div>
            
            <p className="text-sm" style={{ color: '#a0a0a0' }}>
              Digite seu e-mail e enviaremos um link para redefinir sua senha.
            </p>
            
            <div>
              <Label className="text-sm" style={{ color: '#a0a0a0' }}>Seu e-mail</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#666' }} />
                <Input 
                  type="email" 
                  placeholder="seu@email.com" 
                  value={forgotEmail} 
                  onChange={e => setForgotEmail(e.target.value)} 
                  className="h-12 rounded-2xl border-0 pl-11 text-white placeholder:text-gray-500 focus-visible:ring-1"
                  style={{ backgroundColor: '#2a2a2a', borderColor: '#333' }}
                />
              </div>
              {errors.email && <p className="text-xs mt-1" style={{ color: '#ff482a' }}>{errors.email}</p>}
            </div>

            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full h-12 rounded-full font-semibold text-white border-0 text-base"
              style={{ backgroundColor: '#ff482a' }}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar link de recuperação
            </Button>
          </form>
        )}
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:block flex-1 relative overflow-hidden">
        <img 
          src={loginBgSrc} 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute bottom-12 right-12 flex flex-col gap-3 opacity-30">
          <div className="flex gap-3">
            <div className="w-16 h-16 rounded-full border-2" style={{ borderColor: '#ff482a' }} />
            <div className="w-16 h-16 rounded-full border-2" style={{ borderColor: '#ff482a' }} />
          </div>
          <div className="flex gap-3 ml-8">
            <div className="w-16 h-16 rounded-full border-2" style={{ borderColor: '#ff482a' }} />
            <div className="w-16 h-16 rounded-full border-2" style={{ borderColor: '#ff482a' }} />
          </div>
          <div className="flex gap-3">
            <div className="w-16 h-16 rounded-full border-2" style={{ borderColor: '#ff482a' }} />
            <div className="w-16 h-16 rounded-full border-2" style={{ borderColor: '#ff482a' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
