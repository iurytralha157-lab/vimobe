import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PhoneInput } from '@/components/ui/phone-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Building2, Plus, Check, Facebook, AlertCircle, Globe, Copy, Loader2, Code, Camera, Settings2, ExternalLink, MessageCircle, Smartphone, Trash2, Shield, LucideIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganizationUsers, useUpdateUser } from '@/hooks/use-users';
import { useWordPressIntegration, useCreateWordPressIntegration, useToggleWordPressIntegration } from '@/hooks/use-wordpress-integration';
import { useMetaIntegrations } from '@/hooks/use-meta-integration';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { ProfileTab } from '@/components/settings/ProfileTab';
import { OrganizationTab } from '@/components/settings/OrganizationTab';
import { WebhooksTab } from '@/components/settings/WebhooksTab';
import { WhatsAppTab } from '@/components/settings/WhatsAppTab';
import { RolesTab } from '@/components/settings/RolesTab';
import { Webhook } from 'lucide-react';
import { useOrganizationModules } from '@/hooks/use-organization-modules';
import { useOrganizationRoles, useUserOrganizationRoles, useAssignUserRole } from '@/hooks/use-organization-roles';
import { useIsMobile } from '@/hooks/use-mobile';

interface TabItem {
  value: string;
  label: string;
  icon: LucideIcon;
}

