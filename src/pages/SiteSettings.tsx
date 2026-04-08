import { AppLayout } from "@/components/layout/AppLayout";
import { useOrganizationSite, useCreateOrganizationSite, useUpdateOrganizationSite, useUploadSiteAsset } from "@/hooks/use-organization-site";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Globe, Palette, Phone, Share2, Search, Upload, ExternalLink, Copy, Check, Loader2, Maximize2, Droplets, Menu, Info, BarChart3 } from "lucide-react";
import { SiteAnalyticsTab } from "@/components/site/SiteAnalyticsTab";
import { AnimatedIcon } from "@/components/icons/AnimatedIcon";
import GLOBE_JSON from "@/components/icons/globe-icon.json";
import { MenuTab } from "@/components/site/MenuTab";
import { AboutTab } from "@/components/site/AboutTab";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { DnsVerificationStatus } from "@/components/site/DnsVerificationStatus";
import { AnimatedTabNav, AnimatedTabItem } from "@/components/ui/animated-tab-nav";

export default function SiteSettings() {
  const { profile, organization } = useAuth();
  const { data: site, isLoading } = useOrganizationSite();
  const createSite = useCreateOrganizationSite();
  const updateSite = useUpdateOrganizationSite();
  const uploadAsset = useUploadSiteAsset();

  const [formData, setFormData] = useState({
    is_active: false,
    subdomain: '',
    custom_domain: '',
    site_title: '',
    site_description: '',
    primary_color: '#F97316',
    secondary_color: '#1E293B',
    accent_color: '#3B82F6',
    site_theme: 'dark',
    background_color: '#0D0D0D',
    text_color: '#FFFFFF',
    card_color: '#FFFFFF',
    whatsapp: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    instagram: '',
    facebook: '',
    youtube: '',
    linkedin: '',
    about_title: '',
    about_text: '',
    about_subtitle: '',
    about_stats: [
      { value: '500+', label: 'Imóveis Vendidos' },
      { value: '98%', label: 'Clientes Satisfeitos' },
      { value: '15+', label: 'Anos de Experiência' },
      { value: '50+', label: 'Parceiros' },
    ],
    about_checkmarks: ['Atendimento personalizado', 'Imóveis verificados', 'Suporte completo'],
    about_features: [
      { title: 'Imóveis Selecionados', description: 'Curadoria dos melhores imóveis da região com critérios rigorosos de qualidade', icon: 'building' },
      { title: 'Atendimento Personalizado', description: 'Equipe dedicada e treinada para encontrar o imóvel ideal para você', icon: 'users' },
      { title: 'Experiência no Mercado', description: 'Anos de experiência e centenas de clientes satisfeitos no setor imobiliário', icon: 'award' },
      { title: 'Compromisso', description: 'Seu sonho é a nossa prioridade e trabalhamos para realizá-lo', icon: 'heart' },
    ],
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    google_analytics_id: '',
    // New hero fields
    hero_title: '',
    hero_subtitle: '',
    show_about_on_home: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedWorker, setCopiedWorker] = useState(false);

  useEffect(() => {
    if (site) {
      setFormData({
        is_active: site.is_active,
        subdomain: site.subdomain || '',
        custom_domain: site.custom_domain || '',
        site_title: site.site_title || '',
        site_description: site.site_description || '',
        primary_color: site.primary_color || '#F97316',
        secondary_color: site.secondary_color || '#1E293B',
        accent_color: site.accent_color || '#3B82F6',
        site_theme: site.site_theme || 'dark',
        background_color: site.background_color || '#0D0D0D',
        text_color: site.text_color || '#FFFFFF',
        card_color: site.card_color || '#FFFFFF',
        whatsapp: site.whatsapp || '',
        phone: site.phone || '',
        email: site.email || '',
        address: site.address || '',
        city: site.city || '',
        state: site.state || '',
        instagram: site.instagram || '',
        facebook: site.facebook || '',
        youtube: site.youtube || '',
        linkedin: site.linkedin || '',
        about_title: site.about_title || '',
        about_text: site.about_text || '',
        about_subtitle: (site as any).about_subtitle || '',
        about_stats: (site as any).about_stats || [
          { value: '500+', label: 'Imóveis Vendidos' },
          { value: '98%', label: 'Clientes Satisfeitos' },
          { value: '15+', label: 'Anos de Experiência' },
          { value: '50+', label: 'Parceiros' },
        ],
        about_checkmarks: (site as any).about_checkmarks || ['Atendimento personalizado', 'Imóveis verificados', 'Suporte completo'],
        about_features: (site as any).about_features || [
          { title: 'Imóveis Selecionados', description: 'Curadoria dos melhores imóveis da região com critérios rigorosos de qualidade', icon: 'building' },
          { title: 'Atendimento Personalizado', description: 'Equipe dedicada e treinada para encontrar o imóvel ideal para você', icon: 'users' },
          { title: 'Experiência no Mercado', description: 'Anos de experiência e centenas de clientes satisfeitos no setor imobiliário', icon: 'award' },
          { title: 'Compromisso', description: 'Seu sonho é a nossa prioridade e trabalhamos para realizá-lo', icon: 'heart' },
        ],
        seo_title: site.seo_title || '',
        seo_description: site.seo_description || '',
        seo_keywords: site.seo_keywords || '',
        google_analytics_id: site.google_analytics_id || '',
        hero_title: site.hero_title || '',
        hero_subtitle: site.hero_subtitle || '',
        show_about_on_home: site.show_about_on_home ?? false,
      });
    }
  }, [site]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Convert empty strings to null for unique-constrained fields
      const dataToSave = {
        ...formData,
        subdomain: formData.subdomain?.trim() || null,
        custom_domain: formData.custom_domain?.trim() || null,
      };
      if (site) {
        await updateSite.mutateAsync(dataToSave);
      } else {
        await createSite.mutateAsync(dataToSave);
      }
    } catch (error) {
      console.error('Error saving site:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon' | 'about' | 'hero' | 'banner' | 'watermark') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadAsset.mutateAsync({ file, type });
      
      if (type === 'logo') {
        await updateSite.mutateAsync({ logo_url: url });
      } else if (type === 'favicon') {
        await updateSite.mutateAsync({ favicon_url: url });
      } else if (type === 'about') {
        await updateSite.mutateAsync({ about_image_url: url });
      } else if (type === 'hero') {
        await updateSite.mutateAsync({ hero_image_url: url });
      } else if (type === 'banner') {
        await updateSite.mutateAsync({ page_banner_url: url });
      } else if (type === 'watermark') {
        await updateSite.mutateAsync({ watermark_logo_url: url });
      }
      
      toast.success('Imagem enviada com sucesso!');
    } catch (error) {
      toast.error('Erro ao enviar imagem');
    }
  };

  const getPublishedSiteUrl = () => {
    if (formData.custom_domain && site?.domain_verified) {
      return `https://${formData.custom_domain}`;
    }
    if (formData.subdomain) {
      return `https://vimobe.lovable.app/sites/${formData.subdomain}`;
    }
    return null;
  };

  const getSiteUrl = () => {
    if (formData.custom_domain && site?.domain_verified) {
      return `https://${formData.custom_domain}`;
    }
    if (formData.subdomain) {
      return `https://vimobe.lovable.app/sites/${formData.subdomain}`;
    }
    return null;
  };

  const copyPublishedLink = () => {
    const url = getPublishedSiteUrl();
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success('Link copiado!');
    }
  };

  const getWorkerCode = () => {
    const siteTitle = (formData.site_title || organization?.name || 'Site Imobiliário').replace(/'/g, "\\'");
    const siteDescription = (formData.site_description || 'Encontre o imóvel dos seus sonhos conosco.').replace(/'/g, "\\'");
    const siteFavicon = (site?.favicon_url || '/favicon.png').replace(/'/g, "\\'");

    return `export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = 'vimobe.lovable.app';
    const targetUrl = 'https://' + target + url.pathname + url.search;

    const blockedResponseHeaders = [
      'content-encoding',
      'transfer-encoding', 
      'content-length',
    ];

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers),
        'Host': target,
      },
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'follow',
    });

    const newHeaders = new Headers();
    for (const [key, value] of response.headers.entries()) {
      if (!blockedResponseHeaders.includes(key.toLowerCase())) {
        newHeaders.set(key, value);
      }
    }
    
    // Essencial: Evita iframe e CORS bloqueados (Página Branca)
    newHeaders.delete('x-frame-options');
    newHeaders.delete('content-security-policy');
    newHeaders.set('access-control-allow-origin', '*');

    let finalResponse = new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
    
    // Injeta as configurações da imobiliária no HTML para aparecer correto ao compartilhar no WhatsApp/Redes Sociais
    const contentType = finalResponse.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      return new HTMLRewriter()
        .on('title', { element(e) { e.setInnerContent('${siteTitle}'); } })
        .on('meta[property="og:title"]', { element(e) { e.setAttribute('content', '${siteTitle}'); } })
        .on('meta[name="twitter:title"]', { element(e) { e.setAttribute('content', '${siteTitle}'); } })
        .on('meta[name="description"]', { element(e) { e.setAttribute('content', '${siteDescription}'); } })
        .on('meta[property="og:description"]', { element(e) { e.setAttribute('content', '${siteDescription}'); } })
        .on('meta[name="twitter:description"]', { element(e) { e.setAttribute('content', '${siteDescription}'); } })
        .on('link[rel="icon"]', { element(e) { e.setAttribute('href', '${siteFavicon}'); } })
        .on('link[rel="apple-touch-icon"]', { element(e) { e.setAttribute('href', '${siteFavicon}'); } })
        .on('meta[property="og:image"]', { element(e) { e.setAttribute('content', '${siteFavicon}'); } })
        .on('meta[name="twitter:image"]', { element(e) { e.setAttribute('content', '${siteFavicon}'); } })
        .transform(finalResponse);
    }

    return finalResponse;
  }
};`;
  };

  const copyWorkerCode = () => {
    navigator.clipboard.writeText(getWorkerCode());
    setCopiedWorker(true);
    setTimeout(() => setCopiedWorker(false), 2000);
    toast.success('Código do Worker copiado!');
  };

  const copyDnsInstructions = () => {
    const instructions = `Configuração de Domínio Próprio via Cloudflare Workers para ${formData.custom_domain}:

1. Crie uma conta gratuita em https://cloudflare.com
2. Adicione seu domínio (${formData.custom_domain}) no Cloudflare
3. Altere os nameservers no seu registrador para os fornecidos pelo Cloudflare
4. No Cloudflare, vá em Workers and Routes > Create Worker
5. Cole o código do Worker gerado pelo sistema
6. Configure a rota: ${formData.custom_domain}/* → seu Worker

Código do Worker:
${getWorkerCode()}`;

    navigator.clipboard.writeText(instructions);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Instruções copiadas!');
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </AppLayout>
    );
  }

  const isAdmin = profile?.role === 'admin';

  return (
    <AppLayout title="Configurações do Site">
      <div className="space-y-6">
        {!site && (
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              <AnimatedIcon icon={GLOBE_JSON} size={48} trigger="loop" className="mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Crie seu site imobiliário</h2>
              <p className="text-muted-foreground mb-4">
                Configure seu site público para exibir seus imóveis e captar leads automaticamente.
              </p>
              <Button onClick={() => createSite.mutateAsync({ is_active: false })}>
                Começar Configuração
              </Button>
            </CardContent>
          </Card>
        )}

        {site && (
          <Tabs defaultValue="general" className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="general" className="gap-2">
                  <AnimatedIcon icon={GLOBE_JSON} size={20} trigger="hover" />
                  <span>Geral</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="appearance" className="gap-2">
                  <Palette className="w-4 h-4" />
                  <span>Aparência</span>
                </TabsTrigger>
                <TabsTrigger value="menu" className="gap-2">
                  <Menu className="w-4 h-4" />
                  <span>Menu</span>
                </TabsTrigger>
                <TabsTrigger value="about" className="gap-2">
                  <Info className="w-4 h-4" />
                  <span>Sobre</span>
                </TabsTrigger>
                <TabsTrigger value="contact" className="gap-2">
                  <Phone className="w-4 h-4" />
                  <span>Contato</span>
                </TabsTrigger>
                <TabsTrigger value="social" className="gap-2">
                  <Share2 className="w-4 h-4" />
                  <span>Social</span>
                </TabsTrigger>
                <TabsTrigger value="seo" className="gap-2">
                  <Search className="w-4 h-4" />
                  <span>SEO</span>
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <a 
                  href={getPublishedSiteUrl() || `/site/preview?org=${profile?.organization_id}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                </a>
                {getPublishedSiteUrl() && site?.is_active && (
                  <>
                    <Button variant="outline" size="sm" onClick={copyPublishedLink}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Link
                    </Button>
                    <a href={getPublishedSiteUrl()!} target="_blank" rel="noopener noreferrer">
                      <Button size="sm">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Visitar Site
                      </Button>
                    </a>
                  </>
                )}
              </div>
            </div>

            <TabsContent value="general" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Status do Site</CardTitle>
                  <CardDescription>Ative ou desative seu site público</CardDescription>
                </CardHeader>
                <CardContent className="px-4 md:px-6 pb-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Site Ativo</Label>
                      <p className="text-sm text-muted-foreground">
                        Quando ativo, seu site estará acessível publicamente
                      </p>
                    </div>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      disabled={!isAdmin}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Domínio</CardTitle>
                  <CardDescription>Configure o endereço do seu site</CardDescription>
                </CardHeader>
                <CardContent className="px-4 md:px-6 pb-5 space-y-6">
                  {/* Link do Site Publicado */}
                  {formData.subdomain && site?.is_active && (
                    <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                              <Check className="w-4 h-4" />
                              Site Publicado
                            </h4>
                            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                              Seu site está online e acessível
                            </p>
                            <a 
                              href={getPublishedSiteUrl()!} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-green-600 dark:text-green-400 hover:underline font-mono mt-2 block"
                            >
                              {getPublishedSiteUrl()}
                            </a>
                          </div>
                          <Button variant="outline" size="sm" onClick={copyPublishedLink} className="shrink-0">
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="space-y-2">
                    <Label>Slug do Site</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Identificador único do seu site (usado na URL)
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="sua-imobiliaria"
                        value={formData.subdomain}
                        onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                        disabled={!isAdmin}
                      />
                    </div>
                    {formData.subdomain && (
                      <p className="text-sm text-muted-foreground mt-1">
                        URL: <span className="font-mono">{window.location.origin}/sites/{formData.subdomain}</span>
                      </p>
                    )}
                  </div>

                  <div className="border-t pt-6 space-y-4">
                    <div className="space-y-2">
                      <Label>Domínio Próprio</Label>
                      <Input
                        placeholder="www.suaimobiliaria.com.br"
                        value={formData.custom_domain}
                        onChange={(e) => setFormData({ ...formData, custom_domain: e.target.value.toLowerCase() })}
                        disabled={!isAdmin}
                      />
                      <DnsVerificationStatus 
                        domain={formData.custom_domain}
                        isVerified={site?.domain_verified || false}
                        verifiedAt={site?.domain_verified_at}
                      />
                    </div>

                    {formData.custom_domain && !site?.domain_verified && (
                      <Card className="bg-muted">
                        <CardContent className="p-4 space-y-4">
                          <div className="flex items-start justify-between">
                            <h4 className="font-medium">Configurar via Cloudflare Workers</h4>
                            <Button variant="outline" size="sm" onClick={copyDnsInstructions}>
                              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </Button>
                          </div>

                          <div className="space-y-3 text-sm">
                            <div className="flex gap-3">
                              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                              <p>Crie uma conta gratuita em <a href="https://cloudflare.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">cloudflare.com</a></p>
                            </div>
                            <div className="flex gap-3">
                              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                              <p>Adicione seu domínio (<strong>{formData.custom_domain}</strong>) e altere os nameservers no seu registrador para os fornecidos pelo Cloudflare</p>
                            </div>
                            <div className="flex gap-3">
                              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                              <p>No painel do Cloudflare, vá em <strong>Workers and Routes</strong> → <strong>Create Worker</strong></p>
                            </div>
                            <div className="flex gap-3">
                              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">4</span>
                              <div className="flex-1">
                                <p className="mb-2">Cole o código abaixo no editor do Worker:</p>
                                <div className="relative">
                                  <pre className="bg-background p-3 rounded text-xs overflow-x-auto max-h-48 border">{getWorkerCode()}</pre>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={copyWorkerCode} 
                                    className="absolute top-2 right-2"
                                  >
                                    {copiedWorker ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  </Button>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">5</span>
                              <div className="flex-1 space-y-2">
                                <p>Configure a Rota para o seu domínio acessar o Worker:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                  <li>No menu do site, vá em <strong>Workers Routes</strong> → <strong>Add Route</strong></li>
                                  <li>Em "Route", coloque exato: <code className="bg-background px-1 py-0.5 rounded text-xs">{formData.custom_domain}/*</code></li>
                                  <li>Em "Worker", selecione o worker criado no passo 3.</li>
                                  <li>Se quiser com 'www', crie outra rota: <code className="bg-background px-1 py-0.5 rounded text-xs">www.{formData.custom_domain}/*</code></li>
                                </ul>
                                <div className="mt-2 text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-xs border border-amber-200 dark:border-amber-900 border-l-2">
                                  <strong>⚠️ Importante:</strong> Se você abrir o botão "Visualizar" no Cloudflare (link `.workers.dev`), ele vai mostrar <strong>"Site não encontrado"</strong>. Isso é perfeitamente <strong>normal</strong> e indica que o código está funcionando! O sistema só reconhece o site quando acessado pelo seu domínio real configurado na rota.
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-background rounded p-3 text-xs text-muted-foreground space-y-1">
                            <p>✅ SSL automático e gratuito pelo Cloudflare</p>
                            <p>✅ Plano gratuito: 100.000 requests/dia</p>
                            <p>✅ Propagação de DNS pode levar até 72h</p>
                            <p>
                              🔗 Verifique em{' '}
                              <a href="https://dnschecker.org" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                                dnschecker.org
                              </a>
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </CardContent>
              </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent className="px-4 md:px-6 pb-5 space-y-4">
                  <div className="space-y-2">
                    <Label>Título do Site</Label>
                    <Input
                      placeholder="Nome da sua imobiliária"
                      value={formData.site_title}
                      onChange={(e) => setFormData({ ...formData, site_title: e.target.value })}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea
                      placeholder="Uma breve descrição da sua imobiliária..."
                      value={formData.site_description}
                      onChange={(e) => setFormData({ ...formData, site_description: e.target.value })}
                      rows={3}
                      disabled={!isAdmin}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Logo e Favicon</CardTitle>
                </CardHeader>
                <CardContent className="px-4 md:px-6 pb-5 space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label>Logo</Label>
                      {site?.logo_url ? (
                        <div className="border rounded-lg p-4 bg-muted">
                          <img src={site.logo_url} alt="Logo" className="h-16 object-contain" />
                        </div>
                      ) : (
                        <div className="border rounded-lg p-4 bg-muted text-center text-muted-foreground">
                          Nenhuma logo enviada
                        </div>
                      )}
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'logo')}
                          className="hidden"
                          id="logo-upload"
                          disabled={!isAdmin}
                        />
                        <label htmlFor="logo-upload">
                          <Button variant="outline" size="sm" asChild disabled={!isAdmin}>
                            <span>
                              <Upload className="w-4 h-4 mr-2" />
                              Enviar Logo
                            </span>
                          </Button>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Favicon</Label>
                      {site?.favicon_url ? (
                        <div className="border rounded-lg p-4 bg-muted">
                          <img src={site.favicon_url} alt="Favicon" className="h-8 object-contain" />
                        </div>
                      ) : (
                        <div className="border rounded-lg p-4 bg-muted text-center text-muted-foreground">
                          Nenhum favicon enviado
                        </div>
                      )}
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'favicon')}
                          className="hidden"
                          id="favicon-upload"
                          disabled={!isAdmin}
                        />
                        <label htmlFor="favicon-upload">
                          <Button variant="outline" size="sm" asChild disabled={!isAdmin}>
                            <span>
                              <Upload className="w-4 h-4 mr-2" />
                              Enviar Favicon
                            </span>
                          </Button>
                        </label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Logo Size Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Maximize2 className="h-5 w-5" />
                    Tamanho da Logo no Site
                  </CardTitle>
                  <CardDescription>
                    Ajuste as dimensões da logo exibida no site público (em pixels)
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 md:px-6 pb-5">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Sliders */}
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Largura Máxima</Label>
                          <span className="text-sm font-medium text-muted-foreground">{site?.logo_width || 160}px</span>
                        </div>
                        <Slider
                          value={[site?.logo_width || 160]}
                          onValueChange={(value) => updateSite.mutate({ logo_width: value[0] })}
                          min={60}
                           max={800}
                           step={10}
                          className="w-full"
                          disabled={!isAdmin}
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Altura Máxima</Label>
                          <span className="text-sm font-medium text-muted-foreground">{site?.logo_height || 50}px</span>
                        </div>
                        <Slider
                          value={[site?.logo_height || 50]}
                          onValueChange={(value) => updateSite.mutate({ logo_height: value[0] })}
                          min={20}
                           max={200}
                           step={5}
                          className="w-full"
                          disabled={!isAdmin}
                        />
                      </div>
                    </div>

                    {/* Right: Preview */}
                    {site?.logo_url && (
                      <div className="p-4 bg-muted/50 rounded-lg flex flex-col">
                        <Label className="text-xs text-muted-foreground mb-2 block">Pré-visualização</Label>
                        <div className="flex items-center justify-center flex-1 min-h-[80px] bg-background rounded border">
                          <img 
                            src={site.logo_url} 
                            alt="Preview" 
                            style={{ 
                              maxWidth: site.logo_width || 160, 
                              maxHeight: site.logo_height || 50 
                            }}
                            className="object-contain"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tema e Cores</CardTitle>
                  <CardDescription>Personalize o tema e as cores do seu site</CardDescription>
                </CardHeader>
                <CardContent className="px-4 md:px-6 pb-5 space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Settings */}
                    <div className="space-y-6">
                      {/* Theme Selector */}
                      <div className="space-y-3">
                        <Label>Tema do Site</Label>
                        <div className="flex gap-3">
                          <Button
                            type="button"
                            variant={formData.site_theme === 'dark' ? 'default' : 'outline'}
                            onClick={() => {
                              setFormData({
                                ...formData,
                                site_theme: 'dark',
                                background_color: '#0D0D0D',
                                text_color: '#FFFFFF',
                              });
                            }}
                            disabled={!isAdmin}
                            className="flex-1"
                          >
                            🌙 Escuro
                          </Button>
                          <Button
                            type="button"
                            variant={formData.site_theme === 'light' ? 'default' : 'outline'}
                            onClick={() => {
                              setFormData({
                                ...formData,
                                site_theme: 'light',
                                background_color: '#FFFFFF',
                                text_color: '#1A1A1A',
                              });
                            }}
                            disabled={!isAdmin}
                            className="flex-1"
                          >
                            ☀️ Claro
                          </Button>
                        </div>
                      </div>

                      {/* Background & Text Colors */}
                      <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>Cor de Fundo</Label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={formData.background_color}
                              onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                              className="w-12 h-10 rounded border cursor-pointer"
                              disabled={!isAdmin}
                            />
                            <Input
                              value={formData.background_color}
                              onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                              className="flex-1"
                              disabled={!isAdmin}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Cor da Fonte</Label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={formData.text_color}
                              onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                              className="w-12 h-10 rounded border cursor-pointer"
                              disabled={!isAdmin}
                            />
                            <Input
                              value={formData.text_color}
                              onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                              className="flex-1"
                              disabled={!isAdmin}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Cor dos Cards</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={formData.card_color}
                            onChange={(e) => setFormData({ ...formData, card_color: e.target.value })}
                            className="w-12 h-10 rounded border cursor-pointer"
                            disabled={!isAdmin}
                          />
                          <Input
                            value={formData.card_color}
                            onChange={(e) => setFormData({ ...formData, card_color: e.target.value })}
                            className="flex-1"
                            disabled={!isAdmin}
                          />
                        </div>
                      </div>

                      {/* Brand Colors */}
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Cor Principal</Label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={formData.primary_color}
                              onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                              className="w-12 h-10 rounded border cursor-pointer"
                              disabled={!isAdmin}
                            />
                            <Input
                              value={formData.primary_color}
                              onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                              className="flex-1"
                              disabled={!isAdmin}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Cor Secundária</Label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={formData.secondary_color}
                              onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                              className="w-12 h-10 rounded border cursor-pointer"
                              disabled={!isAdmin}
                            />
                            <Input
                              value={formData.secondary_color}
                              onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                              className="flex-1"
                              disabled={!isAdmin}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Cor de Destaque</Label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={formData.accent_color}
                              onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                              className="w-12 h-10 rounded border cursor-pointer"
                              disabled={!isAdmin}
                            />
                            <Input
                              value={formData.accent_color}
                              onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                              className="flex-1"
                              disabled={!isAdmin}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Preview */}
                    <div className="p-4 bg-muted/50 rounded-lg flex flex-col">
                      <p className="text-sm text-muted-foreground mb-3">Pré-visualização:</p>
                      <div 
                        className="p-6 rounded-lg flex-1"
                        style={{ backgroundColor: formData.background_color, color: formData.text_color }}
                      >
                        <p className="text-lg font-semibold mb-2">Texto do site</p>
                        <p className="text-sm opacity-70 mb-4">Subtítulo ou descrição do conteúdo</p>
                        <div 
                          className="p-4 rounded-xl mb-4"
                          style={{ backgroundColor: formData.card_color }}
                        >
                          <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>Exemplo de Card</p>
                          <p className="text-xs mt-1" style={{ color: '#6B7280' }}>Conteúdo dentro do card</p>
                        </div>
                        <div className="flex gap-3 flex-wrap">
                          <div 
                            className="px-4 py-2 rounded-full text-white text-sm font-medium"
                            style={{ backgroundColor: formData.primary_color }}
                          >
                            Botão Principal
                          </div>
                          <div 
                            className="px-4 py-2 rounded-full text-white text-sm font-medium"
                            style={{ backgroundColor: formData.secondary_color }}
                          >
                            Secundário
                          </div>
                          <div 
                            className="px-4 py-2 rounded-full text-white text-sm font-medium"
                            style={{ backgroundColor: formData.accent_color }}
                          >
                            Destaque
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Hero (Banner Principal)</CardTitle>
                  <CardDescription>Configure a imagem e textos da página inicial</CardDescription>
                </CardHeader>
                <CardContent className="px-4 md:px-6 pb-5 space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Hero Image */}
                    <div className="space-y-3">
                      <Label>Imagem do Hero (Tela Inicial)</Label>
                      {site?.hero_image_url ? (
                        <div className="border rounded-lg p-4 bg-muted">
                          <img src={site.hero_image_url} alt="Hero" className="h-32 w-full object-cover rounded" />
                        </div>
                      ) : (
                        <div className="border rounded-lg p-4 bg-muted text-center text-muted-foreground h-32 flex items-center justify-center">
                          Nenhuma imagem do hero enviada
                        </div>
                      )}
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'hero')}
                          className="hidden"
                          id="hero-upload"
                          disabled={!isAdmin}
                        />
                        <label htmlFor="hero-upload">
                          <Button variant="outline" size="sm" asChild disabled={!isAdmin}>
                            <span>
                              <Upload className="w-4 h-4 mr-2" />
                              Enviar Imagem Hero
                            </span>
                          </Button>
                        </label>
                      </div>
                    </div>

                    {/* Banner Image */}
                    <div className="space-y-3">
                      <Label>Banner das Páginas Internas</Label>
                      {site?.page_banner_url ? (
                        <div className="border rounded-lg p-4 bg-muted">
                          <img src={site.page_banner_url} alt="Banner" className="h-32 w-full object-cover rounded" />
                        </div>
                      ) : (
                        <div className="border rounded-lg p-4 bg-muted text-center text-muted-foreground h-32 flex items-center justify-center">
                          Nenhum banner enviado
                        </div>
                      )}
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'banner')}
                          className="hidden"
                          id="banner-upload"
                          disabled={!isAdmin}
                        />
                        <label htmlFor="banner-upload">
                          <Button variant="outline" size="sm" asChild disabled={!isAdmin}>
                            <span>
                              <Upload className="w-4 h-4 mr-2" />
                              Enviar Banner
                            </span>
                          </Button>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Título do Hero</Label>
                      <Input
                        placeholder="Transformando seus sonhos em realidade!"
                        value={formData.hero_title}
                        onChange={(e) => setFormData({ ...formData, hero_title: e.target.value })}
                        disabled={!isAdmin}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Subtítulo do Hero</Label>
                      <Input
                        placeholder="Encontre o imóvel perfeito para você"
                        value={formData.hero_subtitle}
                        onChange={(e) => setFormData({ ...formData, hero_subtitle: e.target.value })}
                        disabled={!isAdmin}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>


              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Droplets className="h-5 w-5" />
                    Marca d'Água
                  </CardTitle>
                  <CardDescription>
                    Adicione uma marca d'água sutil nas fotos dos imóveis para proteger seu conteúdo
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 md:px-6 pb-5 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Ativar marca d'água</Label>
                      <p className="text-sm text-muted-foreground">
                        Quando ativo, a logo será exibida sobre as fotos dos imóveis
                      </p>
                    </div>
                    <Switch
                      checked={site?.watermark_enabled || false}
                      onCheckedChange={(checked) => updateSite.mutate({ watermark_enabled: checked })}
                      disabled={!isAdmin}
                    />
                  </div>

                  {site?.watermark_enabled && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left: Settings */}
                      <div className="space-y-6">
                        <div className="grid sm:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label>Opacidade</Label>
                              <span className="text-sm font-medium text-muted-foreground">{site?.watermark_opacity || 20}%</span>
                            </div>
                            <Slider
                              value={[site?.watermark_opacity || 20]}
                              onValueChange={(value) => updateSite.mutate({ watermark_opacity: value[0] })}
                              min={5}
                              max={50}
                              step={5}
                              className="w-full"
                              disabled={!isAdmin}
                            />
                            <p className="text-xs text-muted-foreground">
                              Valores menores = mais sutil. Recomendado: 15-25%
                            </p>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label>Tamanho (largura)</Label>
                              <span className="text-sm font-medium text-muted-foreground">{site?.watermark_size || 80}px</span>
                            </div>
                            <Slider
                              value={[site?.watermark_size || 80]}
                              onValueChange={(value) => updateSite.mutate({ watermark_size: value[0] })}
                              min={40}
                              max={200}
                              step={10}
                              className="w-full"
                              disabled={!isAdmin}
                            />
                            <p className="text-xs text-muted-foreground">
                              Ajuste o tamanho da logo na exibição
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label>Posição da marca d'água</Label>
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {[
                              { value: 'top-left', label: '↖ Sup. Esq.' },
                              { value: 'top-right', label: '↗ Sup. Dir.' },
                              { value: 'center', label: '⊕ Centro' },
                              { value: 'bottom-left', label: '↙ Inf. Esq.' },
                              { value: 'bottom-right', label: '↘ Inf. Dir.' },
                            ].map(({ value, label }) => (
                              <Button
                                key={value}
                                variant={(site?.watermark_position || 'bottom-right') === value ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => updateSite.mutate({ watermark_position: value })}
                                disabled={!isAdmin}
                                className="text-xs"
                              >
                                {label}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label>Logo da marca d'água</Label>
                          <p className="text-sm text-muted-foreground">
                            Deixe em branco para usar a logo principal do site
                          </p>
                          {site?.watermark_logo_url ? (
                            <div className="border rounded-lg p-4 bg-muted flex items-center justify-between">
                              <img src={site.watermark_logo_url} alt="Watermark" className="h-10 object-contain" />
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => updateSite.mutate({ watermark_logo_url: null })}
                                disabled={!isAdmin}
                              >
                                Remover
                              </Button>
                            </div>
                          ) : (
                            <div className="border rounded-lg p-4 bg-muted text-center text-muted-foreground text-sm">
                              Usando logo principal: {site?.logo_url ? '✓ Configurada' : '⚠️ Não configurada'}
                            </div>
                          )}
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, 'watermark')}
                              className="hidden"
                              id="watermark-upload"
                              disabled={!isAdmin}
                            />
                            <label htmlFor="watermark-upload">
                              <Button variant="outline" size="sm" asChild disabled={!isAdmin}>
                                <span>
                                  <Upload className="w-4 h-4 mr-2" />
                                  Enviar Logo Alternativa
                                </span>
                              </Button>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Right: Preview */}
                      {(site?.watermark_logo_url || site?.logo_url) && (
                        <div className="p-4 bg-muted/50 rounded-lg flex flex-col">
                          <Label className="text-xs text-muted-foreground mb-2 block">Pré-visualização (como aparece no site)</Label>
                          <div className="relative flex-1 min-h-[200px] bg-gradient-to-br from-gray-300 to-gray-400 rounded overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
                              Foto do Imóvel
                            </div>
                            <div 
                              className={`absolute pointer-events-none ${
                                (site?.watermark_position || 'bottom-right') === 'top-left' ? 'top-3 left-3' :
                                (site?.watermark_position || 'bottom-right') === 'top-right' ? 'top-3 right-3' :
                                (site?.watermark_position || 'bottom-right') === 'bottom-left' ? 'bottom-3 left-3' :
                                (site?.watermark_position || 'bottom-right') === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' :
                                'bottom-3 right-3'
                              }`}
                              style={{ opacity: (site?.watermark_opacity || 20) / 100 }}
                            >
                              <img 
                                src={site?.watermark_logo_url || site?.logo_url || ''} 
                                alt="Watermark preview" 
                                style={{ 
                                  maxHeight: `${Math.max(24, Math.min((site?.watermark_size || 80) * 0.4, 60))}px`,
                                  maxWidth: `${Math.max(40, Math.min((site?.watermark_size || 80) * 1, 120))}px`
                                }}
                                className="object-contain"
                              />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            💡 No download, a marca d'água será aplicada em padrão repetido para proteção
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações de Contato</CardTitle>
                  <CardDescription>Esses dados aparecerão no site e nos formulários</CardDescription>
                </CardHeader>
                <CardContent className="px-4 md:px-6 pb-5 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>WhatsApp</Label>
                      <Input
                        placeholder="(11) 99999-9999"
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        disabled={!isAdmin}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input
                        placeholder="(11) 3333-3333"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        disabled={!isAdmin}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      placeholder="contato@suaimobiliaria.com.br"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Endereço</Label>
                    <Input
                      placeholder="Rua, número, complemento"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Input
                        placeholder="São Paulo"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        disabled={!isAdmin}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Input
                        placeholder="SP"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        disabled={!isAdmin}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="social" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Redes Sociais</CardTitle>
                  <CardDescription>Links para suas redes sociais</CardDescription>
                </CardHeader>
                <CardContent className="px-4 md:px-6 pb-5 space-y-4">
                  <div className="space-y-2">
                    <Label>Instagram</Label>
                    <Input
                      placeholder="https://instagram.com/suaimobiliaria"
                      value={formData.instagram}
                      onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Facebook</Label>
                    <Input
                      placeholder="https://facebook.com/suaimobiliaria"
                      value={formData.facebook}
                      onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>YouTube</Label>
                    <Input
                      placeholder="https://youtube.com/@suaimobiliaria"
                      value={formData.youtube}
                      onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>LinkedIn</Label>
                    <Input
                      placeholder="https://linkedin.com/company/suaimobiliaria"
                      value={formData.linkedin}
                      onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                      disabled={!isAdmin}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="seo" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>SEO e Metatags</CardTitle>
                  <CardDescription>Otimize seu site para mecanismos de busca</CardDescription>
                </CardHeader>
                <CardContent className="px-4 md:px-6 pb-5 space-y-4">
                  <div className="space-y-2">
                    <Label>Título SEO</Label>
                    <Input
                      placeholder="Sua Imobiliária - Os Melhores Imóveis da Cidade"
                      value={formData.seo_title}
                      onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                      disabled={!isAdmin}
                    />
                    <p className="text-xs text-muted-foreground">
                      Máximo recomendado: 60 caracteres ({formData.seo_title.length}/60)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição SEO</Label>
                    <Textarea
                      placeholder="Encontre o imóvel dos seus sonhos. Casas, apartamentos e terrenos..."
                      value={formData.seo_description}
                      onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                      rows={3}
                      disabled={!isAdmin}
                    />
                    <p className="text-xs text-muted-foreground">
                      Máximo recomendado: 160 caracteres ({formData.seo_description.length}/160)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Palavras-chave</Label>
                    <Input
                      placeholder="imóveis, casas, apartamentos, aluguel, venda"
                      value={formData.seo_keywords}
                      onChange={(e) => setFormData({ ...formData, seo_keywords: e.target.value })}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Google Analytics ID</Label>
                    <Input
                      placeholder="G-XXXXXXXXXX"
                      value={formData.google_analytics_id}
                      onChange={(e) => setFormData({ ...formData, google_analytics_id: e.target.value })}
                      disabled={!isAdmin}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="menu" className="space-y-6">
              <MenuTab />
            </TabsContent>

            <TabsContent value="about" className="space-y-6">
              <AboutTab
                formData={formData}
                setFormData={setFormData}
                site={site}
                isAdmin={isAdmin}
                handleFileUpload={handleFileUpload}
              />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <SiteAnalyticsTab />
            </TabsContent>

            {isAdmin && (
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving} size="lg">
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar Alterações
                </Button>
              </div>
            )}
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
