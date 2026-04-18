import { useState } from 'react';
import { Copy } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAllOnboardingRequests,
  useUpdateOnboardingRequest,
  useActiveSubscriptionPlans,
  OnboardingRequest,
} from '@/hooks/use-onboarding-requests';
import { useSuperAdmin } from '@/hooks/use-super-admin';
import { supabase } from '@/integrations/supabase/client';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  Building2,
  User,
  Filter,
  Loader2,
  Palette,
  Globe,
  Share2,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; variant: 'secondary' | 'default' | 'destructive'; className?: string }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  approved: { label: 'Aprovada', variant: 'default', className: 'bg-green-500 hover:bg-green-600 text-white border-transparent' },
  rejected: { label: 'Rejeitada', variant: 'destructive' },
};

const defaultStages = [
  { name: 'Novo Lead', stage_key: 'new', position: 0, color: '#3b82f6' },
  { name: 'Contactados', stage_key: 'contacted', position: 1, color: '#0891b2' },
  { name: 'Conversa Ativa', stage_key: 'active', position: 2, color: '#22c55e' },
  { name: 'Reunião Marcada', stage_key: 'meeting', position: 3, color: '#8b5cf6' },
  { name: 'No-show', stage_key: 'noshow', position: 4, color: '#f59e0b' },
  { name: 'Proposta em Negociação', stage_key: 'negotiation', position: 5, color: '#ec4899' },
  { name: 'Fechado', stage_key: 'closed', position: 6, color: '#22c55e' },
  { name: 'Perdido', stage_key: 'lost', position: 7, color: '#ef4444' },
];

