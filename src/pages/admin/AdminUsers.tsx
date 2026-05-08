import { useState } from 'react';
import { 
  Users, 
  Search,
  Building2,
  Shield,
  ShieldAlert,
  MoreHorizontal,
  UserX,
  UserCheck,
  Trash2,
  Info,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useSuperAdmin } from '@/hooks/use-super-admin';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { getFriendlyErrorMessage } from '@/lib/error-handler';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function AdminUsers() {
  const { allUsers, loadingUsers, organizations, updateUser, deleteUser } = useSuperAdmin();
  const [search, setSearch] = useState('');
  const [filterOrg, setFilterOrg] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId: string; userName: string }>({
    open: false,
    userId: '',
    userName: '',
  });
  const [detailsDialog, setDetailsDialog] = useState<{ open: boolean; user: any; loading: boolean }>({
    open: false,
    user: null,
    loading: false,
  });
  const [editDialog, setEditDialog] = useState<{ open: boolean; user: any }>({
    open: false,
    user: null,
  });
  const [showCpf, setShowCpf] = useState(false);

  const filteredUsers = allUsers?.filter(user => {
    // Search filter
    const matchesSearch = 
      user.name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase());
    
    // Organization filter
    const matchesOrg = filterOrg === 'all' || 
      (filterOrg === 'orphan' ? !user.organization_id : user.organization_id === filterOrg);
    
    // Status filter
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' ? user.is_active : !user.is_active);
    
    return matchesSearch && matchesOrg && matchesStatus;
  }) || [];

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" />
            Super Admin
          </Badge>
        );
      case 'admin':
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Admin
          </Badge>
        );
      default:
        return <Badge variant="secondary">Usuário</Badge>;
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateUser.mutateAsync({ userId, is_active: !currentStatus });
      toast.success(currentStatus ? 'Usuário desativado' : 'Usuário ativado');
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error));
    }
  };

  const handleViewDetails = async (userId: string) => {
    setDetailsDialog({ open: true, user: null, loading: true });
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setDetailsDialog({ open: true, user: data, loading: false });
    } catch (error) {
      toast.error('Erro ao carregar detalhes do usuário');
      setDetailsDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDeleteUser = async () => {
    try {
      await deleteUser.mutateAsync(deleteDialog.userId);
      toast.success('Usuário excluído');
      setDeleteDialog({ open: false, userId: '', userName: '' });
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error));
    }
  };

  const orphanCount = allUsers?.filter(u => !u.organization_id && u.role !== 'super_admin').length || 0;

  return (
    <AdminLayout title="Usuários">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuários..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={filterOrg} onValueChange={setFilterOrg}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Organização" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas organizações</SelectItem>
              <SelectItem value="orphan">
                Sem organização ({orphanCount})
              </SelectItem>
              {organizations?.map(org => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Todos os Usuários
            </CardTitle>
            <CardDescription>
              {filteredUsers.length} usuários encontrados
              {orphanCount > 0 && (
                <span className="text-destructive ml-2">
                  ({orphanCount} sem organização)
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-4">
            {loadingUsers ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum usuário encontrado
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <div 
                    key={user.id} 
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg transition-colors gap-3 ${
                      !user.organization_id && user.role !== 'super_admin' 
                        ? 'border-destructive/50 bg-destructive/5' 
                        : 'hover:bg-muted/50'
                    } ${!user.is_active ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Organization */}
                      {user.organization_name ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                          <span>{user.organization_name}</span>
                        </div>
                      ) : user.role !== 'super_admin' && (
                        <Badge variant="outline" className="text-destructive border-destructive">
                          Sem Organização
                        </Badge>
                      )}
                      
                      {/* Role Badge */}
                      {getRoleBadge(user.role)}
                      
                      {/* Status Badge */}
                      {!user.is_active && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Inativo
                        </Badge>
                      )}
                      
                      {/* Created Date */}
                      <span className="text-sm text-muted-foreground hidden md:inline">
                        {formatDistanceToNow(new Date(user.created_at), { 
                          addSuffix: true,
                          locale: ptBR 
                        })}
                      </span>
                      
                      {/* Actions */}
                      {user.role !== 'super_admin' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleViewDetails(user.id)}
                            >
                              <Info className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setEditDialog({ open: true, user })}
                            >
                              <Save className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleToggleStatus(user.id, user.is_active)}
                            >
                              {user.is_active ? (
                                <>
                                  <UserX className="h-4 w-4 mr-2" />
                                  Desativar
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Ativar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => setDeleteDialog({ 
                                open: true, 
                                userId: user.id, 
                                userName: user.name 
                              })}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{deleteDialog.userName}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Details Dialog */}
      <Dialog open={detailsDialog.open} onOpenChange={(open) => setDetailsDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
            <DialogDescription>
              Informações completas cadastradas no perfil.
            </DialogDescription>
          </DialogHeader>

          {detailsDialog.loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Carregando dados...
            </div>
          ) : detailsDialog.user ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4 border-b pb-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={detailsDialog.user.avatar_url || undefined} />
                  <AvatarFallback className="text-xl">
                    {getInitials(detailsDialog.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{detailsDialog.user.name}</h3>
                  <p className="text-muted-foreground">{detailsDialog.user.email}</p>
                  <div className="mt-1 flex gap-2">
                    {getRoleBadge(detailsDialog.user.role)}
                    {!detailsDialog.user.is_active && <Badge variant="outline">Inativo</Badge>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm border-b pb-1">Informações Pessoais</h4>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">CPF</Label>
                    <div className="relative">
                      <Input 
                        readOnly 
                        value={detailsDialog.user.cpf || 'Não informado'} 
                        type={showCpf ? "text" : "password"}
                      />
                      {detailsDialog.user.cpf && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowCpf(!showCpf)}
                        >
                          {showCpf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Telefone</Label>
                      <p className="text-sm font-medium">{detailsDialog.user.phone || 'N/I'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">WhatsApp</Label>
                      <p className="text-sm font-medium">{detailsDialog.user.whatsapp || 'N/I'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm border-b pb-1">Endereço</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">CEP</Label>
                      <p className="text-sm font-medium">{detailsDialog.user.cep || 'N/I'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">UF</Label>
                      <p className="text-sm font-medium">{detailsDialog.user.uf || 'N/I'}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Endereço</Label>
                    <p className="text-sm font-medium">
                      {detailsDialog.user.endereco ? `${detailsDialog.user.endereco}, ${detailsDialog.user.numero || 'S/N'}` : 'N/I'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Bairro / Cidade</Label>
                    <p className="text-sm font-medium">
                      {detailsDialog.user.bairro ? `${detailsDialog.user.bairro} - ${detailsDialog.user.cidade || ''}` : 'N/I'}
                    </p>
                  </div>
                  {detailsDialog.user.complemento && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Complemento</Label>
                      <p className="text-sm font-medium">{detailsDialog.user.complemento}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setDetailsDialog(prev => ({ ...prev, open: false }))}>
                  Fechar
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum dado encontrado.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
