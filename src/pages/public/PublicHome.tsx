import { Link } from "react-router-dom";
import { usePublicSiteContext } from "@/contexts/PublicSiteContext";
import { useFeaturedProperties, usePropertyTypes } from "@/hooks/use-public-site";
import { Search, Home, Building, MapPin, ArrowRight, Bed, Bath, Car, Maximize, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function PublicHome() {
  const { organizationId, siteConfig } = usePublicSiteContext();
  const { data: featuredProperties = [] } = useFeaturedProperties(organizationId);
  const { data: propertyTypes = [] } = usePropertyTypes(organizationId);
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (selectedType && selectedType !== "all") params.set("tipo", selectedType);
    navigate(`/imoveis?${params.toString()}`);
  };

  const formatPrice = (value: number | null) => {
    if (!value) return null;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  return (
    <div>
      {/* Hero Section - Modern Style */}
      <section className="relative min-h-[600px] md:min-h-[700px] flex items-center">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: `linear-gradient(135deg, ${siteConfig?.secondary_color || '#1E293B'} 0%, ${siteConfig?.primary_color || '#F97316'}50 100%)`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"></div>
        </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Encontre o Imóvel<br />
              <span style={{ color: siteConfig?.primary_color }}>dos Seus Sonhos</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-10 max-w-xl">
              {siteConfig?.site_description || "Navegue por nossa seleção exclusiva de imóveis e encontre o lugar perfeito para você e sua família."}
            </p>

            {/* Search Form - Modern Card Style */}
            <form onSubmit={handleSearch} className="bg-white rounded-2xl p-4 md:p-6 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5">
                  <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                    Localização
                  </label>
                  <Input
                    placeholder="Buscar por bairro, cidade..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-12 border-gray-200 bg-gray-50 focus:bg-white"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                    Tipo de Imóvel
                  </label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="h-12 border-gray-200 bg-gray-50">
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
                <div className="md:col-span-3 flex items-end">
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                    style={{ backgroundColor: siteConfig?.primary_color }}
                  >
                    <Search className="w-5 h-5 mr-2" />
                    Buscar
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      {featuredProperties.length > 0 && (
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
              <div>
                <span 
                  className="text-sm font-semibold uppercase tracking-wider"
                  style={{ color: siteConfig?.primary_color }}
                >
                  Destaques
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">
                  Imóveis em Destaque
                </h2>
                <p className="text-gray-600 mt-2">Confira nossas melhores oportunidades</p>
              </div>
              <Link to="/imoveis">
                <Button 
                  variant="outline" 
                  className="rounded-full border-2 gap-2"
                  style={{ borderColor: siteConfig?.primary_color, color: siteConfig?.primary_color }}
                >
                  Ver todos os imóveis
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProperties.map((property) => (
                <Link key={property.id} to={`/imoveis/${property.codigo}`}>
                  <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group border-0 bg-white rounded-2xl">
                    <div className="relative h-64 overflow-hidden">
                      <img
                        src={property.imagem_principal || '/placeholder.svg'}
                        alt={property.titulo}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      
                      {/* Badges */}
                      <div className="absolute top-4 left-4 flex gap-2">
                        {property.destaque && (
                          <span 
                            className="px-3 py-1 text-xs font-bold text-white rounded-full shadow-lg"
                            style={{ backgroundColor: siteConfig?.primary_color }}
                          >
                            Destaque
                          </span>
                        )}
                      </div>
                      <span className="absolute top-4 right-4 px-3 py-1 text-xs font-semibold bg-white/95 text-gray-800 rounded-full shadow">
                        {property.tipo_imovel}
                      </span>

                      {/* Price on Image */}
                      <div className="absolute bottom-4 left-4 right-4">
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
                        {property.bairro}{property.cidade ? `, ${property.cidade}` : ''}
                      </p>
                      
                      {/* Features */}
                      <div className="flex items-center gap-4 text-gray-600 text-sm pt-4 border-t">
                        {property.quartos && (
                          <span className="flex items-center gap-1.5">
                            <Bed className="w-4 h-4" /> 
                            <span className="font-medium">{property.quartos}</span>
                            <span className="text-gray-400">Quartos</span>
                          </span>
                        )}
                        {property.banheiros && (
                          <span className="flex items-center gap-1.5">
                            <Bath className="w-4 h-4" /> 
                            <span className="font-medium">{property.banheiros}</span>
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
          </div>
        </section>
      )}

      {/* Property Types - Modern Grid */}
      {propertyTypes.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span 
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: siteConfig?.primary_color }}
              >
                Categorias
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">
                Buscar por Tipo
              </h2>
              <p className="text-gray-600 mt-2">Escolha o tipo de imóvel que você procura</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {propertyTypes.slice(0, 8).map((type, index) => (
                <Link 
                  key={type} 
                  to={`/imoveis?tipo=${encodeURIComponent(type)}`}
                  className="group"
                >
                  <div 
                    className="relative p-6 rounded-2xl text-center transition-all duration-300 hover:shadow-lg overflow-hidden"
                    style={{ 
                      backgroundColor: index % 2 === 0 ? `${siteConfig?.primary_color}10` : '#f8fafc'
                    }}
                  >
                    <div 
                      className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${siteConfig?.primary_color}20` }}
                    >
                      <Building 
                        className="w-7 h-7"
                        style={{ color: siteConfig?.primary_color }}
                      />
                    </div>
                    <span className="font-semibold text-gray-800 group-hover:text-gray-900">
                      {type}
                    </span>
                    <ChevronRight 
                      className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: siteConfig?.primary_color }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section - Modern Design */}
      <section className="py-20 relative overflow-hidden">
        <div 
          className="absolute inset-0"
          style={{ backgroundColor: siteConfig?.secondary_color }}
        >
          <div 
            className="absolute inset-0 opacity-10"
            style={{ 
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '40px 40px'
            }}
          ></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Não encontrou o que procura?
          </h2>
          <p className="text-white/80 text-lg mb-10 max-w-2xl mx-auto">
            Entre em contato conosco e nossa equipe especializada vai ajudar você a encontrar o imóvel ideal para suas necessidades.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contato">
              <Button 
                size="lg"
                className="text-white w-full sm:w-auto rounded-full px-8 shadow-lg hover:shadow-xl transition-all"
                style={{ backgroundColor: siteConfig?.primary_color }}
              >
                Fale Conosco
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            {siteConfig?.whatsapp && (
              <a
                href={`https://wa.me/${siteConfig.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white/10 w-full sm:w-auto rounded-full px-8"
                >
                  WhatsApp
                </Button>
              </a>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
