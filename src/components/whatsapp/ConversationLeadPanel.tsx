import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  ArrowRight,
  History,
  X,
  DollarSign,
  Loader2,
  Plus,
  Megaphone,
  Globe,
  Tag,
  CircleDot,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatPhoneForDisplay } from "@/lib/phone-utils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useConversationLeadDetail } from "@/hooks/use-conversation-lead-detail";
import { useStages } from "@/hooks/use-stages";
import { useTags } from "@/hooks/use-tags";
import { useUpdateLead } from "@/hooks/use-leads";
import { useAddLeadTag, useRemoveLeadTag } from "@/hooks/use-leads";

interface ConversationLeadPanelProps {
  leadId: string;
  onClose: () => void;
  className?: string;
}

const DEAL_STATUS_OPTIONS = [
  { value: "open", label: "Aberto", color: "hsl(var(--primary))" },
  { value: "won", label: "Ganho", color: "#22c55e" },
  { value: "lost", label: "Perdido", color: "hsl(var(--destructive))" },
];

export function ConversationLeadPanel({
  leadId,
  onClose,
  className,
}: ConversationLeadPanelProps) {
  const { data: lead, isLoading } = useConversationLeadDetail(leadId);
  const { data: allStages } = useStages(lead?.pipeline_id || undefined);
  const { data: allTags } = useTags();
  const updateLead = useUpdateLead();
  const addTag = useAddLeadTag();
  const removeTag = useRemoveLeadTag();

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lead) return null;

  const leadTags = (lead.tags as any[]) || [];
  const leadTagIds = leadTags.map((lt: any) => lt.tag.id);
  const availableTagsToAdd = (allTags || []).filter((t) => !leadTagIds.includes(t.id));
  const stage = lead.stage as any;
  const pipeline = lead.pipeline as any;
  const meta = (lead as any).meta;
  const dealStatus = (lead as any).deal_status || "open";

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const handleStageChange = (newStageId: string) => {
    if (newStageId !== lead.stage_id) {
      updateLead.mutate({ id: leadId, stage_id: newStageId });
    }
  };

  const handleDealStatusChange = (newStatus: string) => {
    if (newStatus !== dealStatus) {
      const updates: any = { id: leadId, deal_status: newStatus };
      if (newStatus === "won") updates.won_at = new Date().toISOString();
      if (newStatus === "lost") updates.lost_at = new Date().toISOString();
      updateLead.mutate(updates);
    }
  };

  const handleAddTag = (tagId: string) => {
    addTag.mutate({ leadId, tagId });
  };

  const handleRemoveTag = (tagId: string) => {
    removeTag.mutate({ leadId, tagId });
  };

  const currentDealStatus = DEAL_STATUS_OPTIONS.find((s) => s.value === dealStatus) || DEAL_STATUS_OPTIONS[0];

  // Campaign/source info
  const hasCampaignInfo = meta?.campaign_name || meta?.ad_name || meta?.form_name || meta?.utm_source || meta?.utm_campaign;

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

          {/* Deal Status */}
          <section>
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Status
            </h4>
            <Select value={dealStatus} onValueChange={handleDealStatusChange}>
              <SelectTrigger className="h-8 text-xs">
                <div className="flex items-center gap-2">
                  <CircleDot className="h-3 w-3" style={{ color: currentDealStatus.color }} />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {DEAL_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <CircleDot className="h-3 w-3" style={{ color: opt.color }} />
                      {opt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          <Separator />

          {/* Pipeline / Stage - Editable */}
          <section>
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Estágio
            </h4>
            {pipeline && (
              <p className="text-xs text-muted-foreground mb-1.5">{pipeline.name}</p>
            )}
            {allStages && allStages.length > 0 ? (
              <Select value={lead.stage_id || ""} onValueChange={handleStageChange}>
                <SelectTrigger className="h-8 text-xs">
                  <div className="flex items-center gap-2">
                    {stage?.color && (
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: stage.color }}
                      />
                    )}
                    <SelectValue placeholder="Selecionar estágio" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {allStages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: s.color || "#6b7280" }}
                        />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : stage ? (
              <Badge
                variant="secondary"
                className="text-xs"
                style={
                  stage.color
                    ? {
                        backgroundColor: `${stage.color}20`,
                        color: stage.color,
                        borderColor: stage.color,
                      }
                    : undefined
                }
              >
                {stage.name}
              </Badge>
            ) : (
              <p className="text-xs text-muted-foreground">Sem estágio</p>
            )}
          </section>

          <Separator />

          {/* Tags - Editable */}
          <section>
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Tags
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {leadTags.map((lt: any) => (
                <Badge
                  key={lt.tag.id}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-5 cursor-pointer group/tag hover:opacity-80"
                  style={{
                    backgroundColor: `${lt.tag.color}20`,
                    color: lt.tag.color,
                  }}
                  onClick={() => handleRemoveTag(lt.tag.id)}
                  title="Clique para remover"
                >
                  {lt.tag.name}
                  <X className="h-2.5 w-2.5 ml-1 opacity-0 group-hover/tag:opacity-100 transition-opacity" />
                </Badge>
              ))}
              
              {/* Add tag button */}
              {availableTagsToAdd.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-5 px-1.5 rounded-md border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center gap-1">
                      <Plus className="h-2.5 w-2.5" />
                      <span className="text-[10px]">Tag</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-48 overflow-auto">
                    {availableTagsToAdd.map((tag) => (
                      <DropdownMenuItem
                        key={tag.id}
                        onClick={() => handleAddTag(tag.id)}
                        className="flex items-center gap-2 text-xs"
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {leadTags.length === 0 && availableTagsToAdd.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma tag</p>
            )}
          </section>

          <Separator />

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

          {/* Campaign / Source Info */}
          <section>
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Origem
            </h4>
            <div className="space-y-2">
              {lead.source && (
                <div className="flex items-center gap-2 text-xs">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="capitalize">{lead.source}</span>
                </div>
              )}
              
              {hasCampaignInfo && (
                <div className="rounded-md bg-muted/50 p-2.5 space-y-1.5">
                  {meta.campaign_name && (
                    <div className="flex items-start gap-2 text-xs">
                      <Megaphone className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">Campanha</p>
                        <p className="truncate font-medium">{meta.campaign_name}</p>
                      </div>
                    </div>
                  )}
                  {meta.ad_name && (
                    <div className="flex items-start gap-2 text-xs">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">Anúncio</p>
                        <p className="truncate font-medium">{meta.ad_name}</p>
                      </div>
                    </div>
                  )}
                  {meta.form_name && (
                    <div className="text-xs text-muted-foreground">
                      Formulário: <span className="text-foreground">{meta.form_name}</span>
                    </div>
                  )}
                  {meta.utm_source && !meta.campaign_name && (
                    <div className="text-xs text-muted-foreground">
                      UTM: <span className="text-foreground">{meta.utm_source}{meta.utm_medium ? ` / ${meta.utm_medium}` : ""}</span>
                    </div>
                  )}
                  {meta.utm_campaign && !meta.campaign_name && (
                    <div className="text-xs text-muted-foreground">
                      Campanha UTM: <span className="text-foreground">{meta.utm_campaign}</span>
                    </div>
                  )}
                </div>
              )}
              
              {!lead.source && !hasCampaignInfo && (
                <p className="text-xs text-muted-foreground">Sem informação de origem</p>
              )}
            </div>
          </section>

          <Separator />

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
