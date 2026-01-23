import { usePublicSiteContext } from "@/contexts/PublicSiteContext";
import { usePublicProperties, usePropertyTypes, usePublicCities } from "@/hooks/use-public-site";
import { Link, useSearchParams } from "react-router-dom";
import { Search, MapPin, Bed, Bath, Car, Maximize, Filter, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";

export default function PublicProperties() {
  const { organizationId, siteConfig } = usePublicSiteContext();
  const [searchParams, setSearchParams] = useSearchParams();
  
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

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.tipo) params.set('tipo', filters.tipo);
    if (filters.cidade) params.set('cidade', filters.cidade);
    if (filters.quartos) params.set('quartos', filters.quartos);
    if (filters.minPrice) params.set('min_price', filters.minPrice);
    if (filters.maxPrice) params.set('max_price', filters.maxPrice);
    if (filters.page > 1) params.set('page', String(filters.page));
    setSearchParams(params);
  }, [filters, setSearchParams]);

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

  const formatPrice = (value: number | null) => {
    if (!value) return null;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  const FiltersContent = () => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Buscar</label>
        <Input
          placeholder="Localização, bairro..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo</label>
        <Select value={filters.tipo} onValueChange={(v) => updateFilter('tipo', v)}>
          <SelectTrigger>
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
        <label className="text-sm font-medium text-gray-700 mb-1 block">Cidade</label>
        <Select value={filters.cidade} onValueChange={(v) => updateFilter('cidade', v)}>
          <SelectTrigger>
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
        <label className="text-sm font-medium text-gray-700 mb-1 block">Quartos</label>
        <Select value={filters.quartos} onValueChange={(v) => updateFilter('quartos', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Qualquer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Qualquer</SelectItem>
            <SelectItem value="1">1+</SelectItem>
            <SelectItem value="2">2+</SelectItem>
            <SelectItem value="3">3+</SelectItem>
            <SelectItem value="4">4+</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Preço Mín.</label>
          <Input
            type="number"
            placeholder="R$ 0"
            value={filters.minPrice}
            onChange={(e) => updateFilter('minPrice', e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Preço Máx.</label>
          <Input
            type="number"
            placeholder="Sem limite"
            value={filters.maxPrice}
            onChange={(e) => updateFilter('maxPrice', e.target.value)}
          />
        </div>
      </div>

      {hasActiveFilters && (
        <Button variant="outline" className="w-full" onClick={clearFilters}>
          <X className="w-4 h-4 mr-2" />
          Limpar filtros
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div 
        className="py-12 text-white"
        style={{ backgroundColor: siteConfig?.secondary_color }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-2">Imóveis Disponíveis</h1>
          <p className="text-white/80">
            {data?.total ? `${data.total} imóveis encontrados` : 'Carregando...'}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Desktop Filters */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-xl p-6 shadow-sm sticky top-24">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtros
              </h2>
              <FiltersContent />
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Mobile Filters */}
            <div className="lg:hidden mb-6 flex gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    <Filter className="w-4 h-4 mr-2" />
                    Filtros
                    {hasActiveFilters && (
                      <span 
                        className="ml-2 w-5 h-5 rounded-full text-xs flex items-center justify-center text-white"
                        style={{ backgroundColor: siteConfig?.primary_color }}
                      >
                        !
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle>Filtros</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FiltersContent />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Properties Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <div className="h-48 bg-gray-200 animate-pulse" />
                    <CardContent className="p-4">
                      <div className="h-6 bg-gray-200 rounded animate-pulse mb-2" />
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : data?.properties?.length === 0 ? (
              <div className="text-center py-16">
                <Search className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Nenhum imóvel encontrado
                </h3>
                <p className="text-gray-500 mb-4">
                  Tente ajustar os filtros para encontrar mais opções.
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {data?.properties?.map((property) => (
                    <Link key={property.id} to={`/imoveis/${property.codigo}`}>
                      <Card className="overflow-hidden hover:shadow-lg transition-shadow group h-full">
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={property.imagem_principal || '/placeholder.svg'}
                            alt={property.titulo}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute top-3 right-3 px-3 py-1 text-xs font-semibold bg-white/90 text-gray-700 rounded-full">
                            {property.tipo_imovel}
                          </span>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-lg text-gray-900 line-clamp-1 mb-1">
                            {property.titulo}
                          </h3>
                          <p className="text-gray-500 text-sm flex items-center gap-1 mb-3">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">
                              {property.bairro}{property.cidade ? `, ${property.cidade}` : ''}
                            </span>
                          </p>
                          
                          <div className="flex items-center gap-4 text-gray-600 text-sm mb-3">
                            {property.quartos && (
                              <span className="flex items-center gap-1">
                                <Bed className="w-4 h-4" /> {property.quartos}
                              </span>
                            )}
                            {property.banheiros && (
                              <span className="flex items-center gap-1">
                                <Bath className="w-4 h-4" /> {property.banheiros}
                              </span>
                            )}
                            {property.vagas && (
                              <span className="flex items-center gap-1">
                                <Car className="w-4 h-4" /> {property.vagas}
                              </span>
                            )}
                            {property.area_total && (
                              <span className="flex items-center gap-1">
                                <Maximize className="w-4 h-4" /> {property.area_total}m²
                              </span>
                            )}
                          </div>

                          <div className="flex items-baseline gap-2">
                            {property.valor_venda && (
                              <span 
                                className="text-xl font-bold"
                                style={{ color: siteConfig?.primary_color }}
                              >
                                {formatPrice(property.valor_venda)}
                              </span>
                            )}
                            {property.valor_aluguel && !property.valor_venda && (
                              <span 
                                className="text-xl font-bold"
                                style={{ color: siteConfig?.primary_color }}
                              >
                                {formatPrice(property.valor_aluguel)}/mês
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
                  <div className="flex justify-center items-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={filters.page <= 1}
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    
                    <span className="px-4 py-2 text-sm text-gray-600">
                      Página {filters.page} de {data.totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={filters.page >= data.totalPages}
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                      <ChevronRight className="w-4 h-4" />
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
