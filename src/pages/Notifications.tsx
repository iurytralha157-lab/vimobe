import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, BellOff, Check, CheckCheck, Trash2, UserPlus, MessageSquare, Calendar, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Notification { id: string; title: string; content: string | null; type: string; is_read: boolean | null; created_at: string; }
const typeIcons: Record<string, typeof Bell> = { lead: UserPlus, message: MessageSquare, schedule: Calendar, alert: AlertCircle, default: Bell };

export default function Notifications() {
  const { t } = useLanguage();
  const { user, organization } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id, filter],
    queryFn: async () => {
      if (!user?.id || !organization?.id) return [];
      let query = supabase.from("notifications").select("*").eq("user_id", user.id).eq("organization_id", organization.id).order("created_at", { ascending: false });
      if (filter === "unread") query = query.eq("is_read", false);
      const { data, error } = await query;
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user?.id && !!organization?.id,
  });

  const markAsReadMutation = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id); if (error) throw error; }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }) });
  const markAllAsReadMutation = useMutation({ mutationFn: async () => { if (!user?.id) return; const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notifications"] }); toast.success("Todas marcadas como lidas"); } });
  const deleteMutation = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from("notifications").delete().eq("id", id); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notifications"] }); toast.success("Notificação excluída"); } });

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const getIcon = (type: string) => { const Icon = typeIcons[type] || typeIcons.default; return <Icon className="h-5 w-5" />; };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-3xl font-bold">{t("notifications")}</h1><p className="text-muted-foreground">{unreadCount > 0 ? `${unreadCount} não lidas` : "Nenhuma notificação não lida"}</p></div>
          {unreadCount > 0 && <Button variant="outline" onClick={() => markAllAsReadMutation.mutate()} disabled={markAllAsReadMutation.isPending}><CheckCheck className="mr-2 h-4 w-4" />Marcar todas como lidas</Button>}
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
          <TabsList><TabsTrigger value="all">Todas<Badge variant="secondary" className="ml-2">{notifications.length}</Badge></TabsTrigger><TabsTrigger value="unread">Não lidas{unreadCount > 0 && <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>}</TabsTrigger></TabsList>
          <TabsContent value={filter} className="mt-4">
            {isLoading ? (<div className="space-y-4">{[1, 2, 3].map((i) => (<Card key={i} className="animate-pulse"><CardContent className="py-4"><div className="h-5 bg-muted rounded w-3/4 mb-2" /><div className="h-4 bg-muted rounded w-1/2" /></CardContent></Card>))}</div>
            ) : notifications.length === 0 ? (<Card><CardContent className="flex flex-col items-center justify-center py-12"><BellOff className="h-12 w-12 text-muted-foreground mb-4" /><h3 className="text-lg font-semibold mb-2">{filter === "unread" ? "Nenhuma notificação não lida" : "Nenhuma notificação"}</h3></CardContent></Card>
            ) : (<div className="space-y-3">{notifications.map((n) => (<Card key={n.id} className={n.is_read ? "opacity-70" : "border-primary/20 bg-primary/5"}><CardContent className="py-4"><div className="flex items-start gap-4"><div className={`p-2 rounded-full ${n.is_read ? "bg-muted" : "bg-primary/10 text-primary"}`}>{getIcon(n.type)}</div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><h4 className="font-semibold">{n.title}</h4>{!n.is_read && <Badge variant="default" className="text-xs">Nova</Badge>}</div>{n.content && <p className="text-sm text-muted-foreground mb-2">{n.content}</p>}<span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}</span></div><div className="flex items-center gap-1">{!n.is_read && <Button variant="ghost" size="icon" onClick={() => markAsReadMutation.mutate(n.id)}><Check className="h-4 w-4" /></Button>}<Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(n.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></div></CardContent></Card>))}</div>)}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
