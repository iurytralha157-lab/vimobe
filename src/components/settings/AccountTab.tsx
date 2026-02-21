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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Camera, Loader2, Globe, Eye, EyeOff, KeyRound, Building2, User, Percent, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Language, languageNames } from '@/i18n';

interface ProfileFormData {
  name: string;
  phone: string;
  whatsapp: string;
  cpf: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

interface OrganizationFormData {
  name: string;
  cnpj: string;
  inscricao_estadual: string;
  razao_social: string;
  nome_fantasia: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  telefone: string;
  whatsapp: string;
  email: string;
  website: string;
  default_commission_percentage: string;
}

export function AccountTab() {
  const { profile, organization, refreshProfile } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  
  // Profile states
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Organization states
  const [savingOrg, setSavingOrg] = useState(false);
  const isAdmin = profile?.role === 'admin';

  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    name: '', phone: '', whatsapp: '', cpf: '',
    cep: '', endereco: '', numero: '', complemento: '',
    bairro: '', cidade: '', uf: '',
  });

  const [orgForm, setOrgForm] = useState<OrganizationFormData>({
    name: '', cnpj: '', inscricao_estadual: '', razao_social: '',
    nome_fantasia: '', cep: '', endereco: '', numero: '',
    complemento: '', bairro: '', cidade: '', uf: '',
    telefone: '', whatsapp: '', email: '', website: '',
    default_commission_percentage: '5',
  });

  // Load profile data
  useEffect(() => {
    if (profile) {
      setProfileForm({
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

  // Load organization data
  useEffect(() => {
    if (organization) {
      setOrgForm({
        name: organization.name || '',
        cnpj: (organization as any).cnpj || '',
        inscricao_estadual: (organization as any).inscricao_estadual || '',
        razao_social: (organization as any).razao_social || '',
        nome_fantasia: (organization as any).nome_fantasia || '',
        cep: (organization as any).cep || '',
        endereco: (organization as any).endereco || '',
        numero: (organization as any).numero || '',
        complemento: (organization as any).complemento || '',
        bairro: (organization as any).bairro || '',
        cidade: (organization as any).cidade || '',
        uf: (organization as any).uf || '',
        telefone: (organization as any).telefone || '',
        whatsapp: (organization as any).whatsapp || '',
        email: (organization as any).email || '',
        website: (organization as any).website || '',
        default_commission_percentage: String((organization as any).default_commission_percentage || 5),
      });
    }
  }, [organization]);

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
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: profileForm.name.trim() || profile.name,
          phone: profileForm.phone || null,
          whatsapp: profileForm.whatsapp || null,
          cpf: profileForm.cpf || null,
          cep: profileForm.cep || null,
          endereco: profileForm.endereco || null,
          numero: profileForm.numero || null,
          complemento: profileForm.complemento || null,
          bairro: profileForm.bairro || null,
          cidade: profileForm.cidade || null,
          uf: profileForm.uf || null,
        })
        .eq('id', profile.id);

      if (error) throw error;
      await refreshProfile();
      toast.success(t.settings.profile.saveSuccess);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(t.settings.profile.saveError);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveOrganization = async () => {
    if (!organization?.id || !isAdmin) return;
    setSavingOrg(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: orgForm.name,
          cnpj: orgForm.cnpj || null,
          inscricao_estadual: orgForm.inscricao_estadual || null,
          razao_social: orgForm.razao_social || null,
          nome_fantasia: orgForm.nome_fantasia || null,
          cep: orgForm.cep || null,
          endereco: orgForm.endereco || null,
          numero: orgForm.numero || null,
          complemento: orgForm.complemento || null,
          bairro: orgForm.bairro || null,
          cidade: orgForm.cidade || null,
          uf: orgForm.uf || null,
          telefone: orgForm.telefone || null,
          whatsapp: orgForm.whatsapp || null,
          email: orgForm.email || null,
          website: orgForm.website || null,
          default_commission_percentage: parseFloat(orgForm.default_commission_percentage) || 5,
        })
        .eq('id', organization.id);

      if (error) throw error;
      await refreshProfile();
      toast.success(t.settings.organization.saveSuccess);
    } catch (error) {
      console.error('Error saving organization:', error);
      toast.error(t.settings.organization.saveError);
    } finally {
      setSavingOrg(false);
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
      {/* Two columns: Profile (left) + Organization (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Profile Card */}
        <Card>
          <CardHeader className="px-4 md:px-5 pt-5 pb-2">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t.settings.profile.title}
            </CardTitle>
            <CardDescription>{t.settings.profile.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-4 md:px-5 pb-5">
            {/* Avatar Upload */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
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
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full"
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Camera className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <div>
                <h3 className="font-medium">{profile?.name}</h3>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
                <Badge variant="secondary" className="mt-1">
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
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">{languageNames['pt-BR']}</SelectItem>
                  <SelectItem value="en">{languageNames['en']}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Personal Info */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm">{t.settings.profile.personalInfo}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.common.name}</Label>
                  <Input 
                    value={profileForm.name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.profile.cpf}</Label>
                  <Input 
                    placeholder="000.000.000-00"
                    value={profileForm.cpf}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, cpf: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm">{t.settings.profile.contactInfo}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.common.phone}</Label>
                  <PhoneInput 
                    value={profileForm.phone}
                    onChange={(value) => setProfileForm(prev => ({ ...prev, phone: value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.profile.whatsapp}</Label>
                  <PhoneInput 
                    value={profileForm.whatsapp}
                    onChange={(value) => setProfileForm(prev => ({ ...prev, whatsapp: value }))}
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm">{t.settings.profile.addressInfo}</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.profile.cep}</Label>
                  <Input 
                    placeholder="00000-000"
                    value={profileForm.cep}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, cep: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">{t.settings.profile.street}</Label>
                  <Input 
                    value={profileForm.endereco}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, endereco: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.profile.number}</Label>
                  <Input 
                    value={profileForm.numero}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, numero: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.profile.complement}</Label>
                  <Input 
                    value={profileForm.complemento}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, complemento: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.profile.neighborhood}</Label>
                  <Input 
                    value={profileForm.bairro}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, bairro: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">{t.settings.profile.city}</Label>
                  <Input 
                    value={profileForm.cidade}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, cidade: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.profile.state}</Label>
                  <Input 
                    maxLength={2}
                    value={profileForm.uf}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, uf: e.target.value.toUpperCase() }))}
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t.common.save}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT: Organization Card */}
        <Card>
          <CardHeader className="px-4 md:px-5 pt-5 pb-2">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t.settings.organization.title}
            </CardTitle>
            <CardDescription>{t.settings.organization.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-4 md:px-5 pb-5">
            {/* Company Name */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t.settings.organization.companyName}</Label>
              <Input
                value={orgForm.name}
                onChange={(e) => setOrgForm(prev => ({ ...prev, name: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>

            {/* Fiscal Data */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm">{t.settings.organization.fiscalData}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.organization.cnpj}</Label>
                  <Input 
                    placeholder="00.000.000/0000-00" 
                    value={orgForm.cnpj}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, cnpj: e.target.value }))}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.organization.stateRegistration}</Label>
                  <Input 
                    value={orgForm.inscricao_estadual}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, inscricao_estadual: e.target.value }))}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.organization.legalName}</Label>
                  <Input 
                    value={orgForm.razao_social}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, razao_social: e.target.value }))}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.organization.tradeName}</Label>
                  <Input 
                    value={orgForm.nome_fantasia}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, nome_fantasia: e.target.value }))}
                    disabled={!isAdmin}
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm">{t.settings.organization.address}</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.profile.cep}</Label>
                  <Input 
                    placeholder="00000-000" 
                    value={orgForm.cep}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, cep: e.target.value }))}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">{t.settings.profile.street}</Label>
                  <Input 
                    value={orgForm.endereco}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, endereco: e.target.value }))}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.profile.number}</Label>
                  <Input 
                    value={orgForm.numero}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, numero: e.target.value }))}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.profile.complement}</Label>
                  <Input 
                    value={orgForm.complemento}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, complemento: e.target.value }))}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.profile.neighborhood}</Label>
                  <Input 
                    value={orgForm.bairro}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, bairro: e.target.value }))}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">{t.settings.profile.city}</Label>
                  <Input 
                    value={orgForm.cidade}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, cidade: e.target.value }))}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.profile.state}</Label>
                  <Input 
                    maxLength={2}
                    value={orgForm.uf}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, uf: e.target.value.toUpperCase() }))}
                    disabled={!isAdmin}
                  />
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm">{t.settings.organization.contact}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.common.phone}</Label>
                  <Input 
                    placeholder="(00) 0000-0000" 
                    value={orgForm.telefone}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, telefone: e.target.value }))}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.profile.whatsapp}</Label>
                  <Input 
                    placeholder="(00) 00000-0000" 
                    value={orgForm.whatsapp}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.common.email}</Label>
                  <Input 
                    placeholder="contato@empresa.com" 
                    value={orgForm.email}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.settings.organization.website}</Label>
                  <Input 
                    placeholder="https://www.empresa.com" 
                    value={orgForm.website}
                    onChange={(e) => setOrgForm(prev => ({ ...prev, website: e.target.value }))}
                    disabled={!isAdmin}
                  />
                </div>
              </div>
            </div>

            {/* Financial Settings */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm flex items-center gap-2">
                Configurações Financeiras
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Este percentual será usado como padrão para cálculo de comissões.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </h4>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2 text-xs">
                  <Percent className="h-3 w-3" />
                  Comissão Padrão (%)
                </Label>
                <Input 
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="5"
                  value={orgForm.default_commission_percentage}
                  onChange={(e) => setOrgForm(prev => ({ ...prev, default_commission_percentage: e.target.value }))}
                  disabled={!isAdmin}
                  className="w-32"
                />
              </div>
            </div>

            {/* Save Button */}
            {isAdmin && (
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSaveOrganization} disabled={savingOrg || !orgForm.name.trim()}>
                  {savingOrg && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t.common.save}
                </Button>
              </div>
            )}

            {!isAdmin && (
              <p className="text-xs text-muted-foreground pt-4 border-t">
                Apenas administradores podem editar os dados da empresa.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Password Change Card - Full Width */}
      <Card>
        <CardHeader className="px-4 md:px-5 pt-5 pb-2">
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Alterar Senha
          </CardTitle>
          <CardDescription>
            Atualize sua senha de acesso ao sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-4 md:px-5 pb-5">
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
