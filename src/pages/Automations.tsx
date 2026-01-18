import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Zap, Clock, Mail, MessageSquare, UserPlus, Tag, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface Automation {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  is_active: boolean | null;
}

const triggerTypes = [
  { value: "lead_created", label: "Lead criado", icon: UserPlus },
  { value: "stage_changed", label: "Estágio alterado", icon: ArrowRight },
  { value: "tag_added", label: "Tag adicionada", icon: Tag },
  { value: "time_in_stage", label: "Tempo no estágio", icon: Clock },
];

const actionTypes = [
  { value: "send_email", label: "Enviar email", icon: Mail },
  { value: "send_whatsapp", label: "Enviar WhatsApp", icon: MessageSquare },
  { value: "assign_user", label: "Atribuir corretor", icon: UserPlus },
  { value: "add_tag", label: "Adicionar tag", icon: Tag },
];

export default function Automations() {
  const { t } = useLanguage();
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", trigger_type: "" });

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ["automations", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase.from("automations").select("*").eq("organization_id", organization.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Automation[];
    },
    enabled: !!organization?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!organization?.id) throw new Error("No organization");
      const { error } = await supabase.from("automations").insert({ name: data.name, description: data.description || null, trigger_type: data.trigger_type, organization_id: organization.id, is_active: false });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["automations"] }); setIsDialogOpen(false); setFormData({ name: "", description: "", trigger_type: "" }); toast.success("Automação criada!"); },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("automations").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["automations"] }); toast.success("Status atualizado!"); },
  });

  const getTriggerInfo = (type: string) => triggerTypes.find((t) => t.value === type) || { label: type, icon: Zap };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-3xl font-bold">{t("automations")}</h1><p className="text-muted-foreground">Configure fluxos automáticos para seus leads</p></div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Nova Automação</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar Automação</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Nome</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Boas-vindas automático" /></div>
                <div className="space-y-2"><Label>Descrição</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Descreva o que essa automação faz" /></div>
                <div className="space-y-2"><Label>Gatilho</Label><Select value={formData.trigger_type} onValueChange={(v) => setFormData({ ...formData, trigger_type: v })}><SelectTrigger><SelectValue placeholder="Selecione o gatilho" /></SelectTrigger><SelectContent>{triggerTypes.map((trigger) => (<SelectItem key={trigger.value} value={trigger.value}><div className="flex items-center gap-2"><trigger.icon className="h-4 w-4" />{trigger.label}</div></SelectItem>))}</SelectContent></Select></div>
                <Button className="w-full" onClick={() => createMutation.mutate(formData)} disabled={!formData.name || !formData.trigger_type || createMutation.isPending}>Criar Automação</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {isLoading ? (<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => (<Card key={i} className="animate-pulse"><CardHeader className="space-y-2"><div className="h-5 bg-muted rounded w-3/4" /><div className="h-4 bg-muted rounded w-1/2" /></CardHeader><CardContent><div className="h-8 bg-muted rounded" /></CardContent></Card>))}</div>
        ) : automations.length === 0 ? (<Card><CardContent className="flex flex-col items-center justify-center py-12"><Zap className="h-12 w-12 text-muted-foreground mb-4" /><h3 className="text-lg font-semibold mb-2">Nenhuma automação</h3><p className="text-muted-foreground text-center mb-4">Crie sua primeira automação para automatizar tarefas repetitivas</p><Button onClick={() => setIsDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Criar Automação</Button></CardContent></Card>
        ) : (<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{automations.map((automation) => { const triggerInfo = getTriggerInfo(automation.trigger_type); const TriggerIcon = triggerInfo.icon; return (<Card key={automation.id}><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-lg">{automation.name}</CardTitle><Switch checked={automation.is_active ?? false} onCheckedChange={(checked) => toggleMutation.mutate({ id: automation.id, is_active: checked })} /></div><CardDescription>{automation.description}</CardDescription></CardHeader><CardContent><div className="flex items-center gap-2"><Badge variant={automation.is_active ? "default" : "secondary"}><TriggerIcon className="mr-1 h-3 w-3" />{triggerInfo.label}</Badge></div></CardContent></Card>); })}</div>)}
        <Card><CardHeader><CardTitle>Ações Disponíveis</CardTitle><CardDescription>Ações que podem ser executadas nas automações</CardDescription></CardHeader><CardContent><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{actionTypes.map((action) => (<div key={action.value} className="flex items-center gap-3 p-4 border rounded-lg"><div className="p-2 bg-primary/10 rounded-lg"><action.icon className="h-5 w-5 text-primary" /></div><span className="font-medium">{action.label}</span></div>))}</div></CardContent></Card>
      </div>
    </AppLayout>
  );
}
