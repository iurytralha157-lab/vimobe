import { Link } from "react-router-dom";
import { usePublicSiteContext } from "@/contexts/PublicSiteContext";
import { useFeaturedProperties, usePropertyTypes } from "@/hooks/use-public-site";
import { Search, Home, Building, MapPin, ArrowRight, Bed, Bath, Car, Maximize } from "lucide-react";
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
    if (selectedType) params.set("tipo", selectedType);
    navigate(`/imoveis?${params.toString()}`);
  };

  const formatPrice = (value: number | null) => {
    if (!value) return null;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  return (
    <div>
      {/* Hero Section */}
      <section 
        className="relative py-20 md:py-32"
        style={{ 
          background: `linear-gradient(135deg, ${siteConfig?.secondary_color || '#1E293B'} 0%, ${siteConfig?.primary_color || '#F97316'}80 100%)` 
        }}
      >
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white mb-10">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              Encontre o Imóvel dos Seus Sonhos
            </h1>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
              {siteConfig?.site_description || "Navegue por nossa seleção de imóveis e encontre o lugar perfeito para você."}
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="bg-white rounded-2xl p-4 md:p-6 shadow-2xl max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Input
                  placeholder="Buscar por localização, bairro..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-12"
                />
              </div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Tipo de imóvel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {propertyTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                type="submit" 
                className="h-12 text-white"
                style={{ backgroundColor: siteConfig?.primary_color }}
              >
                <Search className="w-5 h-5 mr-2" />
                Buscar
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Featured Properties */}
      {featuredProperties.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Imóveis em Destaque
                </h2>
                <p className="text-gray-600 mt-1">Confira nossas melhores oportunidades</p>
              </div>
              <Link to="/imoveis">
                <Button variant="outline" className="hidden md:flex">
                  Ver todos
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProperties.map((property) => (
                <Link key={property.id} to={`/imoveis/${property.codigo}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
                    <div className="relative h-48 md:h-56 overflow-hidden">
                      <img
                        src={property.imagem_principal || '/placeholder.svg'}
                        alt={property.titulo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {property.destaque && (
                        <span 
                          className="absolute top-3 left-3 px-3 py-1 text-xs font-semibold text-white rounded-full"
                          style={{ backgroundColor: siteConfig?.primary_color }}
                        >
                          Destaque
                        </span>
                      )}
                      <span className="absolute top-3 right-3 px-3 py-1 text-xs font-semibold bg-white/90 text-gray-700 rounded-full">
                        {property.tipo_imovel}
                      </span>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg text-gray-900 line-clamp-1 mb-1">
                        {property.titulo}
                      </h3>
                      <p className="text-gray-500 text-sm flex items-center gap-1 mb-3">
                        <MapPin className="w-4 h-4" />
                        {property.bairro}{property.cidade ? `, ${property.cidade}` : ''}
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
                        {property.valor_aluguel && (
                          <span className="text-sm text-gray-500">
                            {formatPrice(property.valor_aluguel)}/mês
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            <div className="mt-8 text-center md:hidden">
              <Link to="/imoveis">
                <Button variant="outline">
                  Ver todos os imóveis
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Property Types */}
      {propertyTypes.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Buscar por Tipo
              </h2>
              <p className="text-gray-600 mt-1">Escolha o tipo de imóvel que você procura</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {propertyTypes.slice(0, 8).map((type) => (
                <Link 
                  key={type} 
                  to={`/imoveis?tipo=${encodeURIComponent(type)}`}
                  className="group"
                >
                  <div className="p-6 border rounded-xl text-center hover:border-orange-300 hover:bg-orange-50 transition-colors">
                    <Building 
                      className="w-10 h-10 mx-auto mb-3 text-gray-400 group-hover:text-orange-500 transition-colors"
                    />
                    <span className="font-medium text-gray-700 group-hover:text-orange-600">
                      {type}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section 
        className="py-16"
        style={{ backgroundColor: siteConfig?.secondary_color }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Não encontrou o que procura?
          </h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">
            Entre em contato conosco e nossa equipe vai ajudar você a encontrar o imóvel ideal.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contato">
              <Button 
                size="lg"
                className="text-white w-full sm:w-auto"
                style={{ backgroundColor: siteConfig?.primary_color }}
              >
                Fale Conosco
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
                  className="border-white text-white hover:bg-white/10 w-full sm:w-auto"
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
