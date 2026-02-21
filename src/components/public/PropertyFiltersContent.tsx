import React from "react";
import { X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface FilterState {
  search: string;
  tipo: string;
  finalidade: string;
  cidade: string;
  quartos: string;
  suites: string;
  minPrice: string;
  maxPrice: string;
  banheiros: string;
  vagas: string;
  page: number;
}

interface PropertyFiltersContentProps {
  localSearch: string;
  setLocalSearch: (value: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  filters: FilterState;
  updateFilter: (key: string, value: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  cities: string[];
  propertyTypes: string[];
  showMoreFilters: boolean;
  setShowMoreFilters: (value: boolean) => void;
  onClose?: () => void;
}

const PropertyFiltersContent = React.memo(function PropertyFiltersContent({
  localSearch,
  setLocalSearch,
  searchInputRef,
  filters,
  updateFilter,
  clearFilters,
  hasActiveFilters,
  cities,
  propertyTypes,
  showMoreFilters,
  setShowMoreFilters,
  onClose,
}: PropertyFiltersContentProps) {
  return (
    <div className="space-y-6">
      {/* Basic Filters - Always visible */}
      <div>
        <label className="text-sm font-semibold text-gray-700 mb-2 block">Buscar</label>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Localização, bairro..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="flex h-10 w-full rounded-xl border-0 bg-muted px-4 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-gray-700 mb-2 block">Cidade</label>
        <Select value={filters.cidade} onValueChange={(v) => updateFilter('cidade', v === 'all' ? '' : v)}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Todas as cidades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as cidades</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-semibold text-gray-700 mb-2 block">Faixa de Preço</label>
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            placeholder="Mínimo"
            value={filters.minPrice}
            onChange={(e) => updateFilter('minPrice', e.target.value)}
            className="rounded-xl"
          />
          <Input
            type="number"
            placeholder="Máximo"
            value={filters.maxPrice}
            onChange={(e) => updateFilter('maxPrice', e.target.value)}
            className="rounded-xl"
          />
        </div>
      </div>

      {/* More Filters - Collapsible */}
      <Collapsible open={showMoreFilters} onOpenChange={setShowMoreFilters}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between px-0 hover:bg-transparent"
          >
            <span className="font-semibold text-gray-700">Mais Filtros</span>
            <ChevronDown className={`w-5 h-5 transition-transform ${showMoreFilters ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-6 pt-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Tipo de Imóvel</label>
            <Select value={filters.tipo} onValueChange={(v) => updateFilter('tipo', v === 'all' ? '' : v)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {propertyTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Finalidade</label>
            <Select value={filters.finalidade} onValueChange={(v) => updateFilter('finalidade', v === 'all' ? '' : v)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="venda">Venda</SelectItem>
                <SelectItem value="aluguel">Aluguel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Quartos</label>
            <Select value={filters.quartos} onValueChange={(v) => updateFilter('quartos', v === 'any' ? '' : v)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Qualquer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Qualquer</SelectItem>
                <SelectItem value="1">1+ quarto</SelectItem>
                <SelectItem value="2">2+ quartos</SelectItem>
                <SelectItem value="3">3+ quartos</SelectItem>
                <SelectItem value="4">4+ quartos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Suítes</label>
            <Select value={filters.suites} onValueChange={(v) => updateFilter('suites', v === 'any' ? '' : v)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Qualquer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Qualquer</SelectItem>
                <SelectItem value="1">1+ suíte</SelectItem>
                <SelectItem value="2">2+ suítes</SelectItem>
                <SelectItem value="3">3+ suítes</SelectItem>
                <SelectItem value="4">4+ suítes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Banheiros</label>
            <Select value={filters.banheiros} onValueChange={(v) => updateFilter('banheiros', v === 'any' ? '' : v)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Qualquer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Qualquer</SelectItem>
                <SelectItem value="1">1+ banheiro</SelectItem>
                <SelectItem value="2">2+ banheiros</SelectItem>
                <SelectItem value="3">3+ banheiros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Vagas</label>
            <Select value={filters.vagas} onValueChange={(v) => updateFilter('vagas', v === 'any' ? '' : v)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Qualquer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Qualquer</SelectItem>
                <SelectItem value="1">1+ vaga</SelectItem>
                <SelectItem value="2">2+ vagas</SelectItem>
                <SelectItem value="3">3+ vagas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {hasActiveFilters && (
        <Button 
          variant="outline" 
          className="w-full rounded-xl" 
          onClick={() => {
            clearFilters();
            onClose?.();
          }}
        >
          <X className="w-4 h-4 mr-2" />
          Limpar todos os filtros
        </Button>
      )}
    </div>
  );
});

export default PropertyFiltersContent;
