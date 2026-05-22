import React, { useMemo } from 'react';
import { 
  Users, 
  User, 
  Globe, 
  Facebook, 
  Tags, 
  CircleDot, 
  X, 
  SlidersHorizontal,
  Search,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CampaignFilter } from '@/components/dashboard/CampaignFilter';

export interface AdvancedFiltersPopoverProps {
  // Visibilidade dos filtros
  showSearch?: boolean;
  showResponsible?: boolean;
  showTags?: boolean;
  showStatus?: boolean;
  showSource?: boolean;
  showMetaAds?: boolean;

  // Valores atuais
  search?: string;
  responsibleId?: string | null;
  tagId?: string | null;
  status?: string | null;
  source?: string | null;
  campaignId?: string | null;
  adSetId?: string | null;
  adId?: string | null;

  // Opções
  users?: { id: string; name: string }[];
  allTags?: { id: string; name: string; color: string }[];
  allSources?: string[];
  statusOptions?: { value: string; label: string }[];

  // Callbacks
  onSearchChange?: (value: string) => void;
  onResponsibleChange?: (id: string | null) => void;
  onTagChange?: (id: string | null) => void;
  onStatusChange?: (status: string | null) => void;
  onSourceChange?: (source: string | null) => void;
  onCampaignChange?: (id: string | null) => void;
  onAdSetChange?: (id: string | null) => void;
  onAdChange?: (id: string | null) => void;
  onClear: () => void;

  // UI
  align?: 'start' | 'center' | 'end';
  triggerClassName?: string;
  isMobile?: boolean;
}

export function AdvancedFiltersPopover({
  showSearch = true,
  showResponsible = true,
  showTags = true,
  showStatus = true,
  showSource = true,
  showMetaAds = true,

  search,
  responsibleId,
  tagId,
  status,
  source,
  campaignId,
  adSetId,
  adId,

  users = [],
  allTags = [],
  allSources = [],
  statusOptions = [
    { value: 'open', label: 'Aberto' },
    { value: 'won', label: 'Ganho' },
    { value: 'lost', label: 'Perdido' },
  ],

  onSearchChange,
  onResponsibleChange,
  onTagChange,
  onStatusChange,
  onSourceChange,
  onCampaignChange,
  onAdSetChange,
  onAdChange,
  onClear,

  align = 'end',
  triggerClassName,
  isMobile = false,
}: AdvancedFiltersPopoverProps) {
  const hasExtraFilters = useMemo(() => {
    const hasSearch = !!(showSearch && search && search.trim() !== '');
    return (responsibleId && responsibleId !== 'all') || 
           (tagId && tagId !== 'all') || 
           (status && status !== 'all') || 
           (source && source !== 'all') || 
           (campaignId && campaignId !== 'all') || 
           (adSetId && adSetId !== 'all') || 
           (adId && adId !== 'all') || 
           hasSearch;
  }, [responsibleId, tagId, status, source, campaignId, adSetId, adId, search, showSearch]);

  const activeCount = useMemo(() => {
    let count = 0;
    if (responsibleId && responsibleId !== 'all') count++;
    if (tagId && tagId !== 'all') count++;
    if (status && status !== 'all') count++;
    if (source && source !== 'all') count++;
    if (campaignId && campaignId !== 'all') count++;
    if (adSetId && adSetId !== 'all') count++;
    if (adId && adId !== 'all') count++;
    // Só conta busca no contador se ela for o filtro principal do popover (mobile)
    if (showSearch && isMobile && search && search.trim() !== '') count++;
    return count;
  }, [responsibleId, tagId, status, source, campaignId, adSetId, adId, search, showSearch, isMobile]);

  const filterContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Filtros Avançados</span>
        {hasExtraFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClear} 
            className="h-5 px-1.5 text-[9px] uppercase font-bold text-primary hover:bg-primary/10"
          >
            Limpar
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {showSearch && isMobile && (
          <div className="space-y-1.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="h-9 pl-9 text-xs bg-muted/30 border-border/40"
              />
            </div>
          </div>
        )}

        {showResponsible && (
          <div className="space-y-1">
            <Select 
              value={responsibleId || 'all'} 
              onValueChange={(val) => onResponsibleChange?.(val === 'all' ? null : val)}
            >
              <SelectTrigger className="h-9 text-xs bg-muted/30 border-border/40">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Responsável" />
                </div>
              </SelectTrigger>
              <SelectContent className="z-[110]">
                <SelectItem value="all">Todos responsáveis</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showTags && (
          <div className="space-y-1">
            <Select 
              value={tagId || 'all'} 
              onValueChange={(val) => onTagChange?.(val === 'all' ? null : val)}
            >
              <SelectTrigger className="h-9 text-xs bg-muted/30 border-border/40">
                <div className="flex items-center gap-2">
                  <Tags className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Etiqueta" />
                </div>
              </SelectTrigger>
              <SelectContent className="z-[110]">
                <SelectItem value="all">Todas etiquetas</SelectItem>
                {allTags.map(tag => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                      {tag.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showStatus && (
          <div className="space-y-1">
            <Select 
              value={status || 'all'} 
              onValueChange={(val) => onStatusChange?.(val === 'all' ? null : val)}
            >
              <SelectTrigger className="h-9 text-xs bg-muted/30 border-border/40">
                <div className="flex items-center gap-2">
                  <CircleDot className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Status" />
                </div>
              </SelectTrigger>
              <SelectContent className="z-[110]">
                <SelectItem value="all">Status (Todos)</SelectItem>
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showSource && (
          <div className="space-y-1 pt-2 border-t border-border/40">
            <Select 
              value={source || 'all'} 
              onValueChange={(val) => onSourceChange?.(val === 'all' ? null : val)}
            >
              <SelectTrigger className="h-9 text-xs bg-muted/30 border-border/40">
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Origem" />
                </div>
              </SelectTrigger>
              <SelectContent className="z-[110]">
                <SelectItem value="all">Origem (Todas)</SelectItem>
                {allSources.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showMetaAds && (
          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex items-center gap-1.5 px-1 mb-1">
              <Facebook className="h-3 w-3 text-[#1877F2]" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Campanhas Meta</span>
            </div>
            <CampaignFilter 
              campaignId={campaignId}
              onCampaignChange={onCampaignChange || (() => {})}
              adSetId={adSetId}
              onAdSetChange={onAdSetChange || (() => {})}
              adId={adId}
              onAdChange={onAdChange || (() => {})}
              fullWidth
              hideTitles
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size={isMobile ? "icon" : "sm"} 
          className={cn(
            isMobile ? "h-9 w-9 border-border/60 relative" : "h-8 gap-2 text-[11px] font-semibold uppercase tracking-wider px-3 border-border/60 hover:border-primary/50 transition-colors",
            hasExtraFilters && "border-primary/50 bg-primary/5 text-primary",
            triggerClassName
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {!isMobile && <span>Filtros</span>}
          {hasExtraFilters && (
            <Badge 
              variant="default" 
              className={cn(
                "bg-primary flex items-center justify-center",
                isMobile ? "absolute top-1 right-1 w-2 h-2 p-0 rounded-full" : "ml-1 h-4 min-w-[16px] px-1 text-[9px]"
              )}
            >
              {isMobile ? "" : activeCount || "!"}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className={cn("w-72 p-4 z-[100] shadow-2xl border-border/40", isMobile && "w-[300px] max-h-[80vh] overflow-y-auto")}>
        {filterContent}
      </PopoverContent>
    </Popover>
  );
}
