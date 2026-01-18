import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, QrCode, CheckCircle2, XCircle, RefreshCw, Smartphone, Bot, Clock, Send, Settings2 } from "lucide-react";
import { toast } from "sonner";

const quickReplies = [
  { id: 1, trigger: "/oi", message: "Olá! Bem-vindo à nossa imobiliária. Como posso ajudá-lo hoje?" },
  { id: 2, trigger: "/horario", message: "Nosso horário de atendimento é de segunda a sexta, das 9h às 18h." },
];

export default function WhatsAppSettings() {
  const { t } = useLanguage();
  const [isConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = () => { setIsConnecting(true); setTimeout(() => { setIsConnecting(false); toast.info("Escaneie o QR Code com seu WhatsApp"); }, 1000); };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">{t("whatsappSettings")}</h1><p className="text-muted-foreground">Configure a integração com WhatsApp</p></div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="p-2 bg-green-500/10 rounded-lg"><MessageSquare className="h-6 w-6 text-green-500" /></div><div><CardTitle>WhatsApp Business</CardTitle><CardDescription>Conecte seu WhatsApp para enviar e receber mensagens</CardDescription></div></div>
                  <Badge variant={isConnected ? "default" : "secondary"}>{isConnected ? (<><CheckCircle2 className="mr-1 h-3 w-3" />Conectado</>) : (<><XCircle className="mr-1 h-3 w-3" />Desconectado</>)}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {isConnected ? (
                  <div className="space-y-4"><div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg"><Smartphone className="h-10 w-10 text-green-500" /><div><p className="font-medium">+55 11 99999-9999</p><p className="text-sm text-muted-foreground">Conectado há 2 dias</p></div></div><div className="flex gap-2"><Button variant="outline">Desconectar</Button><Button variant="outline"><RefreshCw className="mr-2 h-4 w-4" />Reconectar</Button></div></div>
                ) : (
                  <div className="text-center py-8">{isConnecting ? (<><div className="w-48 h-48 mx-auto mb-4 bg-muted rounded-lg flex items-center justify-center"><QrCode className="h-32 w-32 text-muted-foreground" /></div><p className="text-sm text-muted-foreground mb-4">Escaneie o QR Code com seu WhatsApp</p><Button variant="outline" onClick={() => setIsConnecting(false)}>Cancelar</Button></>) : (<><MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="font-semibold mb-2">Conecte seu WhatsApp</h3><p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">Ao conectar, você poderá enviar e receber mensagens diretamente pelo sistema.</p><Button onClick={handleConnect} className="bg-green-600 hover:bg-green-700"><QrCode className="mr-2 h-4 w-4" />Gerar QR Code</Button></>)}</div>
                )}
              </CardContent>
            </Card>
            <Tabs defaultValue="quick-replies">
              <TabsList><TabsTrigger value="quick-replies">Respostas Rápidas</TabsTrigger><TabsTrigger value="bot">Chatbot</TabsTrigger><TabsTrigger value="schedule">Horário de Atendimento</TabsTrigger></TabsList>
              <TabsContent value="quick-replies" className="mt-4"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" />Respostas Rápidas</CardTitle><CardDescription>Configure atalhos para mensagens frequentes.</CardDescription></CardHeader><CardContent className="space-y-4">{quickReplies.map((reply) => (<div key={reply.id} className="p-4 border rounded-lg"><div className="flex items-center gap-2 mb-2"><Badge variant="secondary" className="font-mono">{reply.trigger}</Badge></div><p className="text-sm text-muted-foreground">{reply.message}</p></div>))}<Separator /><div className="space-y-4"><h4 className="font-medium">Adicionar nova resposta</h4><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Gatilho</Label><Input placeholder="/comando" /></div><div className="space-y-2"><Label>Mensagem</Label><Input placeholder="Mensagem a ser enviada" /></div></div><Button>Adicionar Resposta</Button></div></CardContent></Card></TabsContent>
              <TabsContent value="bot" className="mt-4"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" />Chatbot</CardTitle><CardDescription>Configure respostas automáticas para mensagens recebidas</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex items-center justify-between p-4 border rounded-lg"><div><Label>Ativar Chatbot</Label><p className="text-xs text-muted-foreground">Responder automaticamente fora do horário de atendimento</p></div><Switch /></div><div className="space-y-2"><Label>Mensagem de boas-vindas</Label><Textarea placeholder="Olá! Obrigado por entrar em contato..." rows={3} /></div><Button>Salvar Configurações</Button></CardContent></Card></TabsContent>
              <TabsContent value="schedule" className="mt-4"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Horário de Atendimento</CardTitle><CardDescription>Defina quando sua equipe está disponível</CardDescription></CardHeader><CardContent className="space-y-4">{["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"].map((day) => (<div key={day} className="flex items-center gap-4"><Switch defaultChecked={day !== "Domingo"} /><span className="w-24 font-medium">{day}</span><Input type="time" defaultValue="09:00" className="w-32" disabled={day === "Domingo"} /><span className="text-muted-foreground">às</span><Input type="time" defaultValue={day === "Sábado" ? "13:00" : "18:00"} className="w-32" disabled={day === "Domingo"} /></div>))}<Button className="mt-4">Salvar Horários</Button></CardContent></Card></TabsContent>
            </Tabs>
          </div>
          <div className="space-y-6">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" />Configurações</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-center justify-between"><div><Label>Notificações</Label><p className="text-xs text-muted-foreground">Notificar novas mensagens</p></div><Switch defaultChecked /></div><Separator /><div className="flex items-center justify-between"><div><Label>Som de notificação</Label><p className="text-xs text-muted-foreground">Tocar som ao receber mensagem</p></div><Switch defaultChecked /></div></CardContent></Card>
            <Card><CardHeader><CardTitle>Estatísticas</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex justify-between"><span className="text-muted-foreground">Mensagens enviadas (mês)</span><span className="font-semibold">0</span></div><div className="flex justify-between"><span className="text-muted-foreground">Mensagens recebidas (mês)</span><span className="font-semibold">0</span></div></CardContent></Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
