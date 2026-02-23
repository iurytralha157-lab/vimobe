import { useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  Eye,
  EyeOff,
  MoreHorizontal,
  Power,
  PowerOff,
  Trash2 } from
'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useSuperAdmin } from '@/hooks/use-super-admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
'@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger } from
'@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
'@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminOrganizations() {
  const { organizations, loadingOrgs, createOrganization, updateOrganization, deleteOrganization } = useSuperAdmin();
  const { startImpersonate } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<{id: string;name: string;} | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [newOrg, setNewOrg] = useState({
    name: '',
    segment: 'imobiliario' as 'imobiliario' | 'telecom' | 'servicos',
    adminEmail: '',
    adminName: '',
    adminPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  const filteredOrgs = organizations?.filter((org) =>
  org.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive) {
      return <Badge variant="outline" className="text-gray-500">Inativo</Badge>;
    }
    switch (status) {
      case 'active':
        return <Badge className="bg-orange-500">Ativo</Badge>;
      case 'trial':
        return <Badge variant="secondary">Trial</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspenso</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCreateOrg = async () => {
    if (!newOrg.adminPassword || newOrg.adminPassword.length < 6) {
      return;
    }
    await createOrganization.mutateAsync(newOrg);
    setCreateDialogOpen(false);
    setNewOrg({ name: '', segment: 'imobiliario', adminEmail: '', adminName: '', adminPassword: '' });
    setShowPassword(false);
  };

  const handleImpersonate = async (orgId: string, orgName: string) => {
    await startImpersonate(orgId, orgName);
    navigate('/dashboard');
  };

  const handleToggleActive = (orgId: string, currentActive: boolean) => {
    updateOrganization.mutate({ id: orgId, is_active: !currentActive });
  };

  const handleDeleteOrg = async () => {
    if (orgToDelete && deleteConfirmation === orgToDelete.name) {
      await deleteOrganization.mutateAsync(orgToDelete.id);
      setDeleteDialogOpen(false);
      setOrgToDelete(null);
      setDeleteConfirmation('');
    }
  };

  const openDeleteDialog = (org: {id: string;name: string;}) => {
    setOrgToDelete(org);
    setDeleteConfirmation('');
    setDeleteDialogOpen(true);
  };

  return (
    <AdminLayout title="Organizações">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar organizações..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9" />

          </div>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Organização
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[90%] sm:max-w-lg sm:w-full rounded-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Nova Organização</DialogTitle>
                <DialogDescription>
                  Crie uma nova organização e o usuário administrador.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Nome da Organização</Label>
                  <Input
                    id="orgName"
                    value={newOrg.name}
                    onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                    placeholder="Ex: Imobiliária XYZ" />

                </div>
                <div className="space-y-2">
                  <Label htmlFor="segment">Tipo de Negócio</Label>
                  <select
                    id="segment"
                    value={newOrg.segment}
                    onChange={(e) => setNewOrg({ ...newOrg, segment: e.target.value as any })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">

                    <option value="imobiliario">Imobiliária</option>
                    <option value="telecom">Telecom / Internet</option>
                    <option value="servicos">Serviços Gerais</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {newOrg.segment === 'imobiliario' && 'Módulos: Imóveis, Cadências, CRM Imobiliário'}
                    {newOrg.segment === 'telecom' && 'Módulos: Planos, Localidades, Clientes Telecom'}
                    {newOrg.segment === 'servicos' && 'Módulos: CRM Básico, Financeiro, Agenda'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminName">Nome do Administrador</Label>
                  <Input
                    id="adminName"
                    value={newOrg.adminName}
                    onChange={(e) => setNewOrg({ ...newOrg, adminName: e.target.value })}
                    placeholder="Ex: João Silva" />

                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Email do Administrador</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={newOrg.adminEmail}
                    onChange={(e) => setNewOrg({ ...newOrg, adminEmail: e.target.value })}
                    placeholder="admin@empresa.com" />

                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Senha do Administrador</Label>
                  <div className="relative">
                    <Input
                      id="adminPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={newOrg.adminPassword}
                      onChange={(e) => setNewOrg({ ...newOrg, adminPassword: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      className="pr-10" />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">

                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {newOrg.adminPassword && newOrg.adminPassword.length < 6 &&
                  <p className="text-xs text-destructive">A senha deve ter no mínimo 6 caracteres</p>
                  }
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="w-[40%] rounded-xl" onClick={() => {
                  setCreateDialogOpen(false);
                  setShowPassword(false);
                }}>
                  Cancelar
                </Button>
                <Button
                  className="w-[60%] rounded-xl"
                  onClick={handleCreateOrg}
                  disabled={!newOrg.name || !newOrg.adminEmail || !newOrg.adminName || !newOrg.adminPassword || newOrg.adminPassword.length < 6 || createOrganization.isPending}>

                  {createOrganization.isPending ? 'Criando...' : 'Criar Organização'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Organizations List */}
        <Card>
          <CardHeader>
            <CardTitle>Todas as Organizações</CardTitle>
            <CardDescription>
              {filteredOrgs.length} organizações encontradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingOrgs ?
            <div className="text-center py-8 text-muted-foreground">
                Carregando...
              </div> :
            filteredOrgs.length === 0 ?
            <div className="text-center py-8 text-muted-foreground">
                Nenhuma organização encontrada
              </div> :

            <div className="space-y-2 px-[15px]">
                {filteredOrgs.map((org) =>
              <div
                key={org.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-3">

                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {org.user_count} usuários • {org.lead_count} leads • 
                          Criado {formatDistanceToNow(new Date(org.created_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      {getStatusBadge(org.subscription_status, org.is_active)}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/admin/organizations/${org.id}`)}>
                            <Building2 className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleImpersonate(org.id, org.name)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Entrar como Admin
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                        onClick={() => handleToggleActive(org.id, org.is_active)}
                        className={org.is_active ? 'text-destructive' : 'text-orange-600'}>

                            {org.is_active ?
                        <>
                                <PowerOff className="h-4 w-4 mr-2" />
                                Desativar
                              </> :

                        <>
                                <Power className="h-4 w-4 mr-2" />
                                Ativar
                              </>
                        }
                          </DropdownMenuItem>
                          <DropdownMenuItem
                        onClick={() => openDeleteDialog({ id: org.id, name: org.name })}
                        className="text-destructive">

                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir Organização
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
              )}
              </div>
            }
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Organização</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>
                  Esta ação é <strong>irreversível</strong>. Todos os dados da organização serão excluídos permanentemente, incluindo:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Usuários e permissões</li>
                  <li>Leads e histórico</li>
                  <li>Contratos e comissões</li>
                  <li>Imóveis</li>
                  <li>Conversas do WhatsApp</li>
                  <li>Todos os outros dados</li>
                </ul>
                <p className="font-medium mt-4">
                  Digite o nome da organização para confirmar: <strong>{orgToDelete?.name}</strong>
                </p>
                <Input
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Digite o nome da organização"
                  className="mt-2" />

              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setOrgToDelete(null);
                setDeleteConfirmation('');
              }}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteOrg}
                disabled={deleteConfirmation !== orgToDelete?.name || deleteOrganization.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">

                {deleteOrganization.isPending ? 'Excluindo...' : 'Excluir Permanentemente'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>);

}