export default function AdminOnboarding() {
  const { data: requests = [], isLoading } = useAllOnboardingRequests();
  const updateMutation = useUpdateOnboardingRequest();
  const { createOrganization } = useSuperAdmin();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [approving, setApproving] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);

  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.responsible_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.responsible_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  const openDetail = (req: OnboardingRequest) => {
    setSelectedRequest(req);
    setAdminNotes(req.admin_notes || '');
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setApproving(true);
    const generatedPassword = Math.random().toString(36).slice(-10) + 'A1!';
    try {
      // Create org via edge function
      await createOrganization.mutateAsync({
        name: selectedRequest.company_name,
        segment: (selectedRequest.segment as any) || 'imobiliario',
        adminEmail: selectedRequest.responsible_email,
        adminName: selectedRequest.responsible_name,
        adminPassword: generatedPassword,
      });

      // Update request status
      await updateMutation.mutateAsync({
        id: selectedRequest.id,
        status: 'approved',
        admin_notes: adminNotes,
      });

      toast.success('Organização criada e solicitação aprovada!');
      setSelectedRequest(null);
      // Show credentials dialog
      setCreatedCredentials({
        email: selectedRequest.responsible_email,
        password: generatedPassword,
      });
    } catch (err: any) {
      toast.error('Erro ao aprovar: ' + err.message);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    await updateMutation.mutateAsync({
      id: selectedRequest.id,
      status: 'rejected',
      admin_notes: adminNotes,
    });
    toast.success('Solicitação rejeitada');
    setSelectedRequest(null);
  };

  return (
    <AdminLayout title="Onboarding - Solicitações">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
          <Card className="border-yellow-500/50"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p><p className="text-xs text-muted-foreground">Pendentes</p></CardContent></Card>
          <Card className="border-green-500/50"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{stats.approved}</p><p className="text-xs text-muted-foreground">Aprovadas</p></CardContent></Card>
          <Card className="border-red-500/50"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{stats.rejected}</p><p className="text-xs text-muted-foreground">Rejeitadas</p></CardContent></Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por empresa, nome ou e-mail..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="approved">Aprovadas</SelectItem>
                  <SelectItem value="rejected">Rejeitadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Solicitações de Onboarding ({filteredRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhuma solicitação encontrada</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Segmento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((req) => {
                      const config = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                      return (
                        <TableRow key={req.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {req.logo_url && <img src={req.logo_url} alt="" className="h-8 w-8 rounded object-contain" />}
                              <div>
                                <p className="font-medium">{req.company_name}</p>
                                <p className="text-xs text-muted-foreground">{req.company_email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{req.responsible_name}</p>
                            <p className="text-xs text-muted-foreground">{req.responsible_email}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{req.segment}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={config.variant} className={config.className}>{config.label}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(req.created_at), 'dd/MM/yy', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => openDetail(req)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Solicitação</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-6">
                {/* Company */}
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2"><Building2 className="h-4 w-4" /> Dados da Empresa</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm bg-muted/50 rounded-lg p-3">
                    <div><span className="text-muted-foreground">Nome:</span> {selectedRequest.company_name}</div>
                    <div><span className="text-muted-foreground">CNPJ:</span> {selectedRequest.cnpj || '-'}</div>
                    <div className="col-span-2"><span className="text-muted-foreground">Endereço:</span> {selectedRequest.company_address || '-'}</div>
                    <div><span className="text-muted-foreground">Telefone:</span> {selectedRequest.company_phone || '-'}</div>
                    <div><span className="text-muted-foreground">WhatsApp:</span> {selectedRequest.company_whatsapp || '-'}</div>
                    <div><span className="text-muted-foreground">E-mail:</span> {selectedRequest.company_email || '-'}</div>
                    <div><span className="text-muted-foreground">Segmento:</span> {selectedRequest.segment || '-'}</div>
                  </div>
                </div>

                {/* Responsible */}
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2"><User className="h-4 w-4" /> Responsável</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm bg-muted/50 rounded-lg p-3">
                    <div><span className="text-muted-foreground">Nome:</span> {selectedRequest.responsible_name}</div>
                    <div><span className="text-muted-foreground">E-mail:</span> {selectedRequest.responsible_email}</div>
                    <div><span className="text-muted-foreground">CPF:</span> {selectedRequest.responsible_cpf || '-'}</div>
                    <div><span className="text-muted-foreground">Telefone:</span> {selectedRequest.responsible_phone || '-'}</div>
                  </div>
                </div>

                {/* Visual */}
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2"><Palette className="h-4 w-4" /> Identidade Visual</h4>
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    {selectedRequest.logo_url && (
                      <div><span className="text-sm text-muted-foreground">Logo:</span><br /><img src={selectedRequest.logo_url} alt="Logo" className="h-16 object-contain mt-1 rounded" /></div>
                    )}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Cor Principal:</span>
                        <div className="h-6 w-6 rounded" style={{ backgroundColor: selectedRequest.primary_color || '#3b82f6' }} />
                        <span>{selectedRequest.primary_color}</span>
                      </div>
                      {selectedRequest.secondary_color && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Secundária:</span>
                          <div className="h-6 w-6 rounded" style={{ backgroundColor: selectedRequest.secondary_color }} />
                          <span>{selectedRequest.secondary_color}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Site Content */}
                {(selectedRequest.site_title || selectedRequest.about_text || selectedRequest.banner_url) && (
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-2"><Globe className="h-4 w-4" /> Conteúdo do Site</h4>
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                      {selectedRequest.site_title && <div><span className="text-muted-foreground">Título:</span> {selectedRequest.site_title}</div>}
                      {selectedRequest.banner_title && <div><span className="text-muted-foreground">Banner:</span> {selectedRequest.banner_title}</div>}
                      {selectedRequest.site_seo_description && <div><span className="text-muted-foreground">SEO:</span> {selectedRequest.site_seo_description}</div>}
                      {selectedRequest.about_text && <div><span className="text-muted-foreground">Sobre:</span> {selectedRequest.about_text}</div>}
                      {selectedRequest.banner_url && <img src={selectedRequest.banner_url} alt="Banner" className="h-20 object-cover rounded mt-1" />}
                    </div>
                  </div>
                )}

                {/* Social */}
                {(selectedRequest.instagram || selectedRequest.facebook || selectedRequest.youtube || selectedRequest.linkedin) && (
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-2"><Share2 className="h-4 w-4" /> Redes Sociais</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm bg-muted/50 rounded-lg p-3">
                      {selectedRequest.instagram && <div><span className="text-muted-foreground">Instagram:</span> {selectedRequest.instagram}</div>}
                      {selectedRequest.facebook && <div><span className="text-muted-foreground">Facebook:</span> {selectedRequest.facebook}</div>}
                      {selectedRequest.youtube && <div><span className="text-muted-foreground">YouTube:</span> {selectedRequest.youtube}</div>}
                      {selectedRequest.linkedin && <div><span className="text-muted-foreground">LinkedIn:</span> {selectedRequest.linkedin}</div>}
                    </div>
                  </div>
                )}

                {/* Team */}
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2"><Users className="h-4 w-4" /> Configuração</h4>
                  <div className="text-sm bg-muted/50 rounded-lg p-3">
                    <span className="text-muted-foreground">Equipe:</span> {selectedRequest.team_size || '-'} pessoas
                  </div>
                </div>

                {/* Admin Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Observações do Administrador</label>
                  <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={3} placeholder="Notas internas..." />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>Fechar</Button>
              {selectedRequest?.status === 'pending' && (
                <>
                  <Button variant="destructive" onClick={handleReject} disabled={updateMutation.isPending}>
                    <XCircle className="h-4 w-4 mr-2" /> Rejeitar
                  </Button>
                  <Button onClick={handleApprove} disabled={approving || createOrganization.isPending} className="bg-green-600 hover:bg-green-700">
                    {approving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Aprovar e Criar Organização
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Credentials Dialog */}
        <Dialog open={!!createdCredentials} onOpenChange={() => setCreatedCredentials(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Credenciais do Usuário Criado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Anote as credenciais abaixo para enviar ao usuário. A senha não poderá ser recuperada depois.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail</label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={createdCredentials?.email || ''} />
                  <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(createdCredentials?.email || ''); toast.success('E-mail copiado!'); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Senha</label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={createdCredentials?.password || ''} />
                  <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(createdCredentials?.password || ''); toast.success('Senha copiada!'); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setCreatedCredentials(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
