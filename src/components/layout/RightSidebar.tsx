import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Bell, Calendar, MessageSquare, User, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RightSidebar() {
  const isMobile = useIsMobile();

  if (isMobile) return null;

  return (
    <aside className="w-72 border-l bg-sidebar hidden xl:flex flex-col h-full shrink-0 animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm">Central de Ações</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Notifications Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Bell className="h-3.5 w-3.5" />
              Notificações
            </div>
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="p-2 rounded-lg bg-muted/50 text-xs border border-transparent hover:border-primary/20 transition-colors cursor-pointer">
                  <p className="font-medium">Novo lead recebido</p>
                  <p className="text-muted-foreground mt-1">João Silva demonstrou interesse no imóvel #1234</p>
                  <p className="text-[10px] text-muted-foreground mt-1 opacity-70">Há 5 minutos</p>
                </div>
              ))}
            </div>
            <Button variant="link" className="h-auto p-0 text-xs text-primary">Ver todas</Button>
          </div>

          <Separator />

          {/* Agenda Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Calendar className="h-3.5 w-3.5" />
              Próximos Compromissos
            </div>
            <div className="space-y-2">
              <div className="p-2 rounded-lg bg-primary/5 text-xs border border-primary/10">
                <p className="font-medium text-primary">Visita: Ed. Horizonte</p>
                <p className="text-muted-foreground mt-1">Hoje às 15:30</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50 text-xs border border-transparent">
                <p className="font-medium">Reunião de Equipe</p>
                <p className="text-muted-foreground mt-1">Amanhã às 09:00</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Quick Notes Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <MessageSquare className="h-3.5 w-3.5" />
              Notas Rápidas
            </div>
            <textarea 
              className="w-full h-32 p-3 text-sm bg-muted/30 rounded-lg border border-border focus:ring-1 focus:ring-primary focus:border-primary resize-none transition-all"
              placeholder="Digite suas notas aqui..."
            />
          </div>

          {/* User Status Section */}
          <div className="pt-4 mt-4 border-t">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">Corretor Online</p>
                <p className="text-xs text-success flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                  Disponível
                </p>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
