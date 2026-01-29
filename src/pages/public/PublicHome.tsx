import { Link, useLocation, useNavigate } from "react-router-dom";
import { useFeaturedProperties, usePropertyTypes } from "@/hooks/use-public-site";
import { Search, Building, MapPin, ArrowRight, Bed, Bath, Car, Maximize, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { usePublicContext } from "./usePublicContext";

export default function PublicHome() {
  const { organizationId, siteConfig } = usePublicContext();
  const { data: featuredProperties = [] } = useFeaturedProperties(organizationId);
  const { data: propertyTypes = [] } = usePropertyTypes(organizationId);
  const navigate = useNavigate();
  const location = useLocation();

  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedFinalidade, setSelectedFinalidade] = useState("");

  const getHref = (path: string) => {
    if (location.pathname.includes('/site/previsualização')) {
      return `/site/previsualização/${path}${location.search}`;
    }
    return `/${path}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (selectedType && selectedType !== "all") params.set("tipo", selectedType);
    if (selectedFinalidade && selectedFinalidade !== "all") params.set("finalidade", selectedFinalidade);
    
    const basePath = location.pathname.includes('/site/previsualização') 
      ? `/site/previsualização/imoveis${location.search}&${params.toString()}`
      : `/imoveis?${params.toString()}`;
    navigate(basePath);
  };

  const formatPrice = (value: number | null) => {
    if (!value) return null;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  if (!siteConfig) {
    return null;
  }

  return (
    <div className="bg-[#0D0D0D]">
      {/* Hero Section - Fullscreen */}
      <section className="relative h-screen">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: siteConfig.hero_image_url 
              ? `url(${siteConfig.hero_image_url})` 
              : `linear-gradient(135deg, #1a1a1a 0%, #0D0D0D 100%)`
          }}
        >
          <div className="absolute inset-0 bg-black/50" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-4 pt-20">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-light mb-4 max-w-4xl leading-tight">
            {siteConfig.hero_title || 'Transformando seus sonhos em realidade!'}
          </h1>
          {siteConfig.hero_subtitle && (
            <p className="text-lg md:text-xl text-white/70 mb-12 max-w-2xl">
              {siteConfig.hero_subtitle}
            </p>
          )}

          {/* Search Bar */}
          <form 
            onSubmit={handleSearch} 
            className="bg-black/60 backdrop-blur-md rounded-lg p-3 md:p-4 flex flex-col md:flex-row flex-wrap gap-3 max-w-5xl w-full mx-4"
          >
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Digite condomínio, região, bairro ou cidade"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-[#C4A052]"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-48 h-12 bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Tipo de Imóvel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {propertyTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedFinalidade} onValueChange={setSelectedFinalidade}>
              <SelectTrigger className="w-full md:w-40 h-12 bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Finalidade..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="venda">Venda</SelectItem>
                <SelectItem value="aluguel">Aluguel</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              type="submit" 
              className="h-12 px-8 bg-[#C4A052] hover:bg-[#B39042] text-white font-medium"
            >
              <Search className="w-5 h-5 mr-2" />
              Buscar Imóveis
            </Button>
          </form>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center pt-2">
            <div className="w-1 h-3 bg-white/50 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Featured Properties Section */}
      {featuredProperties.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="text-sm font-semibold uppercase tracking-wider text-[#C4A052]">
                Exclusivos
              </span>
              <h2 className="text-3xl md:text-4xl font-light text-gray-900 mt-2">
                Descubra Imóveis que Definem o Conceito de Luxo
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProperties.map((property) => (
                <Link key={property.id} to={getHref(`imoveis/${property.codigo}`)} className="group">
                  <div className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300">
                    <div className="relative h-72 overflow-hidden">
                      <img
                        src={property.imagem_principal || '/placeholder.svg'}
                        alt={property.titulo}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      
                      {/* Badge */}
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1.5 text-xs font-semibold bg-[#C4A052]/90 text-white rounded">
                          {property.valor_venda ? 'VENDA' : 'ALUGUEL'}
                        </span>
                      </div>
                      
                      {/* Favorite */}
                      <button className="absolute top-4 right-4 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors">
                        <Heart className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                    
                    <div className="p-5">
                      <p className="text-gray-500 text-sm flex items-center gap-1 mb-2">
                        <MapPin className="w-4 h-4" />
                        {property.bairro}{property.cidade ? `, ${property.cidade}` : ''}
                      </p>
                      
                      <h3 className="font-semibold text-lg text-gray-900 mb-4 line-clamp-1">
                        {property.titulo}
                      </h3>
                      
                      {/* Features */}
                      <div className="flex items-center gap-4 text-gray-600 text-sm mb-4 pb-4 border-b">
                        {property.quartos && (
                          <span className="flex items-center gap-1">
                            <Bed className="w-4 h-4" /> 
                            {property.quartos}
                          </span>
                        )}
                        {property.vagas && (
                          <span className="flex items-center gap-1">
                            <Car className="w-4 h-4" /> 
                            {property.vagas}
                          </span>
                        )}
                        {property.area_total && (
                          <span className="flex items-center gap-1">
                            <Maximize className="w-4 h-4" /> 
                            {property.area_total}m²
                          </span>
                        )}
                      </div>
                      
                      {/* Price */}
                      <div className="text-[#C4A052] font-bold text-xl">
                        {property.valor_venda && formatPrice(property.valor_venda)}
                        {property.valor_aluguel && !property.valor_venda && (
                          <>{formatPrice(property.valor_aluguel)}<span className="text-sm font-normal">/mês</span></>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link to={getHref("imoveis")}>
                <Button 
                  variant="outline" 
                  className="border-2 border-[#C4A052] text-[#C4A052] hover:bg-[#C4A052] hover:text-white px-8 py-6 text-sm tracking-wider"
                >
                  VER TODOS OS IMÓVEIS
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Property Types Grid */}
      {propertyTypes.length > 0 && (
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="text-sm font-semibold uppercase tracking-wider text-[#C4A052]">
                Categorias
              </span>
              <h2 className="text-3xl md:text-4xl font-light text-gray-900 mt-2">
                Buscar por Tipo de Imóvel
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {propertyTypes.slice(0, 8).map((type) => (
                <Link 
                  key={type} 
                  to={getHref(`imoveis?tipo=${encodeURIComponent(type)}`)}
                  className="group"
                >
                  <div className="bg-white rounded-lg p-8 text-center shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
                    <div className="w-16 h-16 bg-[#C4A052]/10 rounded-full mx-auto mb-4 flex items-center justify-center group-hover:bg-[#C4A052] transition-colors">
                      <Building className="w-8 h-8 text-[#C4A052] group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="font-semibold text-gray-900">{type}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section 
        className="py-24 relative"
        style={{ backgroundColor: '#0D0D0D' }}
      >
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-light mb-6">
            Não encontrou o que procura?
          </h2>
          <p className="text-white/60 text-lg mb-10 max-w-2xl mx-auto">
            Entre em contato conosco e nossa equipe especializada vai ajudar você a encontrar o imóvel ideal.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={getHref("contato")}>
              <Button className="bg-[#C4A052] hover:bg-[#B39042] text-white px-8 py-6 text-sm tracking-wider">
                FALE CONOSCO
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            {siteConfig.whatsapp && (
              <a
                href={`https://wa.me/${siteConfig.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button 
                  variant="outline"
                  className="border-2 border-white/30 text-white hover:bg-white/10 px-8 py-6 text-sm tracking-wider"
                >
                  WHATSAPP
                </Button>
              </a>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}