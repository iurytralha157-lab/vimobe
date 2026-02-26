import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  User,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  History,
  Calendar,
  X,
  DollarSign,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatPhoneForDisplay } from "@/lib/phone-utils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useConversationLeadDetail } from "@/hooks/use-conversation-lead-detail";

interface ConversationLeadPanelProps {
  leadId: string;
  onClose: () => void;
  className?: string;
}

export function ConversationLeadPanel({
  leadId,
  onClose,
  className,
}: ConversationLeadPanelProps) {
  const { data: lead, isLoading } = useConversationLeadDetail(leadId);

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lead) return null;

  const leadTags = (lead.tags as any[]) || [];
  const stage = lead.stage as any;
  const pipeline = lead.pipeline as any;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <div className={cn("flex flex-col h-full bg-card border-l", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-11 w-11 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-base font-semibold">
                {lead.name?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">{lead.name}</h3>
              {lead.phone && (
                <p className="text-xs text-muted-foreground">
                  {formatPhoneForDisplay(lead.phone)}
                </p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Contact Info */}
          <section>
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Contato
            </h4>
            <div className="space-y-1.5">
              {lead.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{formatPhoneForDisplay(lead.phone)}</span>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{lead.email}</span>
                </div>
              )}
              {(lead.cidade || lead.uf) && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{[lead.cidade, lead.uf].filter(Boolean).join(", ")}</span>
                </div>
              )}
              {lead.source && (
                <div className="text-xs text-muted-foreground mt-1">
                  Origem: {lead.source}
                </div>
              )}
            </div>
          </section>

          <Separator />

          {/* Pipeline / Stage */}
          <section>
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Estágio
            </h4>
            {pipeline && (
              <p className="text-xs text-muted-foreground mb-1.5">{pipeline.name}</p>
            )}
            {stage ? (
              <Badge
                variant="secondary"
                className="text-xs"
                style={stage.color ? {
                  backgroundColor: `${stage.color}20`,
                  color: stage.color,
                  borderColor: stage.color,
                } : undefined}
              >
                {stage.name}
              </Badge>
            ) : (
              <p className="text-xs text-muted-foreground">Sem estágio</p>
            )}
          </section>

          <Separator />

          {/* Tags */}
          {leadTags.length > 0 && (
            <>
              <section>
                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Tags
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {leadTags.map((lt: any) => (
                    <Badge
                      key={lt.tag.id}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-5"
                      style={{
                        backgroundColor: `${lt.tag.color}20`,
                        color: lt.tag.color,
                      }}
                    >
                      {lt.tag.name}
                    </Badge>
                  ))}
                </div>
              </section>
              <Separator />
            </>
          )}

          {/* Value */}
          {lead.valor_interesse && (
            <>
              <section>
                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Valor de Interesse
                </h4>
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatCurrency(Number(lead.valor_interesse))}
                </div>
              </section>
              <Separator />
            </>
          )}

          {/* Quick Actions */}
          <section>
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Ações
            </h4>
            <div className="space-y-1.5">
              <Button variant="outline" size="sm" className="w-full justify-start h-8 text-xs" asChild>
                <Link to={`/crm/pipelines?lead=${lead.id}`}>
                  <User className="h-3.5 w-3.5 mr-2" />
                  Ver Lead Completo
                  <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start h-8 text-xs" asChild>
                <Link to={`/agenda?lead=${lead.id}`}>
                  <Calendar className="h-3.5 w-3.5 mr-2" />
                  Agendar Atividade
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start h-8 text-xs" asChild>
                <Link to={`/crm/pipelines?lead=${lead.id}&tab=history`}>
                  <History className="h-3.5 w-3.5 mr-2" />
                  Ver Histórico
                </Link>
              </Button>
            </div>
          </section>

          {/* Created date */}
          {lead.created_at && (
            <>
              <Separator />
              <div className="text-[11px] text-muted-foreground">
                Criado em {format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm")}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
