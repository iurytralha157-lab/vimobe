import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Separator } from '@/components/ui/separator';
import { Building2, User, Palette, Globe, Share2, CheckCircle2, Upload, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { useMyOnboardingRequest, OnboardingRequestData } from '@/hooks/use-onboarding-requests';
import { useSystemSettings } from '@/hooks/use-system-settings';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { maskCNPJ, maskCPF, maskPhone } from '@/lib/masks';

const onboardingTable = () => (supabase as any).from('onboarding_requests');

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: existingRequest, isLoading: loadingRequest } = useMyOnboardingRequest();
  const { data: systemSettings } = useSystemSettings();
  const { resolvedTheme } = useTheme();
  
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');

  const [form, setForm] = useState<OnboardingRequestData>({
    company_name: '',
    cnpj: '',
    company_address: '',
    company_city: '',
    company_neighborhood: '',
    company_number: '',
    company_complement: '',
    company_phone: '',
    company_whatsapp: '',
    company_email: '',
    segment: 'imobiliario',
    responsible_name: user?.user_metadata?.name || '',
    responsible_email: user?.email || '',
    responsible_cpf: '',
    responsible_phone: '',
    logo_url: '',
    favicon_url: '',
    primary_color: '#3b82f6',
    secondary_color: '',
    site_title: '',
    custom_domain: '',
    instagram: '',
    facebook: '',
    youtube: '',
    linkedin: '',
  });

  const isLoggedIn = !!user;

  const logoUrl = useMemo(() => {
    if (!systemSettings) return null;
    const preferredUrl = resolvedTheme === 'dark'
      ? systemSettings.logo_url_dark
      : systemSettings.logo_url_light;
    return preferredUrl || systemSettings.logo_url_light || systemSettings.logo_url_dark;
  }, [systemSettings, resolvedTheme]);

  useEffect(() => {
    if (profile?.organization_id) {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  const updateField = (field: keyof OnboardingRequestData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (file: File, field: 'logo_url' | 'favicon_url') => {
    const setUploading = field === 'logo_url' ? setLogoUploading : setFaviconUploading;
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
      toast.error('Erro ao enviar arquivo: ' + (err.message || 'tente novamente'));
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
      const { data, error } = await supabase.functions.invoke('submit-onboarding', {
        body: form,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Solicitação enviada com sucesso! Nossa equipe entrará em contato.');
      setSubmitted(true);
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

  if (existingRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/20 p-4">
        <Card className="max-w-md w-full border-border/50">
          <CardContent className="pt-8 pb-8 text-center">
            {existingRequest.status === 'pending' && (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/20 mb-4">
                  <Loader2 className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Solicitação em Análise</h2>
                <p className="text-muted-foreground">
                  Sua solicitação de cadastro foi enviada e está sendo analisada pela nossa equipe.
                </p>
              </>
            )}
            {existingRequest.status === 'rejected' && (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
                  <Building2 className="h-8 w-8 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Solicitação Não Aprovada</h2>
                <p className="text-muted-foreground mb-2">Infelizmente sua solicitação não foi aprovada.</p>
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
                <p className="text-muted-foreground mb-4">Sua conta foi aprovada. Redirecionando...</p>
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
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
          )}
          <span className="text-2xl font-bold text-foreground">Cadastro</span>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="border-border/50">
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
                    <Input id="cnpj" value={form.cnpj} onChange={e => updateField('cnpj', maskCNPJ(e.target.value))} placeholder="12.345.678/0001-95" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="company_address">Endereço (Rua/Avenida)</Label>
                    <Input id="company_address" value={form.company_address} onChange={e => updateField('company_address', e.target.value)} placeholder="Rua, Avenida..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_number">Número</Label>
                    <Input id="company_number" value={form.company_number} onChange={e => updateField('company_number', e.target.value)} placeholder="123" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_complement">Complemento</Label>
                    <Input id="company_complement" value={form.company_complement} onChange={e => updateField('company_complement', e.target.value)} placeholder="Sala 01, Bloco A..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_neighborhood">Bairro</Label>
                    <Input id="company_neighborhood" value={form.company_neighborhood} onChange={e => updateField('company_neighborhood', e.target.value)} placeholder="Bairro" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_city">Cidade / UF</Label>
                    <Input id="company_city" value={form.company_city} onChange={e => updateField('company_city', e.target.value)} placeholder="São Paulo - SP" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_phone">Telefone Comercial</Label>
                    <Input id="company_phone" value={form.company_phone} onChange={e => updateField('company_phone', maskPhone(e.target.value))} placeholder="(00) 0000-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_whatsapp">WhatsApp da Empresa</Label>
                    <Input id="company_whatsapp" value={form.company_whatsapp} onChange={e => updateField('company_whatsapp', maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_email">E-mail Institucional</Label>
                    <Input id="company_email" type="email" value={form.company_email} onChange={e => updateField('company_email', e.target.value)} placeholder="contato@empresa.com" />
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
                    <Input id="responsible_cpf" value={form.responsible_cpf} onChange={e => updateField('responsible_cpf', maskCPF(e.target.value))} placeholder="000.000.000-00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="responsible_phone">Celular/WhatsApp</Label>
                    <Input id="responsible_phone" value={form.responsible_phone} onChange={e => updateField('responsible_phone', maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
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
                    <Label htmlFor="custom_domain">Domínio Próprio</Label>
                    <Input id="custom_domain" value={form.custom_domain} onChange={e => updateField('custom_domain', e.target.value)} placeholder="www.suaempresa.com.br" />
                  </div>

                  {/* Logo */}
                  <div className="space-y-2">
                    <Label>Logotipo (PNG, fundo transparente)</Label>
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
                        <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'logo_url'); }} />
                      </label>
                    </div>
                  </div>

                  {/* Favicon */}
                  <div className="space-y-2">
                    <Label>Favicon (ícone do site, 32x32 ou 64x64)</Label>
                    <div className="flex items-center gap-3">
                      {form.favicon_url ? (
                        <img src={form.favicon_url} alt="Favicon" className="h-8 w-8 object-contain rounded border bg-muted p-1" />
                      ) : (
                        <div className="h-8 w-8 rounded border border-dashed border-muted-foreground/30 flex items-center justify-center">
                          <Upload className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <label className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" disabled={faviconUploading} asChild>
                          <span>
                            {faviconUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</> : 'Enviar Favicon'}
                          </span>
                        </Button>
                        <input type="file" accept="image/png,image/ico,image/x-icon,image/svg+xml" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'favicon_url'); }} />
                      </label>
                    </div>
                  </div>

                  {/* Cores */}
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

              {/* Submit - Centralizado */}
              <div className="flex flex-col items-center gap-3 pt-2">
                {!isLoggedIn && (
                  <p className="text-xs text-muted-foreground text-center">
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
