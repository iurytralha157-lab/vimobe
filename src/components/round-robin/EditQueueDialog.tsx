import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Shuffle, Loader2, Trash2, Save } from 'lucide-react';
import { useUsers } from '@/hooks/use-users';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface Member {
  id: string;
  user_id: string;
  weight: number;
  user?: { name?: string; email?: string };
  leads_count?: number;
}

interface RoundRobin {
  id: string;
  name: string;
  members: Member[];
}

interface EditQueueDialogProps {
  queue: RoundRobin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (members: { memberId: string; weight: number }[]) => Promise<void>;
}

export function EditQueueDialog({ queue, open, onOpenChange, onSave }: EditQueueDialogProps) {
  const { data: users = [] } = useUsers();
  
  const [localMembers, setLocalMembers] = useState<Member[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [resetCounter, setResetCounter] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (queue) {
      setLocalMembers(queue.members.map(m => ({
        ...m,
        weight: m.weight || 10,
      })));
      setHasChanges(false);
    }
  }, [queue]);

  if (!queue) return null;

  const totalWeight = localMembers.reduce((sum, m) => sum + m.weight, 0);

  const handleWeightChange = (memberId: string, value: number) => {
    setLocalMembers(prev => 
      prev.map(m => m.id === memberId ? { ...m, weight: Math.max(1, value) } : m)
    );
    setHasChanges(true);
  };

  const handleRemoveMember = (memberId: string) => {
    setLocalMembers(prev => prev.filter(m => m.id !== memberId));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(localMembers.map(m => ({
        memberId: m.id,
        weight: m.weight,
      })));
      setHasChanges(false);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const availableUsers = users.filter(
    u => !localMembers.some(m => m.user_id === u.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shuffle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{queue.name}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Configure a distribuição automática de leads
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            A distribuição será automática para todos os leads que entrarem nesta fila.
            Ajuste o percentual de cada usuário para determinar a proporção de leads que ele receberá.
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[45%]">Usuários</TableHead>
                  <TableHead className="w-[25%] text-center">Peso</TableHead>
                  <TableHead className="w-[20%] text-center">%</TableHead>
                  <TableHead className="w-[10%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localMembers.map((member) => {
                  const percentage = totalWeight > 0 
                    ? Math.round((member.weight / totalWeight) * 100) 
                    : 0;
                  
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{member.user?.name || 'Usuário'}</span>
                          {member.user?.email && (
                            <span className="text-xs text-muted-foreground">
                              {member.user.email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={member.weight}
                          onChange={(e) => handleWeightChange(member.id, parseInt(e.target.value) || 1)}
                          className="w-16 text-center mx-auto"
                          min={1}
                          max={100}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-muted-foreground">{percentage}%</span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                
                {localMembers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum usuário na fila. Adicione usuários abaixo.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex gap-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Adicione um usuário..." />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => {
                if (selectedUserId) {
                  const user = users.find(u => u.id === selectedUserId);
                  setLocalMembers(prev => [...prev, {
                    id: `new-${Date.now()}`,
                    user_id: selectedUserId,
                    weight: 10,
                    user: { name: user?.name, email: user?.email },
                  }]);
                  setSelectedUserId('');
                  setHasChanges(true);
                }
              }}
              disabled={!selectedUserId}
            >
              Adicionar
            </Button>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Checkbox 
              id="reset-counter" 
              checked={resetCounter}
              onCheckedChange={(checked) => setResetCounter(checked as boolean)}
            />
            <Label htmlFor="reset-counter" className="text-sm text-muted-foreground cursor-pointer">
              Ao salvar, a contagem de leads será reiniciada.
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
