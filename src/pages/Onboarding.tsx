import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, User, Palette, Globe, Share2, CheckCircle2, 
  Upload, Loader2, ChevronRight, ChevronLeft, Briefcase, Construction,
  Instagram, Facebook, Youtube, Linkedin, Mail, Phone, MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { maskCNPJ, maskCPF, maskPhone } from '@/lib/masks';
import { fetchCNPJData } from '@/lib/cnpj';
import { useSystemSettings } from '@/hooks/use-system-settings';
import { useTheme } from 'next-themes';

const STEPS = [
  { id: 1, title: 'Perfil' },
  { id: 2, title: 'Dados Pessoais' },
  { id: 3, title: 'Organização' },
  { id: 4, title: 'Personalização' },
  { id: 5, title: 'Redes Sociais' },
  { id: 6, title: 'Confirmação' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: systemSettings, isLoading: settingsLoading } = useSystemSettings();
  const { resolvedTheme } = useTheme();

  const logoUrl = useMemo(() => {
    if (!systemSettings) return null;
    return resolvedTheme === 'dark'
      ? systemSettings.logo_url_dark || systemSettings.logo_url_light
      : systemSettings.logo_url_light || systemSettings.logo_url_dark;
  }, [systemSettings, resolvedTheme]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    segment: 'corretor',
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
    responsible_name: user?.user_metadata?.full_name || '',
    responsible_email: user?.email || '',
    responsible_cpf: '',
    responsible_phone: '',
    logo_url: '',
    primary_color: '#3b82f6',
    site_title: '',
    custom_domain: '',
    instagram: '',
    facebook: '',
    youtube: '',
    linkedin: '',
    creci: '',
  });

  useEffect(() => {
    if (profile?.organization_id) {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  const updateField = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleFileUpload = async (file: File) => {
    setLogoUploading(true);
    try {
      const uniqueId = user?.id || crypto.randomUUID();
      const ext = file.name.split('.').pop();
      const path = `onboarding/${uniqueId}/logo_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('logos').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path);
      updateField('logo_url', publicUrl);
      toast.success('Logo enviado com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao enviar arquivo: ' + err.message);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleCNPJLookup = async () => {
    const cleanCNPJ = form.cnpj.replace(/\D/g, '');
    if (cleanCNPJ.length !== 14) return;
    setLoading(true);
    const data = await fetchCNPJData(cleanCNPJ);
    if (data) {
      setForm((prev) => ({
        ...prev,
        company_name: data.nome_fantasia || data.razao_social,
        company_address: data.logradouro || '',
        company_city: data.municipio && data.uf ? `${data.municipio} - ${data.uf}` : '',
        company_neighborhood: data.bairro || '',
        company_number: data.numero || '',
        company_email: data.email || '',
        company_phone: data.ddd_telefone_1 || '',
      }));
      toast.success('Dados encontrados!');
    } else {
      toast.error('CNPJ não encontrado');
    }
    setLoading(false);
  };

  const handleNext = () => {
    if (step === 2 && (!form.responsible_name || !form.responsible_email)) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    if (step === 3 && !form.company_name) {
      toast.error('Nome da empresa/profissional é obrigatório');
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handleBack = () => setStep((prev) => prev - 1);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-onboarding', { body: form });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSubmitted(true);
      toast.success('Solicitação enviada!');
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-accent/5 p-4">
        <Card className="max-w-md w-full border-border/50 overflow-hidden">
          <div className="h-2 bg-green-500" />
          <CardContent className="pt-12 pb-12 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold">Solicitação recebida!</h2>
            <p className="text-muted-foreground">
              Nossa equipe vai analisar e liberar seu acesso em breve. Você receberá um e-mail de confirmação.
            </p>
            <Button className="mt-4" onClick={() => navigate('/')}>Voltar ao Início</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 lg:p-12">
      <div className="max-w-6xl mx-auto space-y-16">
        
        {/* Header Centralizado */}
        <div className="flex flex-col items-center text-center space-y-8 py-4">
          <div className="p-1">
            {settingsLoading ? (
              <div className="h-12 w-40 bg-muted animate-pulse rounded-2xl" />
            ) : logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-12 w-auto object-contain" />
            ) : (
              <img src="/logo.png" alt="Vimob" className="h-12 w-auto object-contain" />
            )}
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">Onboarding</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          
          {/* Formulário (Col 1-7) */}
          <div className="lg:col-span-7 space-y-10">
            {/* Progress Bar moved here */}
            <div className="space-y-4 px-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                <span>Passo {step} de {STEPS.length}</span>
                <span>{Math.round((step / STEPS.length) * 100)}%</span>
              </div>
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-700 ease-in-out rounded-full"
                  style={{ width: `${(step / STEPS.length) * 100}%` }}
                />
              </div>
            </div>

            <Card className="border-border/60 bg-card/30 backdrop-blur-sm rounded-[2.5rem] overflow-hidden shadow-none transition-all duration-500">
              <CardContent className="p-8 md:p-14">
                
                {step === 1 && (
                  <div className="space-y-8 animate-in">
                    <div className="space-y-3">
                      <h2 className="text-3xl font-bold tracking-tight text-foreground">Como você atua no mercado?</h2>
                      <p className="text-muted-foreground text-lg">Selecione o perfil que melhor define sua operação diária.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-5">
                      {[
                        { id: 'corretor', label: 'Corretor Autônomo', desc: 'Trabalho de forma independente', icon: User },
                        { id: 'imobiliaria', label: 'Imobiliária / Agência', desc: 'Tenho ou gerencio uma imobiliária', icon: Building2 },
                        { id: 'incorporadora', label: 'Incorporadora / Construtora', desc: 'Desenvolvo ou vendo empreendimentos', icon: Construction },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => updateField('segment', item.id)}
                          className={`group relative flex items-center p-6 border rounded-3xl text-left transition-all duration-300 ${
                            form.segment === item.id 
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                              : 'border-border bg-card/30 shadow-none hover:border-primary/20'
                          }`}
                        >
                          <div className={`mr-5 p-4 rounded-2xl transition-all duration-300 ${
                            form.segment === item.id ? 'bg-primary text-primary-foreground' : 'bg-muted group-hover:bg-accent'
                          }`}>
                            <item.icon className="h-7 w-7" />
                          </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{item.label}</h3>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                        {form.segment === item.id && (
                          <CheckCircle2 className="h-6 w-6 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8 animate-in">
                  <div className="space-y-3">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Seus dados pessoais</h2>
                    <p className="text-muted-foreground text-lg">Informações básicas para criarmos seu acesso mestre.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="responsible_name">Nome Completo *</Label>
                      <Input id="responsible_name" required value={form.responsible_name} onChange={(e) => updateField('responsible_name', e.target.value)} placeholder="Seu nome" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="responsible_email">E-mail (Login) *</Label>
                      <Input id="responsible_email" type="email" required value={form.responsible_email} onChange={(e) => updateField('responsible_email', e.target.value)} disabled={!!user} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="responsible_cpf">CPF</Label>
                      <Input id="responsible_cpf" value={form.responsible_cpf} onChange={(e) => updateField('responsible_cpf', maskCPF(e.target.value))} placeholder="000.000.000-00" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="responsible_phone">Celular/WhatsApp</Label>
                      <Input id="responsible_phone" value={form.responsible_phone} onChange={(e) => updateField('responsible_phone', maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8 animate-in">
                  <div className="space-y-3">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Dados da organização</h2>
                    <p className="text-muted-foreground text-lg">
                      {form.segment === 'corretor' 
                        ? 'Identidade da sua conta profissional.'
                        : 'Informações oficiais da sua imobiliária ou construtora.'}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {form.segment !== 'corretor' && (
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="cnpj">CNPJ</Label>
                        <div className="flex gap-2">
                          <Input id="cnpj" className="flex-1" value={form.cnpj} onChange={(e) => updateField('cnpj', maskCNPJ(e.target.value))} placeholder="00.000.000/0000-00" />
                          <Button type="button" variant="outline" onClick={handleCNPJLookup} disabled={loading || form.cnpj.length < 18}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="company_name">{form.segment === 'corretor' ? 'Nome Profissional / Nome da Conta *' : 'Nome da Empresa *'}</Label>
                      <Input id="company_name" required value={form.company_name} onChange={(e) => updateField('company_name', e.target.value)} placeholder="Ex: Imobiliária Silva ou João Corretor" />
                    </div>
                    {form.segment === 'corretor' ? (
                      <div className="space-y-2">
                        <Label htmlFor="creci">CRECI</Label>
                        <Input id="creci" value={form.creci} onChange={(e) => updateField('creci', e.target.value)} placeholder="12345-F" />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="company_phone">Telefone Comercial</Label>
                          <Input id="company_phone" value={form.company_phone} onChange={(e) => updateField('company_phone', maskPhone(e.target.value))} placeholder="(00) 0000-0000" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company_email">E-mail Institucional</Label>
                          <Input id="company_email" type="email" value={form.company_email} onChange={(e) => updateField('company_email', e.target.value)} placeholder="contato@empresa.com" />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label htmlFor="company_address">Endereço Completo</Label>
                          <Input id="company_address" value={form.company_address} onChange={(e) => updateField('company_address', e.target.value)} placeholder="Rua, Número, Cidade - UF" />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-8 animate-in">
                  <div className="space-y-3">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Personalização</h2>
                    <p className="text-muted-foreground text-lg">Defina como seus clientes verão sua marca na plataforma.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <Label>Logotipo (PNG/JPG)</Label>
                      <div className="flex items-center gap-4">
                        <div className="h-24 w-24 rounded-xl border-2 border-dashed flex items-center justify-center bg-muted/30 overflow-hidden relative group">
                          {form.logo_url ? (
                            <img src={form.logo_url} className="w-full h-full object-contain p-2" />
                          ) : (
                            <Upload className="h-8 w-8 text-muted-foreground" />
                          )}
                          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                          {logoUploading && <div className="absolute inset-0 bg-background/80 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-xs text-muted-foreground">Clique para enviar ou arraste o arquivo.</p>
                          <Button size="sm" variant="outline" type="button">Escolher arquivo</Button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="primary_color">Cor principal da marca</Label>
                      <div className="flex gap-2">
                        <Input id="primary_color" type="color" className="w-16 h-10 p-1" value={form.primary_color} onChange={(e) => updateField('primary_color', e.target.value)} />
                        <Input value={form.primary_color} onChange={(e) => updateField('primary_color', e.target.value)} className="font-mono" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="site_title">Título do site</Label>
                      <Input id="site_title" value={form.site_title} onChange={(e) => updateField('site_title', e.target.value)} placeholder="Ex: Melhores Imóveis em São Paulo" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="custom_domain">Domínio próprio</Label>
                      <Input id="custom_domain" value={form.custom_domain} onChange={(e) => updateField('custom_domain', e.target.value)} placeholder="www.meusite.com.br" />
                    </div>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-8 animate-in">
                  <div className="space-y-3">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Redes Sociais</h2>
                    <p className="text-muted-foreground text-lg">Conecte seus canais digitais para maior alcance.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Instagram className="h-4 w-4" /> Instagram</Label>
                      <Input value={form.instagram} onChange={(e) => updateField('instagram', e.target.value)} placeholder="@seuperfil" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Facebook className="h-4 w-4" /> Facebook</Label>
                      <Input value={form.facebook} onChange={(e) => updateField('facebook', e.target.value)} placeholder="facebook.com/suapagina" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Youtube className="h-4 w-4" /> YouTube</Label>
                      <Input value={form.youtube} onChange={(e) => updateField('youtube', e.target.value)} placeholder="youtube.com/@seu-canal" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Linkedin className="h-4 w-4" /> LinkedIn</Label>
                      <Input value={form.linkedin} onChange={(e) => updateField('linkedin', e.target.value)} placeholder="linkedin.com/in/perfil" />
                    </div>
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-8 animate-in">
                  <div className="space-y-3">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Confirmação</h2>
                    <p className="text-muted-foreground text-lg">Tudo pronto! Revise as informações antes de finalizar.</p>
                  </div>
                  <div className="bg-muted/30 rounded-3xl p-8 space-y-6 border border-border/40">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-muted-foreground">Perfil:</div>
                      <div className="font-semibold capitalize">{form.segment}</div>
                      <div className="text-muted-foreground">Responsável:</div>
                      <div className="font-semibold">{form.responsible_name}</div>
                      <div className="text-muted-foreground">Empresa/Conta:</div>
                      <div className="font-semibold">{form.company_name}</div>
                      {form.creci && (
                        <>
                          <div className="text-muted-foreground">CRECI:</div>
                          <div className="font-semibold">{form.creci}</div>
                        </>
                      )}
                      {form.cnpj && (
                        <>
                          <div className="text-muted-foreground">CNPJ:</div>
                          <div className="font-semibold">{form.cnpj}</div>
                        </>
                      )}
                    </div>
                    <Separator />
                    <p className="text-xs text-center text-muted-foreground">
                      Ao clicar em enviar, você concorda com nossos termos de serviço.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-10 mt-10 border-t">
                <Button variant="outline" onClick={handleBack} disabled={step === 1 || loading}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
                </Button>
                {step === STEPS.length ? (
                  <Button onClick={handleSubmit} disabled={loading} size="lg" className="px-8 shadow-none">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Enviar Solicitação'}
                  </Button>
                ) : (
                  <Button onClick={handleNext} disabled={loading} size="lg" className="px-8">
                    Próximo <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5 sticky top-12 hidden lg:block">
          <div className="space-y-6 pt-10">
            <Card className="overflow-hidden border-border/60 bg-card/20 backdrop-blur-md rounded-[3rem] shadow-none">
              <div className="h-40 transition-colors duration-700" style={{ backgroundColor: `${form.primary_color}15` }} />
              <CardContent className="px-10 pb-12 -mt-20 space-y-10">
                <div className="flex items-end justify-between">
                  <div className="h-36 w-36 rounded-[2rem] border-8 border-card bg-card flex items-center justify-center overflow-hidden transition-all duration-500 shadow-none">
                    {form.logo_url ? (
                      <img src={form.logo_url} className="w-full h-full object-contain p-4" />
                    ) : (
                      <div className="h-full w-full bg-muted/50 flex items-center justify-center">
                        <Building2 className="h-12 w-12 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className="pb-4">
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      form.segment === 'corretor' ? 'bg-blue-500/10 text-blue-600' : 
                      form.segment === 'imobiliaria' ? 'bg-orange-500/10 text-orange-600' : 'bg-purple-500/10 text-purple-600'
                    }`}>
                      {form.segment.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight">{form.company_name || 'Nome da sua marca'}</h2>
                  {form.creci && <p className="text-xs font-mono text-muted-foreground/60">CRECI: {form.creci}</p>}
                  <p className="text-sm text-muted-foreground/80 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> {form.responsible_name || 'Seu Nome'}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 pt-4">
                  <div className="flex items-center gap-4 text-sm p-5 rounded-3xl bg-muted/20 border border-border/10 transition-all hover:bg-muted/30">
                    <div className="p-2.5 rounded-xl bg-background border border-border/10">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <span className="truncate font-medium">{form.responsible_email || 'email@exemplo.com'}</span>
                  </div>
                  {(form.company_phone || form.responsible_phone) && (
                    <div className="flex items-center gap-4 text-sm p-5 rounded-3xl bg-muted/20 border border-border/10 transition-all hover:bg-muted/30">
                      <div className="p-2.5 rounded-xl bg-background border border-border/10">
                        <Phone className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">{form.company_phone || form.responsible_phone}</span>
                    </div>
                  )}
                  {form.company_address && (
                    <div className="flex items-center gap-4 text-sm p-5 rounded-3xl bg-muted/20 border border-border/10 transition-all hover:bg-muted/30">
                      <div className="p-2.5 rounded-xl bg-background border border-border/10">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      <span className="truncate font-medium">{form.company_address}</span>
                    </div>
                  )}
                </div>

                <div className="pt-6">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">Checklist do Perfil</div>
                  <div className="space-y-2">
                    {[
                      { label: 'Identidade Visual', done: !!form.logo_url },
                      { label: 'Dados de Contato', done: !!form.responsible_phone || !!form.company_phone },
                      { label: 'Informações Fiscais', done: !!form.cnpj || !!form.creci },
                      { label: 'Redes Sociais', done: !!form.instagram || !!form.facebook },
                      { label: 'Domínio/Site', done: !!form.site_title || !!form.custom_domain },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <div className={`h-4 w-4 rounded-full flex items-center justify-center ${item.done ? 'bg-green-500 text-white' : 'border border-border bg-accent'}`}>
                          {item.done && <CheckCircle2 className="h-3 w-3" />}
                        </div>
                        <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {form.site_title && (
                  <div className="pt-6 border-t mt-6">
                    <div className="text-xs text-muted-foreground mb-1">Preview de SEO:</div>
                    <div className="text-blue-600 font-medium hover:underline cursor-pointer truncate">
                      {form.site_title}
                    </div>
                    <div className="text-green-700 text-xs truncate">
                      {form.custom_domain || 'seusite.com.br'}
                    </div>
                  </div>
                )}
              </CardContent>
              <div className="p-4 bg-muted/30 border-t">
                <div className="flex justify-center gap-4">
                  {form.instagram && <Instagram className="h-4 w-4 text-muted-foreground" />}
                  {form.facebook && <Facebook className="h-4 w-4 text-muted-foreground" />}
                  {form.youtube && <Youtube className="h-4 w-4 text-muted-foreground" />}
                  {form.linkedin && <Linkedin className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>
            </Card>
          </div>
        </div>

        </div>
      </div>
    </div>
  );
}
