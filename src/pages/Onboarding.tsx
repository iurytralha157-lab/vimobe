import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Building2, User, Palette, Globe, Share2, Users, CheckCircle2, Upload, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { useMyOnboardingRequest, OnboardingRequestData } from '@/hooks/use-onboarding-requests';
import { useSystemSettings } from '@/hooks/use-system-settings';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

const SEGMENTS = [
  { value: 'imobiliario', label: 'Imobiliário' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'servicos', label: 'Serviços' },
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'saude', label: 'Saúde' },
  { value: 'educacao', label: 'Educação' },
  { value: 'outros', label: 'Outros' },
];

// Helper to get typed access to the table (not in generated types yet)
const onboardingTable = () => (supabase as any).from('onboarding_requests');

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: existingRequest, isLoading: loadingRequest } = useMyOnboardingRequest();
  const { data: systemSettings } = useSystemSettings();
  const { resolvedTheme } = useTheme();
  
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Auth fields for public visitors
  const [password, setPassword] = useState('');

  const [form, setForm] = useState<OnboardingRequestData>({
    company_name: '',
    cnpj: '',
    company_address: '',
    company_phone: '',
    company_whatsapp: '',
    company_email: '',
    segment: 'imobiliario',
    responsible_name: user?.user_metadata?.name || '',
    responsible_email: user?.email || '',
    responsible_cpf: '',
    responsible_phone: '',
    logo_url: '',
    primary_color: '#3b82f6',
    secondary_color: '',
    site_title: '',
    site_seo_description: '',
    about_text: '',
    banner_url: '',
    banner_title: '',
    instagram: '',
    facebook: '',
    youtube: '',
    linkedin: '',
    team_size: '1-5',
  });

  const isLoggedIn = !!user;

  const logoUrl = useMemo(() => {
    if (!systemSettings) return null;
    const preferredUrl = resolvedTheme === 'dark'
      ? systemSettings.logo_url_dark
      : systemSettings.logo_url_light;
    return preferredUrl || systemSettings.logo_url_light || systemSettings.logo_url_dark;
  }, [systemSettings, resolvedTheme]);

  // If user already has org, redirect
  useEffect(() => {
    if (profile?.organization_id) {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  const updateField = (field: keyof OnboardingRequestData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (file: File, field: 'logo_url' | 'banner_url') => {
    const setUploading = field === 'logo_url' ? setLogoUploading : setBannerUploading;
    setUploading(true);
    try {
      const uniqueId = user?.id || crypto.randomUUID();
      const ext = file.name.split('.').pop();
      const path = `onboarding/${uniqueId}/${field}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('logos').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path);
      updateField(field, publicUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name.trim() || !form.responsible_name.trim() || !form.responsible_email.trim()) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setSubmitting(true);
    try {
      let userId = user?.id;

      // If not logged in, create account first
      if (!isLoggedIn) {
        if (!password || password.length < 6) {
          toast.error('A senha deve ter pelo menos 6 caracteres');
          setSubmitting(false);
          return;
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: form.responsible_email.trim(),
          password,
          options: {
            data: {
              name: form.responsible_name,
            },
            emailRedirectTo: window.location.origin,
          },
        });

        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            toast.error('Este e-mail já está cadastrado. Faça login primeiro.');
          } else {
            toast.error('Erro ao criar conta: ' + signUpError.message);
          }
          setSubmitting(false);
          return;
        }

        userId = signUpData.user?.id;
        if (!userId) {
          toast.error('Erro ao criar conta. Tente novamente.');
          setSubmitting(false);
          return;
        }
      }

      // Submit onboarding request
      const { error } = await onboardingTable()
        .insert({ ...form, user_id: userId });
      
      if (error) throw error;

      toast.success('Solicitação enviada com sucesso! Sua conta será analisada pela nossa equipe.');
      
      // Force refresh to show pending state
      window.location.reload();
    } catch (error: any) {
      toast.error('Erro ao enviar solicitação: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingRequest && isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If already submitted, show pending status
  if (existingRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/20 p-4">
        <Card className="max-w-md w-full border-border/50 shadow-soft">
          <CardContent className="pt-8 pb-8 text-center">
            {existingRequest.status === 'pending' && (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/20 mb-4">
                  <Loader2 className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Solicitação em Análise</h2>
                <p className="text-muted-foreground">
                  Sua solicitação de cadastro foi enviada e está sendo analisada pela nossa equipe. Você será notificado assim que for aprovada.
                </p>
              </>
            )}
            {existingRequest.status === 'rejected' && (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
                  <Building2 className="h-8 w-8 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Solicitação Não Aprovada</h2>
                <p className="text-muted-foreground mb-2">
                  Infelizmente sua solicitação não foi aprovada.
                </p>
                {existingRequest.admin_notes && (
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 mt-3">
                    <strong>Observação:</strong> {existingRequest.admin_notes}
                  </p>
                )}
              </>
            )}
            {existingRequest.status === 'approved' && (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Conta Aprovada!</h2>
                <p className="text-muted-foreground mb-4">
                  Sua conta foi aprovada. Redirecionando...
                </p>
                <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-10 object-contain" />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-glow">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
          )}
          <span className="text-2xl font-bold text-foreground">Cadastro</span>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="border-border/50 shadow-soft">
            <CardContent className="p-6 md:p-8 space-y-8">
              
              {/* DADOS DA EMPRESA */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Dados da Empresa</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Nome da Imobiliária/Empresa *</Label>
                    <Input id="company_name" required value={form.company_name} onChange={e => updateField('company_name', e.target.value)} placeholder="Nome da empresa" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input id="cnpj" value={form.cnpj} onChange={e => updateField('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="company_address">Endereço Completo</Label>
                    <Input id="company_address" value={form.company_address} onChange={e => updateField('company_address', e.target.value)} placeholder="Rua, número, bairro, cidade - UF" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_phone">Telefone Comercial</Label>
                    <Input id="company_phone" value={form.company_phone} onChange={e => updateField('company_phone', e.target.value)} placeholder="(00) 0000-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_whatsapp">WhatsApp da Empresa</Label>
                    <Input id="company_whatsapp" value={form.company_whatsapp} onChange={e => updateField('company_whatsapp', e.target.value)} placeholder="(00) 00000-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_email">E-mail Institucional</Label>
                    <Input id="company_email" type="email" value={form.company_email} onChange={e => updateField('company_email', e.target.value)} placeholder="contato@empresa.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="segment">Segmento de Atuação</Label>
                    <Select value={form.segment} onValueChange={v => updateField('segment', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SEGMENTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <Separator />

              {/* RESPONSÁVEL + CONTA */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Responsável pela Conta</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="responsible_name">Nome Completo *</Label>
                    <Input id="responsible_name" required value={form.responsible_name} onChange={e => updateField('responsible_name', e.target.value)} placeholder="Seu nome completo" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="responsible_email">E-mail (será o login) *</Label>
                    <Input 
                      id="responsible_email" 
                      type="email" 
                      required 
                      value={form.responsible_email} 
                      onChange={e => updateField('responsible_email', e.target.value)} 
                      placeholder="email@exemplo.com"
                      disabled={isLoggedIn}
                    />
                  </div>

                  {/* Password field - only for public visitors */}
                  {!isLoggedIn && (
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha de acesso *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="password" 
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={password} 
                          onChange={e => setPassword(e.target.value)} 
                          placeholder="Mínimo 6 caracteres"
                          className="pl-10 pr-10"
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)} 
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="responsible_cpf">CPF</Label>
                    <Input id="responsible_cpf" value={form.responsible_cpf} onChange={e => updateField('responsible_cpf', e.target.value)} placeholder="000.000.000-00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="responsible_phone">Celular/WhatsApp</Label>
                    <Input id="responsible_phone" value={form.responsible_phone} onChange={e => updateField('responsible_phone', e.target.value)} placeholder="(00) 00000-0000" />
                  </div>
                </div>
              </section>

              <Separator />

              {/* IDENTIDADE VISUAL */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Palette className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Identidade Visual</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Logotipo (PNG, fundo transparente, mín. 500px)</Label>
                    <div className="flex items-center gap-3">
                      {form.logo_url ? (
                        <img src={form.logo_url} alt="Logo" className="h-12 w-auto object-contain rounded border bg-muted p-1" />
                      ) : (
                        <div className="h-12 w-12 rounded border border-dashed border-muted-foreground/30 flex items-center justify-center">
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <label className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" disabled={logoUploading} asChild>
                          <span>
                            {logoUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</> : 'Enviar Logo'}
                          </span>
                        </Button>
                        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'logo_url'); }} />
                      </label>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="primary_color">Cor Principal da Marca</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={form.primary_color} onChange={e => updateField('primary_color', e.target.value)} className="h-10 w-10 rounded cursor-pointer border-0 p-0" />
                        <Input id="primary_color" value={form.primary_color} onChange={e => updateField('primary_color', e.target.value)} placeholder="#FF6600" className="flex-1" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondary_color">Cor Secundária (opcional)</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={form.secondary_color || '#000000'} onChange={e => updateField('secondary_color', e.target.value)} className="h-10 w-10 rounded cursor-pointer border-0 p-0" />
                        <Input id="secondary_color" value={form.secondary_color} onChange={e => updateField('secondary_color', e.target.value)} placeholder="#333333" className="flex-1" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <Separator />

              {/* CONTEÚDO DO SITE */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Conteúdo do Site</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="site_title">Título do Site</Label>
                    <Input id="site_title" value={form.site_title} onChange={e => updateField('site_title', e.target.value)} placeholder='Ex: "Imóveis Premium – Seu novo lar"' />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="banner_title">Título do Banner</Label>
                    <Input id="banner_title" value={form.banner_title} onChange={e => updateField('banner_title', e.target.value)} placeholder='Ex: "Encontre o imóvel dos seus sonhos"' />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="site_seo_description">Descrição para SEO (até 160 caracteres)</Label>
                    <Input id="site_seo_description" maxLength={160} value={form.site_seo_description} onChange={e => updateField('site_seo_description', e.target.value)} placeholder="Breve descrição da empresa para mecanismos de busca" />
                    <p className="text-xs text-muted-foreground text-right">{(form.site_seo_description || '').length}/160</p>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="about_text">Texto "Sobre Nós"</Label>
                    <Textarea id="about_text" rows={4} value={form.about_text} onChange={e => updateField('about_text', e.target.value)} placeholder="Conte um pouco sobre sua empresa..." />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>Imagem do Banner Principal (JPG, mín. 1920x800px)</Label>
                    <div className="flex items-center gap-3">
                      {form.banner_url ? (
                        <img src={form.banner_url} alt="Banner" className="h-16 w-auto object-cover rounded border" />
                      ) : (
                        <div className="h-16 w-24 rounded border border-dashed border-muted-foreground/30 flex items-center justify-center">
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <label className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" disabled={bannerUploading} asChild>
                          <span>
                            {bannerUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</> : 'Enviar Banner'}
                          </span>
                        </Button>
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'banner_url'); }} />
                      </label>
                    </div>
                  </div>
                </div>
              </section>

              <Separator />

              {/* REDES SOCIAIS */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Share2 className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Redes Sociais</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input id="instagram" value={form.instagram} onChange={e => updateField('instagram', e.target.value)} placeholder="@suaempresa" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="facebook">Facebook</Label>
                    <Input id="facebook" value={form.facebook} onChange={e => updateField('facebook', e.target.value)} placeholder="facebook.com/suaempresa" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="youtube">YouTube</Label>
                    <Input id="youtube" value={form.youtube} onChange={e => updateField('youtube', e.target.value)} placeholder="youtube.com/@suaempresa" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input id="linkedin" value={form.linkedin} onChange={e => updateField('linkedin', e.target.value)} placeholder="linkedin.com/company/suaempresa" />
                  </div>
                </div>
              </section>

              <Separator />

              {/* CONFIGURAÇÃO */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Configuração</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="team_size">Quantos usuários pretende utilizar?</Label>
                    <Select value={form.team_size} onValueChange={v => updateField('team_size', v)}>
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
              </section>

              <Separator />

              {/* Submit */}
              <div className="flex flex-col items-end gap-2">
                {!isLoggedIn && (
                  <p className="text-xs text-muted-foreground">
                    Ao enviar, uma conta será criada automaticamente com o e-mail e senha informados.
                  </p>
                )}
                <LoadingButton type="submit" loading={submitting} size="lg">
                  {isLoggedIn ? 'Enviar Solicitação' : 'Criar Conta e Enviar Solicitação'}
                </LoadingButton>
              </div>

            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
