import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Save, Upload, Loader2, Sun, Moon, Maximize2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

interface SystemSettingsValue {
  logo_url_light?: string | null;
  logo_url_dark?: string | null;
  favicon_url_light?: string | null;
  favicon_url_dark?: string | null;
  default_whatsapp?: string | null;
  logo_width?: number | null;
  logo_height?: number | null;
}

interface SystemSettingsRow {
  id: string;
  key: string;
  value: Json;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<{ id: string } & SystemSettingsValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSize, setSavingSize] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [uploadingLight, setUploadingLight] = useState(false);
  const [uploadingDark, setUploadingDark] = useState(false);
  const [uploadingFaviconLight, setUploadingFaviconLight] = useState(false);
  const [uploadingFaviconDark, setUploadingFaviconDark] = useState(false);
  const [logoWidth, setLogoWidth] = useState(140);
  const [logoHeight, setLogoHeight] = useState(40);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching settings:', error);
    } else if (data) {
      const row = data as SystemSettingsRow;
      const value = (row.value || {}) as SystemSettingsValue;
      setSettings({
        id: row.id,
        logo_url_light: value.logo_url_light || null,
        logo_url_dark: value.logo_url_dark || null,
        favicon_url_light: value.favicon_url_light || null,
        favicon_url_dark: value.favicon_url_dark || null,
        default_whatsapp: value.default_whatsapp || null,
        logo_width: value.logo_width || null,
        logo_height: value.logo_height || null,
      });
      setWhatsapp(value.default_whatsapp || '');
      setLogoWidth(value.logo_width || 140);
      setLogoHeight(value.logo_height || 40);
    }
    setLoading(false);
  };

  const updateSettingsValue = async (updates: Partial<SystemSettingsValue>) => {
    if (!settings) return;

    const currentValue = {
      logo_url_light: settings.logo_url_light,
      logo_url_dark: settings.logo_url_dark,
      favicon_url_light: settings.favicon_url_light,
      favicon_url_dark: settings.favicon_url_dark,
      default_whatsapp: settings.default_whatsapp,
      logo_width: settings.logo_width,
      logo_height: settings.logo_height,
    };

    const newValue = { ...currentValue, ...updates };

    const { error } = await supabase
      .from('system_settings')
      .update({ value: newValue as unknown as Json })
      .eq('id', settings.id);

    if (error) throw error;

    setSettings(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleUploadLogo = async (file: File, type: 'light' | 'dark') => {
    if (!settings) return;

    const setUploading = type === 'light' ? setUploadingLight : setUploadingDark;
    setUploading(true);

    try {
      const ext = file.name.split('.').pop();
      const path = `system/logo-${type}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(path);

      const updateField = type === 'light' ? 'logo_url_light' : 'logo_url_dark';
      await updateSettingsValue({ [updateField]: publicUrl });

      toast.success(`Logo ${type === 'light' ? 'clara' : 'escura'} atualizada!`);
    } catch (error: any) {
      toast.error('Erro ao fazer upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadFavicon = async (file: File, type: 'light' | 'dark') => {
    if (!settings) return;

    const setUploading = type === 'light' ? setUploadingFaviconLight : setUploadingFaviconDark;
    setUploading(true);

    try {
      const ext = file.name.split('.').pop();
      const path = `system/favicon-${type}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(path);

      const updateField = type === 'light' ? 'favicon_url_light' : 'favicon_url_dark';
      await updateSettingsValue({ [updateField]: publicUrl });

      toast.success(`Ícone ${type === 'light' ? 'claro' : 'escuro'} atualizado!`);
    } catch (error: any) {
      toast.error('Erro ao fazer upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveWhatsapp = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      await updateSettingsValue({ default_whatsapp: whatsapp });
      toast.success('WhatsApp atualizado!');
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLogoSize = async () => {
    if (!settings) return;

    setSavingSize(true);
    try {
      await updateSettingsValue({ logo_width: logoWidth, logo_height: logoHeight });
      toast.success('Tamanho da logo atualizado!');
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setSavingSize(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Configurações do Sistema">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Configurações do Sistema">
      <div className="space-y-6">
        {/* Logo Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Logos do Sistema</CardTitle>
            <CardDescription>
              Configure as logos que serão exibidas em todo o sistema. 
              Use uma logo para tema claro e outra para tema escuro.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Light Theme Logo */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Logo para Tema Claro
              </Label>
              <div className="flex items-center gap-4">
                <div 
                  className="w-48 h-24 rounded-lg bg-white border-2 border-dashed border-border flex items-center justify-center overflow-hidden"
                >
                  {settings?.logo_url_light ? (
                    <img 
                      src={settings.logo_url_light} 
                      alt="Logo Light" 
                      style={{ maxWidth: logoWidth, maxHeight: logoHeight }}
                      className="object-contain"
                    />
                  ) : (
                    <span className="text-muted-foreground text-sm">Sem logo</span>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    id="logo-light-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadLogo(file, 'light');
                    }}
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => document.getElementById('logo-light-upload')?.click()}
                    disabled={uploadingLight}
                  >
                    {uploadingLight ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload Logo Clara
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recomendado: fundo transparente ou branco
                  </p>
                </div>
              </div>
            </div>

            {/* Dark Theme Logo */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                Logo para Tema Escuro
              </Label>
              <div className="flex items-center gap-4">
                <div 
                  className="w-48 h-24 rounded-lg bg-slate-900 border-2 border-dashed border-border flex items-center justify-center overflow-hidden"
                >
                  {settings?.logo_url_dark ? (
                    <img 
                      src={settings.logo_url_dark} 
                      alt="Logo Dark" 
                      style={{ maxWidth: logoWidth, maxHeight: logoHeight }}
                      className="object-contain"
                    />
                  ) : (
                    <span className="text-slate-400 text-sm">Sem logo</span>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    id="logo-dark-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadLogo(file, 'dark');
                    }}
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => document.getElementById('logo-dark-upload')?.click()}
                    disabled={uploadingDark}
                  >
                    {uploadingDark ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload Logo Escura
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recomendado: fundo transparente ou escuro
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Favicon Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Ícone da Sidebar (Favicon)</CardTitle>
            <CardDescription>
              Ícone pequeno exibido na sidebar quando recolhida.
              Recomendado: 32x32px ou 40x40px com fundo transparente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Light Theme Favicon */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Ícone para Tema Claro
              </Label>
              <div className="flex items-center gap-4">
                <div 
                  className="w-16 h-16 rounded-lg bg-white border-2 border-dashed border-border flex items-center justify-center overflow-hidden"
                >
                  {settings?.favicon_url_light ? (
                    <img 
                      src={settings.favicon_url_light} 
                      alt="Favicon Light" 
                      className="w-10 h-10 object-contain"
                    />
                  ) : (
                    <span className="text-muted-foreground text-xs">Sem ícone</span>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    id="favicon-light-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadFavicon(file, 'light');
                    }}
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => document.getElementById('favicon-light-upload')?.click()}
                    disabled={uploadingFaviconLight}
                  >
                    {uploadingFaviconLight ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload Ícone Claro
                  </Button>
                </div>
              </div>
            </div>

            {/* Dark Theme Favicon */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                Ícone para Tema Escuro
              </Label>
              <div className="flex items-center gap-4">
                <div 
                  className="w-16 h-16 rounded-lg bg-slate-900 border-2 border-dashed border-border flex items-center justify-center overflow-hidden"
                >
                  {settings?.favicon_url_dark ? (
                    <img 
                      src={settings.favicon_url_dark} 
                      alt="Favicon Dark" 
                      className="w-10 h-10 object-contain"
                    />
                  ) : (
                    <span className="text-slate-400 text-xs">Sem ícone</span>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    id="favicon-dark-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadFavicon(file, 'dark');
                    }}
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => document.getElementById('favicon-dark-upload')?.click()}
                    disabled={uploadingFaviconDark}
                  >
                    {uploadingFaviconDark ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload Ícone Escuro
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo Size Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Maximize2 className="h-5 w-5" />
              Tamanho da Logo
            </CardTitle>
            <CardDescription>
              Ajuste as dimensões da logo exibida no sistema (em pixels)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Largura Máxima</Label>
                  <span className="text-sm font-medium text-muted-foreground">{logoWidth}px</span>
                </div>
                <Slider
                  value={[logoWidth]}
                  onValueChange={(value) => setLogoWidth(value[0])}
                  min={40}
                  max={300}
                  step={10}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Altura Máxima</Label>
                  <span className="text-sm font-medium text-muted-foreground">{logoHeight}px</span>
                </div>
                <Slider
                  value={[logoHeight]}
                  onValueChange={(value) => setLogoHeight(value[0])}
                  min={20}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Preview */}
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <Label className="text-xs text-muted-foreground mb-2 block">Pré-visualização</Label>
                <div className="flex items-center justify-center h-20 bg-background rounded border">
                  {settings?.logo_url_light ? (
                    <img 
                      src={settings.logo_url_light} 
                      alt="Preview" 
                      style={{ maxWidth: logoWidth, maxHeight: logoHeight }}
                      className="object-contain"
                    />
                  ) : (
                    <span className="text-muted-foreground text-sm">Nenhuma logo</span>
                  )}
                </div>
              </div>
            </div>

            <Button onClick={handleSaveLogoSize} disabled={savingSize}>
              {savingSize && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Salvar Tamanho
            </Button>
          </CardContent>
        </Card>

        {/* WhatsApp Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Contato WhatsApp</CardTitle>
            <CardDescription>
              Número de WhatsApp para novos interessados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp">Número do WhatsApp</Label>
              <Input
                id="whatsapp"
                placeholder="5511999999999"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Formato: código do país + DDD + número (apenas números)
              </p>
            </div>
            <Button onClick={handleSaveWhatsapp} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}