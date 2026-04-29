import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, BellOff, Download, CheckCircle2, AlertTriangle, Smartphone } from "lucide-react";
import { isPushSupported, subscribeToPush, unsubscribeFromPush } from "@/lib/push";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Install = () => {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsSupported(isPushSupported());
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    
    // Check if app is running in standalone mode (installed)
    const isStandaloneMode = window.matchMedia("(display-mode: standalone)").matches || 
                            (window.navigator as any).standalone || 
                            document.referrer.includes("android-app://");
    setIsStandalone(isStandaloneMode);

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const handleSubscribe = async () => {
    if (!user) return;
    setIsSubscribing(true);
    const result = await subscribeToPush(user.id);
    if (result.ok) {
      setPermission("granted");
      toast.success("Notificações ativadas com sucesso!");
    } else {
      toast.error(result.error || "Erro ao ativar notificações.");
    }
    setIsSubscribing(false);
  };

  const handleUnsubscribe = async () => {
    if (!user) return;
    setIsSubscribing(true);
    const result = await unsubscribeFromPush(user.id);
    if (result.ok) {
      setPermission("default");
      toast.success("Notificações desativadas.");
    }
    setIsSubscribing(false);
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <h1 className="text-3xl font-bold">Instalação e Notificações</h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Passo 1: Instalar o App
          </CardTitle>
          <CardDescription>
            Instale o sistema na sua tela de início para uma experiência completa e para receber notificações.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isStandalone ? (
            <div className="flex items-center gap-2 text-green-600 font-medium">
              <CheckCircle2 className="h-5 w-5" />
              O aplicativo já está instalado!
            </div>
          ) : isIOS ? (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-amber-800 text-sm space-y-2">
              <p className="font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> No iPhone/iPad:
              </p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Abra este site no <strong>Safari</strong></li>
                <li>Toque no botão de <strong>Compartilhar</strong> (quadrado com seta)</li>
                <li>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong></li>
              </ol>
            </div>
          ) : deferredPrompt ? (
            <Button onClick={handleInstallClick} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Instalar Aplicativo
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Seu navegador já instalou o app ou não suporta a instalação direta. 
              Procure pela opção "Instalar" no menu do navegador.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Passo 2: Notificações Push
          </CardTitle>
          <CardDescription>
            Receba alertas importantes sobre seus leads, tarefas e atualizações do sistema diretamente no seu dispositivo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSupported ? (
            <div className="text-red-500 text-sm flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Este navegador não suporta notificações nativas.
            </div>
          ) : isIOS && !isStandalone ? (
            <div className="text-amber-600 text-sm flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              No iPhone, você precisa instalar o app (Passo 1) antes de ativar as notificações.
            </div>
          ) : (
            <div className="space-y-4">
              {permission === "granted" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600 font-medium">
                    <CheckCircle2 className="h-5 w-5" />
                    Notificações estão ativas!
                  </div>
                  <Button variant="outline" onClick={handleUnsubscribe} disabled={isSubscribing} className="w-full">
                    <BellOff className="mr-2 h-4 w-4" />
                    Desativar Notificações
                  </Button>
                </div>
              ) : (
                <Button onClick={handleSubscribe} disabled={isSubscribing} className="w-full">
                  <Bell className="mr-2 h-4 w-4" />
                  {isSubscribing ? "Ativando..." : "Ativar Notificações"}
                </Button>
              )}
              
              <div className="text-xs text-muted-foreground pt-2 border-t">
                <p className="font-medium mb-1">O que você receberá:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Lembretes de tarefas para hoje (09:00)</li>
                  <li>Resumo de atividades atrasadas (18:00)</li>
                  <li>Alertas de novos leads e mensagens</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
