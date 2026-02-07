import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { PhoneInput } from '@/components/ui/phone-input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, 
  Shield, 
  Plus, 
  Trash2, 
  Loader2,
  Pencil
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganizationUsers, useUpdateUser } from '@/hooks/use-users';
import { 
  useOrganizationRoles, 
  useUserOrganizationRoles, 
  useAssignUserRole,
  useRolePermissions,
  OrganizationRole
} from '@/hooks/use-organization-roles';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { RolesTab } from './RolesTab';

export function TeamTab() {
  const { profile, isSuperAdmin } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  
  const { data: users = [], isLoading: usersLoading } = useOrganizationUsers();
  const { data: organizationRoles = [] } = useOrganizationRoles();
  const { data: userOrgRoles = [] } = useUserOrganizationRoles();
  
  const updateUser = useUpdateUser();
  const assignUserRole = useAssignUserRole();

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  // Form state for new user
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserEndereco, setNewUserEndereco] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');

  const isAdmin = profile?.role === 'admin' || isSuperAdmin;

  // Helper para obter a função customizada de um usuário
  const getUserCustomRole = (userId: string): OrganizationRole | undefined => {
    const assignment = userOrgRoles.find(uor => uor.user_id === userId);
    if (!assignment) return undefined;
    return organizationRoles.find(r => r.id === assignment.organization_role_id);
  };

  const handleAssignRole = async (userId: string, roleId: string | null) => {
    await assignUserRole.mutateAsync({ userId, roleId });
  };

  const handleToggleUserActive = async (userId: string, currentValue: boolean) => {
    await updateUser.mutateAsync({ id: userId, is_active: !currentValue });
  };

  const handleUpdateUserRole = async (userId: string, role: 'admin' | 'user') => {
    await updateUser.mutateAsync({ id: userId, role });
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeletingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: userToDelete.id }
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao excluir usuário');
      toast.success('Usuário excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['organization-users'] });
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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        toast.error('Sua sessão expirou. Por favor, faça login novamente.');
        window.location.href = '/auth';
        return;
      }
      const { data: result, error } = await supabase.functions.invoke('create-user', {
        body: {
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          phone: newUserPhone.trim() || undefined,
          endereco: newUserEndereco.trim() || undefined,
          role: newUserRole
        }
      });
      if (error) throw new Error(error.message || 'Erro ao criar usuário');
      toast.success(`Usuário criado! Senha padrão: ${result.defaultPassword}`);
      queryClient.invalidateQueries({ queryKey: ['organization-users'] });
      setUserDialogOpen(false);
      resetNewUserForm();
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

  const resetNewUserForm = () => {
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
    setNewUserEndereco('');
    setNewUserRole('user');
  };

  return (
    <div className="space-y-6">
      <div className={`grid gap-6 ${isAdmin ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* LEFT: Users List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t.settings.users.title}
              </CardTitle>
              <CardDescription>{t.settings.users.description}</CardDescription>
            </div>
            {isAdmin && (
              <Dialog open={userDialogOpen} onOpenChange={(open) => {
                setUserDialogOpen(open);
                if (!open) resetNewUserForm();
              }}>
                <DialogTrigger asChild>
                  <Button size="sm">
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
                        <Input 
                          placeholder={t.common.name} 
                          value={newUserName} 
                          onChange={e => setNewUserName(e.target.value)} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.common.email}</Label>
                        <Input 
                          type="email" 
                          placeholder="email@company.com" 
                          value={newUserEmail} 
                          onChange={e => setNewUserEmail(e.target.value)} 
                        />
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
                      <Input 
                        placeholder="Endereço completo" 
                        value={newUserEndereco} 
                        onChange={e => setNewUserEndereco(e.target.value)} 
                      />
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
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {users.filter(user => user.role !== 'super_admin').map(user => (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{user.name}</p>
                          {!user.is_active && (
                            <Badge variant="secondary" className="text-xs">{t.common.inactive}</Badge>
                          )}
                          {/* Mostrar função customizada */}
                          {user.role !== 'admin' && getUserCustomRole(user.id) && (
                            <Badge 
                              variant="outline" 
                              className="text-xs"
                              style={{
                                borderColor: getUserCustomRole(user.id)?.color,
                                color: getUserCustomRole(user.id)?.color
                              }}
                            >
                              {getUserCustomRole(user.id)?.name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {isAdmin ? (
                        <>
                          {/* Tipo de usuário (admin/user) */}
                          <Select 
                            value={user.role} 
                            onValueChange={v => handleUpdateUserRole(user.id, v as 'admin' | 'user')} 
                            disabled={user.id === profile?.id}
                          >
                            <SelectTrigger className="w-24 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">{t.settings.users.admin}</SelectItem>
                              <SelectItem value="user">{t.settings.users.user}</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {/* Função customizada (apenas para não-admins) */}
                          {user.role !== 'admin' && organizationRoles.length > 0 && (
                            <Select 
                              value={getUserCustomRole(user.id)?.id || 'none'} 
                              onValueChange={v => handleAssignRole(user.id, v === 'none' ? null : v)} 
                              disabled={user.id === profile?.id}
                            >
                              <SelectTrigger className="w-28 h-8 text-xs">
                                <SelectValue placeholder="Função..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sem função</SelectItem>
                                {organizationRoles.map(role => (
                                  <SelectItem key={role.id} value={role.id}>
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-2 h-2 rounded-full" 
                                        style={{ backgroundColor: role.color }} 
                                      />
                                      {role.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          
                          <Switch 
                            checked={user.is_active || false} 
                            onCheckedChange={() => handleToggleUserActive(user.id, user.is_active || false)} 
                            disabled={user.id === profile?.id} 
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
                            onClick={() => {
                              setUserToDelete({ id: user.id, name: user.name });
                              setDeleteUserDialogOpen(true);
                            }} 
                            disabled={user.id === profile?.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role === 'admin' ? t.settings.users.admin : t.settings.users.user}
                          </Badge>
                          {user.role !== 'admin' && getUserCustomRole(user.id) && (
                            <Badge 
                              variant="outline"
                              style={{
                                borderColor: getUserCustomRole(user.id)?.color,
                                color: getUserCustomRole(user.id)?.color
                              }}
                            >
                              {getUserCustomRole(user.id)?.name}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT: Roles (only for admins) */}
        {isAdmin && <RolesTab />}
      </div>

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
            <AlertDialogAction 
              onClick={handleDeleteUser} 
              disabled={deletingUser} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
