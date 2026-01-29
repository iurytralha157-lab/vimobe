import { Link, useLocation, useSearchParams } from "react-router-dom";
import { usePublicProperties, usePropertyTypes, usePublicCities } from "@/hooks/use-public-site";
import { Search, MapPin, Bed, Bath, Car, Maximize, X, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { usePublicContext } from "./usePublicContext";

export default function PublicProperties() {
  const { organizationId, siteConfig } = usePublicContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    tipo: searchParams.get('tipo') || '',
    cidade: searchParams.get('cidade') || '',
    quartos: searchParams.get('quartos') || '',
    minPrice: searchParams.get('min_price') || '',
    maxPrice: searchParams.get('max_price') || '',
    page: parseInt(searchParams.get('page') || '1'),
  });

  const { data, isLoading } = usePublicProperties(organizationId, {
    page: filters.page,
    limit: 12,
    search: filters.search,
    tipo: filters.tipo,
    cidade: filters.cidade,
    quartos: filters.quartos ? parseInt(filters.quartos) : undefined,
    minPrice: filters.minPrice ? parseFloat(filters.minPrice) : undefined,
    maxPrice: filters.maxPrice ? parseFloat(filters.maxPrice) : undefined,
  });

  const { data: propertyTypes = [] } = usePropertyTypes(organizationId);
  const { data: cities = [] } = usePublicCities(organizationId);

  // Get base path for preview mode
  const getHref = (path: string) => {
    if (location.pathname.includes('/site/previsualização')) {
      const orgParam = searchParams.get('org');
      return `/site/previsualização/${path}?org=${orgParam}`;
    }
    return `/${path}`;
  };

  // Update URL when filters change (only non-org params)
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    // Keep org param if it exists
    const orgParam = searchParams.get('org');
    
    if (filters.search) params.set('search', filters.search);
    else params.delete('search');
    if (filters.tipo) params.set('tipo', filters.tipo);
    else params.delete('tipo');
    if (filters.cidade) params.set('cidade', filters.cidade);
    else params.delete('cidade');
    if (filters.quartos) params.set('quartos', filters.quartos);
    else params.delete('quartos');
    if (filters.minPrice) params.set('min_price', filters.minPrice);
    else params.delete('min_price');
    if (filters.maxPrice) params.set('max_price', filters.maxPrice);
    else params.delete('max_price');
    if (filters.page > 1) params.set('page', String(filters.page));
    else params.delete('page');
    
    if (orgParam) params.set('org', orgParam);
    setSearchParams(params);
  }, [filters]);

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      tipo: '',
      cidade: '',
      quartos: '',
      minPrice: '',
      maxPrice: '',
      page: 1,
    });
  };

  const hasActiveFilters = filters.search || filters.tipo || filters.cidade || filters.quartos || filters.minPrice || filters.maxPrice;
  const activeFilterCount = [filters.search, filters.tipo, filters.cidade, filters.quartos, filters.minPrice, filters.maxPrice].filter(Boolean).length;

  const formatPrice = (value: number | null) => {
    if (!value) return null;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  if (!siteConfig) {
    return null;
  }

  const FiltersContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-semibold text-gray-700 mb-2 block">Buscar</label>
        <Input
          placeholder="Localização, bairro..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="rounded-xl"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-gray-700 mb-2 block">Tipo de Imóvel</label>
        <Select value={filters.tipo} onValueChange={(v) => updateFilter('tipo', v)}>
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
        <label className="text-sm font-semibold text-gray-700 mb-2 block">Cidade</label>
        <Select value={filters.cidade} onValueChange={(v) => updateFilter('cidade', v)}>
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
        <label className="text-sm font-semibold text-gray-700 mb-2 block">Quartos</label>
        <Select value={filters.quartos} onValueChange={(v) => updateFilter('quartos', v)}>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div 
        className="py-16 md:py-20 relative overflow-hidden"
        style={{ backgroundColor: siteConfig.secondary_color }}
      >
        <div 
          className="absolute inset-0 opacity-10"
          style={{ 
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}
        ></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3">Imóveis Disponíveis</h1>
          <p className="text-white/70 text-lg">
            {isLoading ? 'Carregando...' : `${data?.total || 0} imóveis encontrados`}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex gap-10">
          {/* Desktop Filters */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
              <h2 className="font-bold text-lg mb-6 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5" />
                Filtros
              </h2>
              <FiltersContent />
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Mobile Filters */}
            <div className="lg:hidden mb-6">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full rounded-xl justify-between h-12">
                    <span className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4" />
                      Filtros
                    </span>
                    {activeFilterCount > 0 && (
                      <Badge 
                        className="text-white"
                        style={{ backgroundColor: siteConfig.primary_color }}
                      >
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
                  <SheetHeader className="pb-4 border-b">
                    <SheetTitle className="text-left">Filtrar Imóveis</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 pb-20 overflow-auto">
                    <FiltersContent />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Active Filters Pills */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mb-6">
                {filters.search && (
                  <Badge variant="secondary" className="rounded-full px-3 py-1 gap-1">
                    "{filters.search}"
                    <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('search', '')} />
                  </Badge>
                )}
                {filters.tipo && (
                  <Badge variant="secondary" className="rounded-full px-3 py-1 gap-1">
                    {filters.tipo}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('tipo', '')} />
                  </Badge>
                )}
                {filters.cidade && (
                  <Badge variant="secondary" className="rounded-full px-3 py-1 gap-1">
                    {filters.cidade}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('cidade', '')} />
                  </Badge>
                )}
                {filters.quartos && (
                  <Badge variant="secondary" className="rounded-full px-3 py-1 gap-1">
                    {filters.quartos}+ quartos
                    <X className="w-3 h-3 cursor-pointer" onClick={() => updateFilter('quartos', '')} />
                  </Badge>
                )}
              </div>
            )}

            {/* Properties Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="overflow-hidden rounded-2xl border-0">
                    <div className="h-56 bg-gray-200 animate-pulse" />
                    <CardContent className="p-5">
                      <div className="h-6 bg-gray-200 rounded-lg animate-pulse mb-3" />
                      <div className="h-4 bg-gray-200 rounded-lg animate-pulse w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : data?.properties?.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-full bg-gray-100 mx-auto mb-6 flex items-center justify-center">
                  <Search className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-2xl font-bold text-gray-700 mb-3">
                  Nenhum imóvel encontrado
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Tente ajustar os filtros para encontrar mais opções disponíveis.
                </p>
                {hasActiveFilters && (
                  <Button 
                    variant="outline" 
                    onClick={clearFilters}
                    className="rounded-full"
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {data?.properties?.map((property) => (
                    <Link key={property.id} to={getHref(`imoveis/${property.codigo}`)}>
                      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group border-0 bg-white rounded-2xl h-full">
                        <div className="relative h-56 overflow-hidden">
                          <img
                            src={property.imagem_principal || '/placeholder.svg'}
                            alt={property.titulo}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                          <span className="absolute top-4 right-4 px-3 py-1 text-xs font-semibold bg-white/95 text-gray-800 rounded-full shadow">
                            {property.tipo_imovel}
                          </span>
                          
                          <div className="absolute bottom-4 left-4">
                            {property.valor_venda && (
                              <span className="text-2xl font-bold text-white drop-shadow-lg">
                                {formatPrice(property.valor_venda)}
                              </span>
                            )}
                            {property.valor_aluguel && !property.valor_venda && (
                              <span className="text-2xl font-bold text-white drop-shadow-lg">
                                {formatPrice(property.valor_aluguel)}/mês
                              </span>
                            )}
                          </div>
                        </div>
                        <CardContent className="p-5">
                          <h3 className="font-bold text-lg text-gray-900 line-clamp-1 mb-2 group-hover:text-orange-600 transition-colors">
                            {property.titulo}
                          </h3>
                          <p className="text-gray-500 text-sm flex items-center gap-1 mb-4">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">
                              {property.bairro}{property.cidade ? `, ${property.cidade}` : ''}
                            </span>
                          </p>
                          
                          <div className="flex items-center gap-4 text-gray-600 text-sm pt-4 border-t">
                            {property.quartos && (
                              <span className="flex items-center gap-1.5">
                                <Bed className="w-4 h-4" /> 
                                <span className="font-medium">{property.quartos}</span>
                              </span>
                            )}
                            {property.banheiros && (
                              <span className="flex items-center gap-1.5">
                                <Bath className="w-4 h-4" /> 
                                <span className="font-medium">{property.banheiros}</span>
                              </span>
                            )}
                            {property.vagas && (
                              <span className="flex items-center gap-1.5">
                                <Car className="w-4 h-4" /> 
                                <span className="font-medium">{property.vagas}</span>
                              </span>
                            )}
                            {property.area_total && (
                              <span className="flex items-center gap-1.5">
                                <Maximize className="w-4 h-4" /> 
                                <span className="font-medium">{property.area_total}m²</span>
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {data && data.totalPages > 1 && (
                  <div className="flex justify-center items-center gap-3 mt-12">
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full"
                      disabled={filters.page <= 1}
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                        let pageNum;
                        if (data.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (filters.page <= 3) {
                          pageNum = i + 1;
                        } else if (filters.page >= data.totalPages - 2) {
                          pageNum = data.totalPages - 4 + i;
                        } else {
                          pageNum = filters.page - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={filters.page === pageNum ? "default" : "ghost"}
                            size="icon"
                            className="rounded-full w-10 h-10"
                            style={filters.page === pageNum ? { backgroundColor: siteConfig.primary_color } : {}}
                            onClick={() => setFilters(prev => ({ ...prev, page: pageNum }))}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full"
                      disabled={filters.page >= data.totalPages}
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
