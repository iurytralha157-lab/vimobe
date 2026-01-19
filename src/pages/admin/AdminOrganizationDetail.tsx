import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  ArrowLeft,
  Eye,
  Save,
  Check,
  X,
  Mail,
  Copy,
  Trash2,
  UserPlus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useOrganizations, useUpdateOrganization, useToggleModule, useOrganizationUsers } from '@/hooks/use-super-admin';
import { useAdminInvitations, useCreateInvitation, useDeleteInvitation, getInviteLink, Invitation } from '@/hooks/use-admin-invitations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const ALL_MODULES = [
  { name: 'crm', label: 'CRM (Pipelines, Contatos, Cadências)' },
  { name: 'financial', label: 'Financeiro (Dashboard, Contas, Contratos, Comissões)' },
  { name: 'properties', label: 'Imóveis' },
  { name: 'whatsapp', label: 'WhatsApp' },
  { name: 'agenda', label: 'Agenda' },
  { name: 'cadences', label: 'Cadências' },
  { name: 'tags', label: 'Tags' },
  { name: 'round_robin', label: 'Distribuição (Round Robin)' },
  { name: 'reports', label: 'Relatórios' },
];

export default function AdminOrganizationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: organizations } = useOrganizations();
  const updateOrganization = useUpdateOrganization();
  const toggleModule = useToggleModule();
  const { startImpersonate } = useAuth();
  const { data: invitations = [], isLoading: loadingInvitations } = useAdminInvitations(id);
  const createInvitation = useCreateInvitation();
  const deleteInvitation = useDeleteInvitation();
  const { data: orgUsers } = useOrganizationUsers(id || '');

  const org = organizations?.find(o => o.id === id);

  const [formData, setFormData] = useState({
    name: '',
    subscription_status: 'trial',
    max_users: 10,
    admin_notes: '',
  });

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [newInvite, setNewInvite] = useState({
    email: '',
    role: 'user' as 'admin' | 'user',
  });

  // Fetch organization modules
  const { data: modules, refetch: refetchModules } = useQuery({
    queryKey: ['org-modules', id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await supabase
        .from('organization_modules')
        .select('*')
        .eq('organization_id', id);
      return data || [];
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (org) {
      setFormData({
        name: org.name,
        subscription_status: org.subscription_status,
        max_users: org.max_users,
        admin_notes: org.admin_notes || '',
      });
    }
  }, [org]);

  if (!org) {
    return (
      <AdminLayout title="Organização">
        <div className="text-center py-8 text-muted-foreground">
          Organização não encontrada
        </div>
      </AdminLayout>
    );
  }

  const handleSave = () => {
    updateOrganization.mutate({
      id: org.id,
      ...formData,
    } as any);
  };

  const handleImpersonate = () => {
    startImpersonate(org.id, org.name);
    navigate('/dashboard');
  };

  const isModuleEnabled = (moduleName: string) => {
    const module = modules?.find(m => m.module_name === moduleName);
    return module ? module.is_enabled : true; // Default to enabled
  };

  const handleModuleToggle = async (moduleName: string, enabled: boolean) => {
    await toggleModule.mutateAsync({
      organizationId: org.id,
      moduleName,
      isEnabled: enabled,
    });
    refetchModules();
  };

  const handleCreateInvite = async () => {
    if (!id || !newInvite.email) return;
    
    await createInvitation.mutateAsync({
      email: newInvite.email,
      role: newInvite.role,
      organizationId: id,
    });
    
    setInviteDialogOpen(false);
    setNewInvite({ email: '', role: 'user' });
  };

  const copyInviteLink = (token: string) => {
    navigator.clipboard.writeText(getInviteLink(token));
    toast.success('Link copiado para a área de transferência!');
  };

  return (
    <AdminLayout title={org.name}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/admin/organizations')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button variant="outline" onClick={handleImpersonate}>
            <Eye className="h-4 w-4 mr-2" />
            Entrar como Admin
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="modules">Módulos</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="invites">Convites</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Gerais</CardTitle>
                <CardDescription>
                  Dados básicos da organização
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Organização</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status da Assinatura</Label>
                    <Select
                      value={formData.subscription_status}
                      onValueChange={(value) => setFormData({ ...formData, subscription_status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="suspended">Suspenso</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxUsers">Máximo de Usuários</Label>
                    <Input
                      id="maxUsers"
                      type="number"
                      value={formData.max_users}
                      onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) || 10 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Criado em</Label>
                    <Input
                      value={new Date(org.created_at).toLocaleDateString('pt-BR')}
                      disabled
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas Internas</Label>
                  <Textarea
                    id="notes"
                    value={formData.admin_notes}
                    onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
                    placeholder="Anotações sobre este cliente..."
                    rows={4}
                  />
                </div>
                <Button onClick={handleSave} disabled={updateOrganization.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateOrganization.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modules Tab */}
          <TabsContent value="modules" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Controle de Módulos</CardTitle>
                <CardDescription>
                  Habilite ou desabilite módulos para esta organização
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ALL_MODULES.map((module) => (
                    <div key={module.name} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{module.label}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isModuleEnabled(module.name) ? (
                          <Badge className="bg-green-500">
                            <Check className="h-3 w-3 mr-1" />
                            Habilitado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            <X className="h-3 w-3 mr-1" />
                            Desabilitado
                          </Badge>
                        )}
                        <Switch
                          checked={isModuleEnabled(module.name)}
                          onCheckedChange={(checked) => handleModuleToggle(module.name, checked)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Usuários da Organização</CardTitle>
                <CardDescription>
                  {orgUsers?.length || 0} usuários cadastrados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {orgUsers?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum usuário cadastrado
                  </div>
                ) : (
                  <div className="space-y-2">
                    {orgUsers?.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                          </Badge>
                          {!user.is_active && (
                            <Badge variant="outline" className="text-gray-500">Inativo</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invites Tab */}
          <TabsContent value="invites" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Convites Pendentes</CardTitle>
                  <CardDescription>
                    {invitations?.length || 0} convites ativos
                  </CardDescription>
                </div>
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Novo Convite
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Convidar Usuário</DialogTitle>
                      <DialogDescription>
                        Envie um convite para um novo usuário se juntar a esta organização.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="inviteEmail">Email</Label>
                        <Input
                          id="inviteEmail"
                          type="email"
                          value={newInvite.email}
                          onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                          placeholder="usuario@email.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="inviteRole">Função</Label>
                        <Select
                          value={newInvite.role}
                          onValueChange={(value: 'admin' | 'user') => setNewInvite({ ...newInvite, role: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Usuário</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleCreateInvite}
                        disabled={!newInvite.email || createInvitation.isPending}
                      >
                        {createInvitation.isPending ? 'Enviando...' : 'Criar Convite'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loadingInvitations ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </div>
                ) : invitations?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum convite pendente
                  </div>
                ) : (
                  <div className="space-y-2">
                    {invitations?.map((invite) => (
                      <div key={invite.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Mail className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{invite.email}</p>
                            <p className="text-sm text-muted-foreground">
                              Expira em {formatDistanceToNow(new Date(invite.expires_at), { 
                                addSuffix: false,
                                locale: ptBR 
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyInviteLink(invite.token)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => deleteInvitation.mutate({ id: invite.id, organizationId: id! })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
