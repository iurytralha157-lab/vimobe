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
import { useSystemSettings } from '@/hooks/use-system-settings';

export default function AdminSettings() {
  const { data: settingsData, isLoading: loading, refetch } = useSystemSettings();
  const [saving, setSaving] = useState(false);
  const [savingSize, setSavingSize] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [uploadingLight, setUploadingLight] = useState(false);
  const [uploadingDark, setUploadingDark] = useState(false);
  const [logoWidth, setLogoWidth] = useState(140);
  const [logoHeight, setLogoHeight] = useState(40);

  useEffect(() => {
    if (settingsData) {
      setWhatsapp('');
      setLogoWidth(settingsData.logo_width || 140);
      setLogoHeight(settingsData.logo_height || 40);
    }
  }, [settingsData]);

  const updateSetting = async (key: string, value: string | number) => {
    // Check if setting exists
    const { data: existing } = await supabase
      .from('system_settings')
      .select('id')
      .eq('key', key)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: value as any })
        .eq('key', key);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('system_settings')
        .insert({ key, value: value as any });
      if (error) throw error;
    }
  };

  const handleUploadLogo = async (file: File, type: 'light' | 'dark') => {
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

      const settingKey = type === 'light' ? 'logo_url_light' : 'logo_url_dark';
      await updateSetting(settingKey, publicUrl);

      toast.success(`Logo ${type === 'light' ? 'clara' : 'escura'} atualizada!`);
      refetch();
    } catch (error: any) {
      toast.error('Erro ao fazer upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveWhatsapp = async () => {
    setSaving(true);
    try {
      await updateSetting('default_whatsapp', whatsapp);
      toast.success('WhatsApp atualizado!');
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLogoSize = async () => {
    setSavingSize(true);
    try {
      await updateSetting('logo_width', logoWidth);
      await updateSetting('logo_height', logoHeight);
      toast.success('Tamanho da logo atualizado!');
      refetch();
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
                  {settingsData?.logo_url_light ? (
                    <img 
                      src={settingsData.logo_url_light} 
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
                  {settingsData?.logo_url_dark ? (
                    <img 
                      src={settingsData.logo_url_dark} 
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
                  {settingsData?.logo_url_light ? (
                    <img 
                      src={settingsData.logo_url_light} 
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