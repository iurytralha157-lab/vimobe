import { AppLayout } from "@/components/layout/AppLayout";
import { useOrganizationSite, useCreateOrganizationSite, useUpdateOrganizationSite, useUploadSiteAsset } from "@/hooks/use-organization-site";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Palette, Phone, Share2, Search, Upload, ExternalLink, Copy, Check, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { DnsVerificationStatus } from "@/components/site/DnsVerificationStatus";

export default function SiteSettings() {
  const { profile } = useAuth();
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
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    google_analytics_id: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

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
        seo_title: site.seo_title || '',
        seo_description: site.seo_description || '',
        seo_keywords: site.seo_keywords || '',
        google_analytics_id: site.google_analytics_id || '',
      });
    }
  }, [site]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (site) {
        await updateSite.mutateAsync(formData);
      } else {
        await createSite.mutateAsync(formData);
      }
    } catch (error) {
      console.error('Error saving site:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon' | 'about') => {
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
      }
      
      toast.success('Imagem enviada com sucesso!');
    } catch (error) {
      toast.error('Erro ao enviar imagem');
    }
  };

  const getSiteUrl = () => {
    if (formData.custom_domain && site?.domain_verified) {
      return `https://${formData.custom_domain}`;
    }
    if (formData.subdomain) {
      return `https://${formData.subdomain}.vimob.com.br`;
    }
    return null;
  };

  const copyDnsInstructions = () => {
    const instructions = `Configuração DNS para ${formData.custom_domain}:

Adicione os seguintes registros no seu provedor de domínio:

Registro A (domínio raiz):
- Tipo: A
- Nome: @
- Valor: 185.158.133.1

Registro A (www):
- Tipo: A  
- Nome: www
- Valor: 185.158.133.1`;

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
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações do Site</h1>
            <p className="text-muted-foreground">
              Configure seu site imobiliário público
            </p>
          </div>
          {getSiteUrl() && site?.is_active && (
            <a href={getSiteUrl()!} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                Visitar Site
              </Button>
            </a>
          )}
        </div>

        {!site && (
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
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
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">Geral</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                <span className="hidden sm:inline">Aparência</span>
              </TabsTrigger>
              <TabsTrigger value="contact" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">Contato</span>
              </TabsTrigger>
              <TabsTrigger value="social" className="flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Social</span>
              </TabsTrigger>
              <TabsTrigger value="seo" className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">SEO</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Status do Site</CardTitle>
                  <CardDescription>Ative ou desative seu site público</CardDescription>
                </CardHeader>
                <CardContent>
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
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Subdomínio VIMOB (gratuito)</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="sua-imobiliaria"
                        value={formData.subdomain}
                        onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                        disabled={!isAdmin}
                      />
                      <span className="flex items-center text-muted-foreground">.vimob.com.br</span>
                    </div>
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
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-medium">Configuração DNS</h4>
                            <Button variant="outline" size="sm" onClick={copyDnsInstructions}>
                              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Adicione os seguintes registros no seu provedor de domínio:
                          </p>
                          <div className="space-y-2 font-mono text-sm">
                            <div className="bg-background p-2 rounded">
                              <span className="text-muted-foreground">Tipo:</span> A | 
                              <span className="text-muted-foreground"> Nome:</span> @ | 
                              <span className="text-muted-foreground"> Valor:</span> 185.158.133.1
                            </div>
                            <div className="bg-background p-2 rounded">
                              <span className="text-muted-foreground">Tipo:</span> A | 
                              <span className="text-muted-foreground"> Nome:</span> www | 
                              <span className="text-muted-foreground"> Valor:</span> 185.158.133.1
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                <CardContent className="space-y-6">
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

              <Card>
                <CardHeader>
                  <CardTitle>Cores</CardTitle>
                  <CardDescription>Personalize as cores do seu site</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-3 gap-6">
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

                  {/* Preview */}
                  <div className="mt-6 p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-3">Pré-visualização:</p>
                    <div className="flex gap-4">
                      <div 
                        className="px-4 py-2 rounded text-white text-sm"
                        style={{ backgroundColor: formData.primary_color }}
                      >
                        Botão Primário
                      </div>
                      <div 
                        className="px-4 py-2 rounded text-white text-sm"
                        style={{ backgroundColor: formData.secondary_color }}
                      >
                        Secundário
                      </div>
                      <div 
                        className="px-4 py-2 rounded text-white text-sm"
                        style={{ backgroundColor: formData.accent_color }}
                      >
                        Destaque
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Página Sobre</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Título da Seção</Label>
                    <Input
                      placeholder="Sobre a Nossa Imobiliária"
                      value={formData.about_title}
                      onChange={(e) => setFormData({ ...formData, about_title: e.target.value })}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Texto</Label>
                    <Textarea
                      placeholder="Conte a história da sua imobiliária..."
                      value={formData.about_text}
                      onChange={(e) => setFormData({ ...formData, about_text: e.target.value })}
                      rows={6}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>Imagem</Label>
                    {site?.about_image_url ? (
                      <div className="border rounded-lg p-4 bg-muted">
                        <img src={site.about_image_url} alt="Sobre" className="h-32 object-cover rounded" />
                      </div>
                    ) : null}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'about')}
                        className="hidden"
                        id="about-upload"
                        disabled={!isAdmin}
                      />
                      <label htmlFor="about-upload">
                        <Button variant="outline" size="sm" asChild disabled={!isAdmin}>
                          <span>
                            <Upload className="w-4 h-4 mr-2" />
                            Enviar Imagem
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações de Contato</CardTitle>
                  <CardDescription>Esses dados aparecerão no site e nos formulários</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                <CardContent className="space-y-4">
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
                <CardContent className="space-y-4">
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
