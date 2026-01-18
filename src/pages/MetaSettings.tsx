import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Facebook, Link2, CheckCircle2, XCircle, RefreshCw, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MetaIntegration { id: string; is_connected: boolean | null; page_name: string | null; last_sync_at: string | null; }

export default function MetaSettings() {
  const { t } = useLanguage();
  const { organization } = useAuth();

  const { data: integration } = useQuery({
    queryKey: ["meta-integration", organization?.id],
    queryFn: async () => { if (!organization?.id) return null; const { data, error } = await supabase.from("meta_integrations").select("*").eq("organization_id", organization.id).maybeSingle(); if (error) throw error; return data as MetaIntegration | null; },
    enabled: !!organization?.id,
  });

  const handleConnect = () => { toast.info("Redirecionando para autenticação do Meta..."); setTimeout(() => toast.error("Integração com Meta requer configuração de App ID"), 2000); };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">{t("metaSettings")}</h1><p className="text-muted-foreground">Gerencie a integração com Meta (Facebook/Instagram) Leads</p></div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 bg-blue-500/10 rounded-lg"><Facebook className="h-6 w-6 text-blue-500" /></div><div><CardTitle>Meta Lead Ads</CardTitle><CardDescription>Conecte sua conta do Meta para receber leads automaticamente</CardDescription></div></div>
                  <Badge variant={integration?.is_connected ? "default" : "secondary"}>{integration?.is_connected ? (<><CheckCircle2 className="mr-1 h-3 w-3" />Conectado</>) : (<><XCircle className="mr-1 h-3 w-3" />Desconectado</>)}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {integration?.is_connected ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label className="text-muted-foreground">Página conectada</Label><p className="font-medium">{integration.page_name || "Não definida"}</p></div><div className="space-y-2"><Label className="text-muted-foreground">Última sincronização</Label><p className="font-medium">{integration.last_sync_at ? formatDistanceToNow(new Date(integration.last_sync_at), { addSuffix: true, locale: ptBR }) : "Nunca"}</p></div></div>
                    <Separator />
                    <div className="flex gap-2"><Button><RefreshCw className="mr-2 h-4 w-4" />Sincronizar agora</Button></div>
                  </div>
                ) : (
                  <div className="text-center py-8"><Facebook className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="font-semibold mb-2">Conecte sua conta Meta</h3><p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">Ao conectar, você poderá receber automaticamente leads captados em seus anúncios.</p><Button onClick={handleConnect}><Link2 className="mr-2 h-4 w-4" />Conectar com Meta</Button></div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" />Configurações</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-center justify-between"><div><Label>Sincronização automática</Label><p className="text-xs text-muted-foreground">Importar leads automaticamente</p></div><Switch defaultChecked /></div><Separator /><div className="flex items-center justify-between"><div><Label>Notificar novos leads</Label><p className="text-xs text-muted-foreground">Enviar notificação ao receber lead</p></div><Switch defaultChecked /></div></CardContent></Card>
            <Card><CardHeader><CardTitle>Estatísticas</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex justify-between"><span className="text-muted-foreground">Leads importados (mês)</span><span className="font-semibold">0</span></div><div className="flex justify-between"><span className="text-muted-foreground">Última importação</span><span className="font-semibold">-</span></div></CardContent></Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
