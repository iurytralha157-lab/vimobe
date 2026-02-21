import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DateFilterPopover } from '@/components/ui/date-filter-popover';
import { DatePreset } from '@/hooks/use-dashboard-filters';

interface MobileFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  selectedPipeline: string;
  setSelectedPipeline: (value: string) => void;
  selectedStage: string;
  setSelectedStage: (value: string) => void;
  selectedAssignee: string;
  setSelectedAssignee: (value: string) => void;
  selectedTag: string;
  setSelectedTag: (value: string) => void;
  selectedSource: string;
  setSelectedSource: (value: string) => void;
  datePreset: DatePreset;
  onDatePresetChange: (preset: DatePreset) => void;
  customDateRange: { from: Date; to: Date } | null;
  onCustomDateRangeChange: (range: { from: Date; to: Date } | null) => void;
  pipelines: { id: string; name: string }[];
  stages: { id: string; name: string }[];
  users: { id: string; name: string }[];
  tags: { id: string; name: string; color: string }[];
  hasActiveFilters: boolean;
  clearFilters: () => void;
  activeFilterCount: number;
}

export function MobileFilters({
  search,
  setSearch,
  selectedPipeline,
  setSelectedPipeline,
  selectedStage,
  setSelectedStage,
  selectedAssignee,
  setSelectedAssignee,
  selectedTag,
  setSelectedTag,
  selectedSource,
  setSelectedSource,
  datePreset,
  onDatePresetChange,
  customDateRange,
  onCustomDateRangeChange,
  pipelines,
  stages,
  users,
  tags,
  hasActiveFilters,
  clearFilters,
  activeFilterCount,
}: MobileFiltersProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex gap-2 w-full">
      {/* Search always visible */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter Sheet Trigger */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 relative">
            <Filter className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <Badge 
                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-auto max-h-[60vh] rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
          </SheetHeader>

          <div className="space-y-3 py-3 overflow-y-auto max-h-[calc(60vh-130px)]">
            {/* Pipeline */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Pipeline</label>
              <Select value={selectedPipeline} onValueChange={(v) => {
                setSelectedPipeline(v);
                setSelectedStage('all');
              }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas pipelines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas pipelines</SelectItem>
                  {pipelines.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stage */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Estágio</label>
              <Select value={selectedStage} onValueChange={setSelectedStage} disabled={selectedPipeline === 'all'}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos estágios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos estágios</SelectItem>
                  {stages.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignee */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Responsável</label>
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="unassigned">Sem responsável</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tag */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tag</label>
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas tags</SelectItem>
                  {tags.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                        {t.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Source */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Fonte</label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas fontes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas fontes</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="meta">Meta Ads</SelectItem>
                  <SelectItem value="site">Site</SelectItem>
                  <SelectItem value="wordpress">WordPress</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Período</label>
              <DateFilterPopover
                datePreset={datePreset}
                onDatePresetChange={onDatePresetChange}
                customDateRange={customDateRange}
                onCustomDateRangeChange={onCustomDateRangeChange}
                triggerClassName="w-full justify-start h-9"
                defaultPreset="last30days"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t">
            <Button
              variant="outline"
              className="w-[40%]"
              onClick={() => { clearFilters(); setOpen(false); }}
              disabled={!hasActiveFilters}
            >
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
            <Button className="w-[60%]" onClick={() => setOpen(false)}>
              Aplicar filtros
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
