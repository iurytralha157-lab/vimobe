
import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  isPushSupported, 
  isIOS, 
  isStandalone, 
  subscribeToPush, 
  unsubscribeFromPush, 
  checkSubscriptionStatus 
} from "@/lib/push";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { 
  Download, 
  Bell, 
  BellOff, 
  Send, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Install() {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPWA, setIsPWA] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [pushStatus, setPushStatus] = useState<NotificationPermission>("default");
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    setIsPWA(isStandalone());
    setIsIOSDevice(isIOS());
    
    checkSubscriptionStatus().then(setPushStatus);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const handleTogglePush = async () => {
    if (!user) return;
    setIsSubscribing(true);
    try {
      if (pushStatus === "granted") {
        await unsubscribeFromPush(user.id);
        setPushStatus("default");
        toast.success("Notificações desativadas");
      } else {
        await subscribeToPush(user.id);
        setPushStatus("granted");
        toast.success("Notificações ativadas com sucesso!");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao configurar notificações");
      checkSubscriptionStatus().then(setPushStatus);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleSendTest = async () => {
    try {
      const { error } = await supabase.functions.invoke("notification-dispatcher", {
        body: { test: true },
      });
      if (error) throw error;
      toast.success("Solicitação de teste enviada!");
    } catch (error: any) {
      toast.error("Erro ao enviar teste: " + error.message);
    }
  };

  if (!isPushSupported()) {
    return (
      <AppLayout title="Notificações">
        <div className="max-w-md mx-auto py-10 px-4 text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Sem Suporte</h2>
          <p className="text-muted-foreground mb-6">
            Seu navegador não suporta Notificações Push ou você está em uma janela privativa.
          </p>
          <Button onClick={() => window.location.reload()}>Recarregar Página</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Instalar App">
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
        <section className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Configurar App</h1>
          <p className="text-muted-foreground">
            Siga os passos abaixo para ter a melhor experiência no celular.
          </p>
        </section>

        <div className="grid gap-6">
          {/* Passo 1: Instalação */}
          <Card className={isPWA ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/10" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm">1</span>
                  Instalar no Dispositivo
                </CardTitle>
                {isPWA && <CheckCircle2 className="text-green-500 h-6 w-6" />}
              </div>
              <CardDescription>
                Acesse o sistema como um aplicativo nativo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isPWA ? (
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  O aplicativo já está instalado e rodando em modo nativo!
                </p>
              ) : isIOSDevice ? (
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <p className="text-sm font-medium">Instruções para iPhone/iPad:</p>
                  <ol className="text-xs space-y-2 list-decimal list-inside text-muted-foreground">
                    <li>Toque no ícone de <strong>Compartilhar</strong> (quadrado com seta)</li>
                    <li>Role para baixo e selecione <strong>Adicionar à Tela de Início</strong></li>
                    <li>Toque em <strong>Adicionar</strong> no canto superior direito</li>
                  </ol>
                </div>
              ) : (
                <Button 
                  className="w-full" 
                  disabled={!deferredPrompt} 
                  onClick={handleInstallClick}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {deferredPrompt ? "Instalar Agora" : "Já Instalado ou Não Disponível"}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Passo 2: Notificações */}
          <Card className={pushStatus === "granted" ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/10" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm">2</span>
                  Ativar Notificações
                </CardTitle>
                {pushStatus === "granted" && <CheckCircle2 className="text-green-500 h-6 w-6" />}
              </div>
              <CardDescription>
                Receba alertas em tempo real sobre novos leads e mensagens.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isIOSDevice && !isPWA ? (
                <p className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  No iOS, você precisa primeiro instalar o app (Passo 1) para ativar as notificações.
                </p>
              ) : (
                <div className="space-y-4">
                  <Button 
                    className="w-full" 
                    variant={pushStatus === "granted" ? "outline" : "default"}
                    onClick={handleTogglePush}
                    disabled={isSubscribing}
                  >
                    {isSubscribing ? (
                      "Processando..."
                    ) : pushStatus === "granted" ? (
                      <><BellOff className="mr-2 h-4 w-4" /> Desativar Notificações</>
                    ) : (
                      <><Bell className="mr-2 h-4 w-4" /> Ativar Agora</>
                    )}
                  </Button>

                  {pushStatus === "granted" && (
                    <Button 
                      className="w-full" 
                      variant="ghost" 
                      onClick={handleSendTest}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Enviar Notificação de Teste
                    </Button>
                  )}
                  
                  {pushStatus === "denied" && (
                    <p className="text-xs text-center text-destructive">
                      Você bloqueou as notificações. Por favor, reative nas configurações do seu navegador.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rodapé Informativo */}
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Quando enviamos notificações?</p>
              <p>• Imediatamente ao receber um novo lead ou mensagem.</p>
              <p>• Lembretes diários às 09:00 e 21:00 (Horário de Brasília).</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
