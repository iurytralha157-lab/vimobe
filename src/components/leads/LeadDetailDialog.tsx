import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Phone,
  Mail,
  MessageSquare,
  Clock,
  User,
  Building2,
  Tag,
  Edit2,
  Save,
  X,
  Loader2,
  History,
  CheckSquare,
  Plus,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateLead } from '@/hooks/use-leads';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LeadDetailDialogProps {
  lead: any | null;
  stages: any[];
  onClose: () => void;
  allTags?: any[];
  allUsers?: any[];
  refetchStages?: () => void;
}

export function LeadDetailDialog({
  lead,
  stages,
  onClose,
  allTags = [],
  allUsers = [],
  refetchStages,
}: LeadDetailDialogProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const updateLead = useUpdateLead();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Initialize form when lead changes
  useEffect(() => {
    if (lead) {
      setEditForm({
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        message: lead.message || '',
      });
      setSelectedStage(lead.stage_id || '');
      setSelectedUser(lead.assigned_user_id || '');
      fetchActivities();
    }
  }, [lead?.id]);

  const fetchActivities = async () => {
    if (!lead?.id) return;
    
    setLoadingActivities(true);
    try {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          user:users(id, name, avatar_url)
        `)
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!lead) return;

    try {
      await updateLead.mutateAsync({
        id: lead.id,
        ...editForm,
      });
      setIsEditing(false);
      refetchStages?.();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleStageChange = async (stageId: string) => {
    if (!lead || stageId === lead.stage_id) return;

    const oldStage = stages.find(s => s.id === lead.stage_id);
    const newStage = stages.find(s => s.id === stageId);

    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          stage_id: stageId,
          stage_entered_at: new Date().toISOString(),
        })
        .eq('id', lead.id);

      if (error) throw error;

      // Log activity
      await supabase.from('activities').insert({
        lead_id: lead.id,
        type: 'stage_change',
        content: `Movido de "${oldStage?.name}" para "${newStage?.name}"`,
        user_id: profile?.id,
      });

      setSelectedStage(stageId);
      toast.success(`Lead movido para ${newStage?.name}`);
      refetchStages?.();
      fetchActivities();
    } catch (error: any) {
      toast.error('Erro ao mover lead: ' + error.message);
    }
  };

  const handleUserChange = async (userId: string) => {
    if (!lead || userId === lead.assigned_user_id) return;

    try {
      const { error } = await supabase
        .from('leads')
        .update({ assigned_user_id: userId || null })
        .eq('id', lead.id);

      if (error) throw error;

      const newUser = allUsers.find(u => u.id === userId);
      
      // Log activity
      await supabase.from('activities').insert({
        lead_id: lead.id,
        type: 'assignment',
        content: userId 
          ? `Atribuído para ${newUser?.name}` 
          : 'Atribuição removida',
        user_id: profile?.id,
      });

      setSelectedUser(userId);
      toast.success(userId ? `Atribuído para ${newUser?.name}` : 'Atribuição removida');
      refetchStages?.();
      fetchActivities();
    } catch (error: any) {
      toast.error('Erro ao atribuir: ' + error.message);
    }
  };

  const handleAddNote = async () => {
    if (!lead || !newNote.trim()) return;

    setAddingNote(true);
    try {
      const { error } = await supabase.from('activities').insert({
        lead_id: lead.id,
        type: 'note',
        content: newNote.trim(),
        user_id: profile?.id,
      });

      if (error) throw error;

      setNewNote('');
      toast.success('Nota adicionada!');
      fetchActivities();
    } catch (error: any) {
      toast.error('Erro ao adicionar nota: ' + error.message);
    } finally {
      setAddingNote(false);
    }
  };

  const handleOpenWhatsApp = () => {
    if (lead?.phone) {
      navigate(`/crm/conversas?phone=${encodeURIComponent(lead.phone)}`);
      onClose();
    }
  };

  if (!lead) return null;

  const currentStage = stages.find(s => s.id === lead.stage_id);
  const assignedUser = allUsers.find(u => u.id === lead.assigned_user_id);

  return (
    <Dialog open={!!lead} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {lead.name?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                {isEditing ? (
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="font-semibold text-lg h-8"
                  />
                ) : (
                  <DialogTitle className="text-xl">{lead.name}</DialogTitle>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {currentStage && (
                    <Badge
                      style={{
                        backgroundColor: `${currentStage.color}20`,
                        color: currentStage.color,
                      }}
                    >
                      {currentStage.name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit} disabled={updateLead.isPending}>
                    {updateLead.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    Salvar
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="shrink-0">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="activities">Histórico</TabsTrigger>
            <TabsTrigger value="tasks">Tarefas</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="flex-1 overflow-y-auto mt-4 space-y-4">
            {/* Contact Info */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {isEditing ? (
                    <Input
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="Telefone"
                    />
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <span>{lead.phone || 'Não informado'}</span>
                      {lead.phone && (
                        <Button size="sm" variant="outline" onClick={handleOpenWhatsApp}>
                          <MessageSquare className="h-4 w-4 mr-1" />
                          WhatsApp
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {isEditing ? (
                    <Input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="Email"
                    />
                  ) : (
                    <span>{lead.email || 'Não informado'}</span>
                  )}
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Criado {formatDistanceToNow(new Date(lead.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Stage & Assignment */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estágio</Label>
                <Select value={selectedStage} onValueChange={handleStageChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar estágio" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: stage.color }}
                          />
                          {stage.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select value={selectedUser || 'unassigned'} onValueChange={(v) => handleUserChange(v === 'unassigned' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Não atribuído</SelectItem>
                    {allUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Message/Notes */}
            <div className="space-y-2">
              <Label>Mensagem/Observação</Label>
              {isEditing ? (
                <Textarea
                  value={editForm.message}
                  onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                  placeholder="Observações sobre o lead..."
                  rows={3}
                />
              ) : (
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {lead.message || 'Nenhuma mensagem'}
                </p>
              )}
            </div>

            {/* Property */}
            {lead.property && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{lead.property.code}</p>
                    <p className="text-sm text-muted-foreground">
                      {lead.property.title || 'Imóvel de interesse'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tags */}
            {lead.lead_tags && lead.lead_tags.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </Label>
                <div className="flex flex-wrap gap-2">
                  {lead.lead_tags.map((tag: any) => (
                    <Badge
                      key={tag.tag_id || tag.id}
                      style={{
                        backgroundColor: `${tag.color}20`,
                        color: tag.color,
                      }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activities" className="flex-1 overflow-hidden mt-4 flex flex-col">
            {/* Add Note */}
            <div className="shrink-0 flex gap-2 mb-4">
              <Input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Adicionar uma nota..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              />
              <Button onClick={handleAddNote} disabled={addingNote || !newNote.trim()}>
                {addingNote ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Activities List */}
            <ScrollArea className="flex-1">
              {loadingActivities ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma atividade registrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3 p-2 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(activity.created_at).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.content}</p>
                        {activity.user && (
                          <p className="text-xs text-muted-foreground">{activity.user.name}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="tasks" className="flex-1 overflow-y-auto mt-4">
            <div className="text-center py-8 text-muted-foreground">
              <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Funcionalidade de tarefas em breve</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
