import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PhoneInput } from '@/components/ui/phone-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Camera, Loader2, Globe, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Language, languageNames } from '@/i18n';

export function ProfileTab() {
  const { profile, refreshProfile } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Password change state
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    cpf: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
  });

  // Load profile data
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        whatsapp: profile.whatsapp || '',
        cpf: profile.cpf || '',
        cep: profile.cep || '',
        endereco: profile.endereco || '',
        numero: profile.numero || '',
        complemento: profile.complemento || '',
        bairro: profile.bairro || '',
        cidade: profile.cidade || '',
        uf: profile.uf || '',
      });
    }
  }, [profile]);

  const handleUploadAvatar = async (file: File) => {
    if (!profile?.id) return;
    
    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast.success(t.settings.profile.saveSuccess);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error(t.settings.profile.saveError);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile?.id) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: formData.name.trim() || profile.name,
          phone: formData.phone || null,
          whatsapp: formData.whatsapp || null,
          cpf: formData.cpf || null,
          cep: formData.cep || null,
          endereco: formData.endereco || null,
          numero: formData.numero || null,
          complemento: formData.complemento || null,
          bairro: formData.bairro || null,
          cidade: formData.cidade || null,
          uf: formData.uf || null,
        })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      toast.success(t.settings.profile.saveSuccess);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(t.settings.profile.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast.success('Senha alterada com sucesso!');
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Erro ao alterar senha');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLanguageChange = async (lang: string) => {
    await setLanguage(lang as Language);
    toast.success(t.settings.profile.saveSuccess);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.profile.title}</CardTitle>
          <CardDescription>{t.settings.profile.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {profile?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <input
                type="file"
                id="avatar-upload"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadAvatar(file);
                }}
              />
              <Button
                size="icon"
                variant="secondary"
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                onClick={() => document.getElementById('avatar-upload')?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div>
              <h3 className="text-lg font-medium">{profile?.name}</h3>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <Badge variant="secondary" className="mt-2">
                {profile?.role === 'admin' ? t.settings.users.admin : t.settings.users.user}
              </Badge>
            </div>
          </div>

          {/* Language Selector */}
          <div className="space-y-2 pt-4 border-t">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {t.settings.profile.language}
            </Label>
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">{languageNames['pt-BR']}</SelectItem>
                <SelectItem value="en">{languageNames['en']}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t.settings.profile.languageDescription}
            </p>
          </div>

          {/* Personal Info */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium">{t.settings.profile.personalInfo}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.common.name}</Label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t.common.name}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.common.email}</Label>
                <Input value={profile?.email || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>{t.settings.profile.cpf}</Label>
                <Input 
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="font-medium">{t.settings.profile.contactInfo}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.common.phone}</Label>
                <PhoneInput 
                  value={formData.phone}
                  onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.settings.profile.whatsapp}</Label>
                <PhoneInput 
                  value={formData.whatsapp}
                  onChange={(value) => setFormData(prev => ({ ...prev, whatsapp: value }))}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Address */}
          <div className="space-y-4">
            <h4 className="font-medium">{t.settings.profile.addressInfo}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t.settings.profile.cep}</Label>
                <Input 
                  placeholder="00000-000"
                  value={formData.cep}
                  onChange={(e) => setFormData(prev => ({ ...prev, cep: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t.settings.profile.street}</Label>
                <Input 
                  placeholder={t.settings.profile.street}
                  value={formData.endereco}
                  onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.settings.profile.number}</Label>
                <Input 
                  placeholder={t.settings.profile.number}
                  value={formData.numero}
                  onChange={(e) => setFormData(prev => ({ ...prev, numero: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.settings.profile.complement}</Label>
                <Input 
                  placeholder={t.settings.profile.complement}
                  value={formData.complemento}
                  onChange={(e) => setFormData(prev => ({ ...prev, complemento: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.settings.profile.neighborhood}</Label>
                <Input 
                  placeholder={t.settings.profile.neighborhood}
                  value={formData.bairro}
                  onChange={(e) => setFormData(prev => ({ ...prev, bairro: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t.settings.profile.city}</Label>
                <Input 
                  placeholder={t.settings.profile.city}
                  value={formData.cidade}
                  onChange={(e) => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.settings.profile.state}</Label>
                <Input 
                  placeholder={t.settings.profile.state}
                  maxLength={2}
                  value={formData.uf}
                  onChange={(e) => setFormData(prev => ({ ...prev, uf: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t.common.save}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password Change Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Alterar Senha
          </CardTitle>
          <CardDescription>
            Atualize sua senha de acesso ao sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <div className="relative">
                <Input 
                  type={showNewPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirmar nova senha</Label>
              <div className="relative">
                <Input 
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            A senha deve ter pelo menos 6 caracteres
          </p>
          <div className="flex justify-end">
            <Button 
              onClick={handleChangePassword} 
              disabled={changingPassword || !passwordData.newPassword || !passwordData.confirmPassword}
            >
              {changingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Alterar Senha
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