export default function Settings() {
  const {
    profile,
    organization,
    refreshProfile,
    isSuperAdmin
  } = useAuth();
  const {
    data: users = [],
    isLoading: usersLoading
  } = useOrganizationUsers();
  const updateUser = useUpdateUser();
  const {
    data: wpIntegration,
    isLoading: wpLoading
  } = useWordPressIntegration();
  const createWpIntegration = useCreateWordPressIntegration();
  const toggleWpIntegration = useToggleWordPressIntegration();
  const {
    data: metaIntegrations = [],
    isLoading: metaLoading
  } = useMetaIntegrations();
  const queryClient = useQueryClient();
  const {
    hasModule
  } = useOrganizationModules();

  // Funções/roles customizadas
  const {
    data: organizationRoles = []
  } = useOrganizationRoles();
  const {
    data: userOrgRoles = []
  } = useUserOrganizationRoles();
  const assignUserRole = useAssignUserRole();

  // Calcular métricas Meta
  const activeMetaPages = metaIntegrations.filter(i => i.is_connected);
  const totalMetaLeadsReceived = 0; // leads_received column doesn't exist in DB
  const isMetaConnected = metaIntegrations.length > 0;
  const hasWhatsAppModule = hasModule('whatsapp');
  const hasWebhooksModule = hasModule('webhooks');
  const hasWordpressModule = hasModule('wordpress');
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState(organization?.name || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Form state for new user
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserEndereco, setNewUserEndereco] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [creatingUser, setCreatingUser] = useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Helper para obter a função customizada de um usuário
  const getUserCustomRole = (userId: string) => {
    const assignment = userOrgRoles.find(uor => uor.user_id === userId);
    if (!assignment) return null;
    return organizationRoles.find(r => r.id === assignment.organization_role_id);
  };
  const handleAssignRole = async (userId: string, roleId: string | null) => {
    await assignUserRole.mutateAsync({
      userId,
      roleId
    });
  };
  const handleToggleUserActive = async (userId: string, currentValue: boolean) => {
    await updateUser.mutateAsync({
      id: userId,
      is_active: !currentValue
    });
  };
  const handleUpdateUserRole = async (userId: string, role: 'admin' | 'user') => {
    await updateUser.mutateAsync({
      id: userId,
      role
    });
  };
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeletingUser(true);
    try {
      // Use Edge Function to properly delete user from both auth and public tables
      const {
        data,
        error
      } = await supabase.functions.invoke('delete-user', {
        body: {
          userId: userToDelete.id
        }
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao excluir usuário');
      toast.success('Usuário excluído com sucesso!');
      queryClient.invalidateQueries({
        queryKey: ['organization-users']
      });
      setDeleteUserDialogOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
      toast.error('Erro ao excluir usuário: ' + error.message);
    } finally {
      setDeletingUser(false);
    }
  };
  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim()) {
      toast.error('Preencha nome e email');
      return;
    }
    setCreatingUser(true);
    try {
      const {
        data: {
          session
        },
        error: sessionError
      } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        toast.error('Sua sessão expirou. Por favor, faça login novamente.');
        window.location.href = '/auth';
        return;
      }
      const {
        data: result,
        error
      } = await supabase.functions.invoke('create-user', {
        body: {
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          phone: newUserPhone.trim() || undefined,
          endereco: newUserEndereco.trim() || undefined,
          role: newUserRole
        }
      });
      if (error) {
        throw new Error(error.message || 'Erro ao criar usuário');
      }
      toast.success(`Usuário criado! Senha padrão: ${result.defaultPassword}`);
      queryClient.invalidateQueries({
        queryKey: ['organization-users']
      });
      setUserDialogOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setNewUserEndereco('');
      setNewUserRole('user');
    } catch (error: any) {
      const errorMessage = error.message || 'Erro ao criar usuário';
      if (errorMessage.includes('SESSION_EXPIRED') || errorMessage.includes('Unauthorized')) {
        toast.error('Sua sessão expirou. Por favor, faça login novamente.');
        window.location.href = '/auth';
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setCreatingUser(false);
    }
  };
  const handleCreateWpIntegration = async () => {
    await createWpIntegration.mutateAsync();
  };
  const handleToggleWpIntegration = async () => {
    if (!wpIntegration) return;
    await toggleWpIntegration.mutateAsync({
      id: wpIntegration.id,
      is_active: !wpIntegration.is_active
    });
  };
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };
  const handleSaveOrgName = async () => {
    if (!organization || !orgName.trim()) return;
    setSaving(true);
    try {
      const {
        error
      } = await supabase.from('organizations').update({
        name: orgName.trim()
      }).eq('id', organization.id);
      if (error) throw error;
      await refreshProfile();
      toast.success('Nome da empresa atualizado!');
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };
  const handleUploadAvatar = async (file: File) => {
    if (!profile) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${profile.id}.${ext}`;
      const {
        error: uploadError
      } = await supabase.storage.from('logos').upload(path, file, {
        upsert: true
      });
      if (uploadError) throw uploadError;
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('logos').getPublicUrl(path);
      const {
        error: updateError
      } = await supabase.from('users').update({
        avatar_url: publicUrl
      }).eq('id', profile.id);
      if (updateError) throw updateError;
      await refreshProfile();
      toast.success('Foto atualizada!');
    } catch (error: any) {
      toast.error('Erro ao fazer upload: ' + error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };
  const {
    t
  } = useLanguage();
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wordpress-webhook`;
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('profile');

  // Build tabs list dynamically based on permissions and modules
  const settingsTabs: TabItem[] = useMemo(() => {
    const tabs: TabItem[] = [
      { value: 'profile', label: t.settings.myProfile, icon: Camera },
      { value: 'organization', label: t.settings.company, icon: Building2 },
      { value: 'users', label: t.settings.usersTab, icon: Users },
    ];

    if (profile?.role === 'admin' || isSuperAdmin) {
      tabs.push({ value: 'roles', label: 'Funções', icon: Shield });
    }

    if (hasWebhooksModule) {
      tabs.push({ value: 'webhooks', label: 'Webhooks', icon: Webhook });
    }

    tabs.push({ value: 'meta', label: t.settings.meta, icon: Facebook });

    if (hasWordpressModule) {
      tabs.push({ value: 'wordpress', label: t.settings.wordpress, icon: Globe });
    }

    if (hasWhatsAppModule) {
      tabs.push({ value: 'whatsapp', label: 'WhatsApp', icon: Smartphone });
    }

    return tabs;
  }, [t, profile?.role, isSuperAdmin, hasWebhooksModule, hasWordpressModule, hasWhatsAppModule]);

  const currentTab = settingsTabs.find(tab => tab.value === activeTab);
  const CurrentIcon = currentTab?.icon;

  return <AppLayout title={t.settings.title}>
      <div className="animate-in">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {isMobile ? (
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {CurrentIcon && <CurrentIcon className="h-4 w-4" />}
                    <span>{currentTab?.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {settingsTabs.map(tab => (
                  <SelectItem key={tab.value} value={tab.value}>
                    <div className="flex items-center gap-2">
                      <tab.icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <TabsList className="flex-wrap h-auto gap-1">
              {settingsTabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          )}

          {/* Profile Tab */}
          <TabsContent value="profile">
            <ProfileTab />
          </TabsContent>

          {/* Organization Tab */}
          <TabsContent value="organization">
            <OrganizationTab />
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks">
            <WebhooksTab />
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles">
            <RolesTab />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t.settings.users.title}</CardTitle>
                  <CardDescription>{t.settings.users.description}</CardDescription>
                </div>
                {profile?.role === 'admin' && <Dialog open={userDialogOpen} onOpenChange={open => {
                setUserDialogOpen(open);
                if (!open) {
                  setNewUserName('');
                  setNewUserEmail('');
                  setNewUserRole('user');
                }
              }}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        {t.settings.users.newUser}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t.settings.users.createUser}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>{t.common.name}</Label>
                            <Input placeholder={t.common.name} value={newUserName} onChange={e => setNewUserName(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>{t.common.email}</Label>
                            <Input type="email" placeholder="email@company.com" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>{t.common.phone}</Label>
                            <PhoneInput value={newUserPhone} onChange={setNewUserPhone} />
                          </div>
                          <div className="space-y-2">
                            <Label>{t.settings.users.role}</Label>
                            <Select value={newUserRole} onValueChange={v => setNewUserRole(v as 'admin' | 'user')}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">{t.settings.users.admin}</SelectItem>
                                <SelectItem value="user">{t.settings.users.user}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>{t.common.address}</Label>
                          <Input placeholder="Endereço completo" value={newUserEndereco} onChange={e => setNewUserEndereco(e.target.value)} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t.settings.users.tempPassword}: <strong>trocar@2026</strong>
                        </p>
                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="outline" onClick={() => setUserDialogOpen(false)} disabled={creatingUser}>
                            {t.common.cancel}
                          </Button>
                          <Button onClick={handleCreateUser} disabled={creatingUser || !newUserName.trim() || !newUserEmail.trim()}>
                            {creatingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {t.settings.users.createUser}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>}
              </CardHeader>
              <CardContent>
                {usersLoading ? <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div> : <div className="space-y-4">
                    {users.filter(user => user.role !== 'super_admin').map(user => <div key={user.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{user.name}</p>
                              {!user.is_active && <Badge variant="secondary" className="text-xs">{t.common.inactive}</Badge>}
                              {/* Mostrar função customizada */}
                              {user.role !== 'admin' && getUserCustomRole(user.id) && <Badge variant="outline" className="text-xs" style={{
                          borderColor: getUserCustomRole(user.id)?.color,
                          color: getUserCustomRole(user.id)?.color
                        }}>
                                  {getUserCustomRole(user.id)?.name}
                                </Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {profile?.role === 'admin' ? <>
                              {/* Tipo de usuário (admin/user) */}
                              <Select value={user.role} onValueChange={v => handleUpdateUserRole(user.id, v as 'admin' | 'user')} disabled={user.id === profile?.id}>
                                <SelectTrigger className="w-28">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">{t.settings.users.admin}</SelectItem>
                                  <SelectItem value="user">{t.settings.users.user}</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              {/* Função customizada (apenas para não-admins) */}
                              {user.role !== 'admin' && organizationRoles.length > 0 && <Select value={getUserCustomRole(user.id)?.id || 'none'} onValueChange={v => handleAssignRole(user.id, v === 'none' ? null : v)} disabled={user.id === profile?.id}>
                                  <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Função..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Sem função</SelectItem>
                                    {organizationRoles.map(role => <SelectItem key={role.id} value={role.id}>
                                        <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full" style={{
                                backgroundColor: role.color
                              }} />
                                          {role.name}
                                        </div>
                                      </SelectItem>)}
                                  </SelectContent>
                                </Select>}
                              
                              <Switch checked={user.is_active || false} onCheckedChange={() => handleToggleUserActive(user.id, user.is_active || false)} disabled={user.id === profile?.id} />
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => {
                        setUserToDelete({
                          id: user.id,
                          name: user.name
                        });
                        setDeleteUserDialogOpen(true);
                      }} disabled={user.id === profile?.id}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </> : <div className="flex items-center gap-2">
                              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                {user.role === 'admin' ? t.settings.users.admin : t.settings.users.user}
                              </Badge>
                              {user.role !== 'admin' && getUserCustomRole(user.id) && <Badge variant="outline" style={{
                        borderColor: getUserCustomRole(user.id)?.color,
                        color: getUserCustomRole(user.id)?.color
                      }}>
                                  {getUserCustomRole(user.id)?.name}
                                </Badge>}
                            </div>}
                        </div>
                      </div>)}
                  </div>}
              </CardContent>
            </Card>

            {/* Delete User Confirmation Dialog */}
            <AlertDialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir o usuário <strong>{userToDelete?.name}</strong>? 
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deletingUser}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteUser} disabled={deletingUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {deletingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          {/* Meta Integration Tab */}
          <TabsContent value="meta">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Facebook className="h-5 w-5" />
                  {t.settings.integrations.meta.title}
                </CardTitle>
                <CardDescription>
                  {t.settings.integrations.meta.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {metaLoading ? <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div> : <>
                    {/* Status da Conexão */}
                    <div className={`p-4 rounded-lg border ${isMetaConnected ? 'border-success bg-success/5' : 'border-warning bg-warning/5'}`}>
                      <div className="flex items-center gap-3">
                        {isMetaConnected ? <Check className="h-5 w-5 text-success" /> : <AlertCircle className="h-5 w-5 text-warning" />}
                        <div>
                          <p className="font-medium">
                            {isMetaConnected ? t.settings.integrations.meta.connected : t.settings.integrations.meta.notConnected}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {isMetaConnected ? `${activeMetaPages.length} ${t.settings.integrations.meta.activePage} ${metaIntegrations.length} ${t.settings.integrations.meta.pagesConnected}` : t.settings.integrations.meta.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Resumo quando conectado */}
                    {isMetaConnected && <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border bg-muted/50">
                          <p className="text-2xl font-bold">{metaIntegrations.length}</p>
                          <p className="text-sm text-muted-foreground">{t.settings.integrations.meta.pagesConnected}</p>
                        </div>
                        <div className="p-4 rounded-lg border bg-muted/50">
                          <p className="text-2xl font-bold">{totalMetaLeadsReceived}</p>
                          <p className="text-sm text-muted-foreground">{t.settings.integrations.meta.leadsReceived}</p>
                        </div>
                      </div>}

                    {/* Botão para página de configuração */}
                    <Button asChild className="w-full gap-2">
                      <Link to="/settings/integrations/meta">
                        <Settings2 className="h-4 w-4" />
                        {t.settings.integrations.meta.manageMeta}
                        <ExternalLink className="h-4 w-4 ml-auto" />
                      </Link>
                    </Button>
                  </>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* WordPress Integration Tab */}
          <TabsContent value="wordpress">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {t.settings.integrations.wordpress.title}
                </CardTitle>
                <CardDescription>
                  {t.settings.integrations.wordpress.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {wpLoading ? <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div> : wpIntegration ? <>
                    {/* Connection Status */}
                    <div className={`p-4 rounded-lg border ${wpIntegration.is_active ? 'border-success bg-success/5' : 'border-warning bg-warning/5'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {wpIntegration.is_active ? <Check className="h-5 w-5 text-success" /> : <AlertCircle className="h-5 w-5 text-warning" />}
                          <div>
                            <p className="font-medium">
                              {wpIntegration.is_active ? t.settings.integrations.wordpress.enabled : t.settings.integrations.wordpress.disabled}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {wpIntegration.leads_received || 0} {t.settings.integrations.meta.leadsReceived}
                            </p>
                          </div>
                        </div>
                        <Switch checked={wpIntegration.is_active} onCheckedChange={handleToggleWpIntegration} />
                      </div>
                    </div>

                    {/* Webhook URL */}
                    <div className="space-y-2">
                      <Label>{t.settings.integrations.wordpress.webhookUrl}</Label>
                      <div className="flex gap-2">
                        <Input value={webhookUrl} readOnly className="font-mono text-sm" />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* API Token */}
                    <div className="space-y-2">
                      <Label>{t.settings.integrations.wordpress.apiKey}</Label>
                      <div className="flex gap-2">
                        <Input value={wpIntegration.api_token} readOnly className="font-mono text-sm" type="password" />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(wpIntegration.api_token)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </> : <>
                    <div className="p-4 rounded-lg border border-muted">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{t.settings.integrations.wordpress.disabled}</p>
                          <p className="text-sm text-muted-foreground">
                            {t.settings.integrations.wordpress.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button onClick={handleCreateWpIntegration} disabled={createWpIntegration.isPending}>
                      {createWpIntegration.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {t.common.add}
                    </Button>
                  </>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* WhatsApp Tab */}
          {hasWhatsAppModule && <TabsContent value="whatsapp">
              <WhatsAppTab />
            </TabsContent>}
        </Tabs>
      </div>
    </AppLayout>;
}