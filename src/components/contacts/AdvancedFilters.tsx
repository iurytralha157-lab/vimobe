import { Filter, Users, Tag as TagIcon, Globe, CircleDot, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AdvancedFiltersProps {
  selectedAssignee: string;
  setSelectedAssignee: (value: string) => void;
  users: any[];
  selectedTag: string;
  setSelectedTag: (value: string) => void;
  tags: any[];
  selectedSource: string;
  setSelectedSource: (value: string) => void;
  selectedDealStatus: string;
  setSelectedDealStatus: (value: string) => void;
  activeCount: number;
}

export function AdvancedFilters({
  selectedAssignee,
  setSelectedAssignee,
  users,
  selectedTag,
  setSelectedTag,
  tags,
  selectedSource,
  setSelectedSource,
  selectedDealStatus,
  setSelectedDealStatus,
  activeCount,
}: AdvancedFiltersProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 gap-2 text-sm",
            activeCount > 0 && "border-primary text-primary"
          )}
        >
          <Filter className="h-4 w-4" />
          <span>Filtros</span>
          {activeCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 h-5 px-1.5 min-w-[20px] bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {activeCount}
            </Badge>
          )}
          <ChevronDown className="h-4 w-4 ml-1 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-3 w-3" /> Responsável
            </label>
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Responsável" />
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

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <TagIcon className="h-3 w-3" /> Marcador (Tag)
            </label>
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tag" />
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

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Globe className="h-3 w-3" /> Origem / Fonte
            </label>
            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Fonte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas fontes</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="meta">Meta Ads</SelectItem>
                <SelectItem value="site">Site</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <CircleDot className="h-3 w-3" /> Status do Negócio
            </label>
            <Select value={selectedDealStatus} onValueChange={setSelectedDealStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="open">Aberto</SelectItem>
                <SelectItem value="won">Ganho</SelectItem>
                <SelectItem value="lost">Perdido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
