import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Share, PlusSquare, X } from 'lucide-react';

export function IOSInstallGuide() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Verifica se é iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    // Verifica se já está em modo standalone (já instalado)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    
    // Verifica se já mostramos este guia nesta sessão
    const hasSeenGuide = sessionStorage.getItem('ios-install-guide-seen');

    if (isIOS && !isStandalone && !hasSeenGuide) {
      // Pequeno delay para não assustar o usuário
      const timer = setTimeout(() => {
        setShow(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setShow(false);
    sessionStorage.setItem('ios-install-guide-seen', 'true');
  };

  return (
    <Dialog open={show} onOpenChange={setShow}>
      <DialogContent className="sm:max-w-md border-primary/20 bg-background/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Instalar Vimob no iPhone
          </DialogTitle>
          <DialogDescription className="text-base py-2">
            Para receber notificações e ter uma experiência de aplicativo, adicione o Vimob à sua tela de início:
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-2 rounded-full">
              <Share className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">1. Toque no botão Compartilhar</p>
              <p className="text-sm text-muted-foreground">Localizado na barra inferior do Safari.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-2 rounded-full">
              <PlusSquare className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">2. Selecione "Adicionar à Tela de Início"</p>
              <p className="text-sm text-muted-foreground">Role a lista para baixo para encontrar esta opção.</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button onClick={handleClose} className="w-full">
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
