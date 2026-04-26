import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export function RightSidebar() {
  const isMobile = useIsMobile();

  if (isMobile) return null;

  return (
    <aside className="w-64 border-l bg-card hidden lg:flex flex-col h-full shrink-0 animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Resumo</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Atividade Recente</h4>
            <div className="text-sm text-muted-foreground italic">
              Nenhuma atividade recente encontrada.
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notas Rápidas</h4>
            <textarea 
              className="w-full h-32 p-2 text-sm bg-muted/50 rounded-md border-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="Digite suas notas aqui..."
            />
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
