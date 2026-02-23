import { Link, useLocation, useNavigate } from "react-router-dom";
import { useFeaturedProperties, usePropertyTypes, usePublicProperties } from "@/hooks/use-public-site";
import { Search, Building, MapPin, ArrowRight, Bed, Bath, Car, Maximize, Heart, MessageCircle } from "lucide-react";
import { PublicPropertyCard } from "@/components/public/PublicPropertyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { usePublicContext } from "./usePublicContext";
import { usePublicFavorites } from "@/hooks/use-public-favorites";
import { cn } from "@/lib/utils";
import { ContactFormDialog } from "@/components/public/ContactFormDialog";
import { getPositionClasses, WatermarkPosition } from "@/lib/watermark-utils";

export default function PublicHome() {
  const { organizationId, siteConfig } = usePublicContext();
  const { isFavorite, toggleFavorite } = usePublicFavorites();
  const { data: featuredProperties = [] } = useFeaturedProperties(organizationId);
  const { data: allPropertiesData } = usePublicProperties(organizationId, { limit: 6 });
  const allProperties = allPropertiesData?.properties || [];
  const { data: propertyTypes = [] } = usePropertyTypes(organizationId);
  const navigate = useNavigate();
  const location = useLocation();

  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedFinalidade, setSelectedFinalidade] = useState("");
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);

  // Get colors from config with fallbacks
  const primaryColor = siteConfig?.primary_color || '#C4A052';
  const secondaryColor = siteConfig?.secondary_color || '#0D0D0D';
  const accentColor = siteConfig?.accent_color || '#3B82F6';
  const backgroundColor = siteConfig?.background_color || '#0D0D0D';
  const textColor = siteConfig?.text_color || '#FFFFFF';
  const isDarkTheme = siteConfig?.site_theme !== 'light';
  // Alternate section background
  const altBg = isDarkTheme ? 'rgba(255,255,255,0.03)' : '#F9FAFB';
  const sectionTextColor = isDarkTheme ? textColor : '#111827';
  const sectionSubTextColor = isDarkTheme ? `${textColor}99` : '#6B7280';

  const isPreviewMode = location.pathname.includes('/site/preview') || location.pathname.includes('/site/previsualização');
  const orgParam = new URLSearchParams(location.search).get('org');

  const getHref = (path: string) => {
    if (isPreviewMode && orgParam) {
      if (path.includes('?')) {
        return `/site/preview/${path}&org=${orgParam}`;
      }
      return `/site/preview/${path}?org=${orgParam}`;
    }
    const siteMatch = location.pathname.match(/^\/sites\/([^/]+)/);
    if (siteMatch) {
      return `/sites/${siteMatch[1]}/${path}`;
    }
    return `/${path}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (selectedType && selectedType !== "all") params.set("tipo", selectedType);
    if (selectedFinalidade && selectedFinalidade !== "all") params.set("finalidade", selectedFinalidade);
    
    if (isPreviewMode && orgParam) {
      params.set("org", orgParam);
      navigate(`/site/preview/imoveis?${params.toString()}`);
    } else {
      navigate(`/imoveis?${params.toString()}`);
    }
  };

  const formatPrice = (value: number | null) => {
    if (!value) return null;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  // Categories for accordion effect
  const categories = [
    { name: 'CASAS', type: 'Casa', image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop' },
    { name: 'APARTAMENTOS', type: 'Apartamento', image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop' },
    { name: 'COBERTURAS', type: 'Cobertura', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop' },
    { name: 'STUDIOS', type: 'Studio', image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop' },
  ];

  if (!siteConfig) {
    return null;
  }

  return (
    <div style={{ backgroundColor }}>
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
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-light mb-8 max-w-4xl leading-tight">
            {siteConfig.hero_title || 'Transformando seus sonhos em realidade!'}
          </h1>
          {siteConfig.hero_subtitle && (
            <p className="text-base md:text-lg text-white/70 mb-20 max-w-2xl">
              {siteConfig.hero_subtitle}
            </p>
          )}

          {/* Search Bar - Glassmorphism igual ao header */}
          <form 
            onSubmit={handleSearch} 
            className="bg-black/40 backdrop-blur-xl rounded-2xl p-4 md:p-5 flex flex-col md:flex-row flex-wrap gap-3 max-w-5xl w-full mx-4"
          >
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Digite condomínio, região, bairro ou cidade"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-48 h-12 bg-white/10 border-white/20 text-white rounded-xl">
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
              <SelectTrigger className="w-full md:w-40 h-12 bg-white/10 border-white/20 text-white rounded-xl">
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
              className="h-12 px-8 text-white font-medium rounded-xl"
              style={{ backgroundColor: primaryColor }}
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
        <section className="py-20" style={{ backgroundColor: altBg }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span 
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: accentColor }}
              >
                Exclusivos
              </span>
              <h2 className="text-3xl md:text-4xl font-light mt-2" style={{ color: sectionTextColor }}>
                Descubra Imóveis que Definem o Conceito de Luxo
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProperties.map((property) => (
                <Link key={property.id} to={getHref(`imovel/${property.codigo || (property as any).code}`)} className="block h-full">
                  <PublicPropertyCard
                    property={property}
                    primaryColor={primaryColor}
                    isFavorited={isFavorite(property.id)}
                    onToggleFavorite={toggleFavorite}
                    watermarkConfig={siteConfig?.watermark_enabled ? {
                      enabled: true,
                      logoUrl: siteConfig?.watermark_logo_url || siteConfig?.logo_url || undefined,
                      position: siteConfig?.watermark_position,
                      opacity: siteConfig?.watermark_opacity,
                      size: siteConfig?.watermark_size,
                    } : null}
                  />
                </Link>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link to={getHref("imoveis")}>
                <Button 
                  variant="outline" 
                  className="border-2 px-8 py-6 text-sm tracking-wider"
                  style={{ 
                    borderColor: primaryColor, 
                    color: primaryColor,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = primaryColor;
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = primaryColor;
                  }}
                >
                  VER TODOS OS IMÓVEIS
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* All Properties Section */}
      {allProperties.length > 0 && (
        <section className="py-20" style={{ backgroundColor: isDarkTheme ? backgroundColor : '#FFFFFF' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6 md:mb-12">
              <span 
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: accentColor }}
              >
                Nosso Portfólio
              </span>
              <h2 className="text-3xl md:text-4xl font-light mt-2" style={{ color: sectionTextColor }}>
                Todos os Imóveis Disponíveis
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {allProperties.map((property) => (
                <Link key={property.id} to={getHref(`imovel/${property.codigo || (property as any).code}`)} className="block h-full">
                  <PublicPropertyCard
                    property={property}
                    primaryColor={primaryColor}
                    isFavorited={isFavorite(property.id)}
                    onToggleFavorite={toggleFavorite}
                    watermarkConfig={siteConfig?.watermark_enabled ? {
                      enabled: true,
                      logoUrl: siteConfig?.watermark_logo_url || siteConfig?.logo_url || undefined,
                      position: siteConfig?.watermark_position,
                      opacity: siteConfig?.watermark_opacity,
                      size: siteConfig?.watermark_size,
                    } : null}
                  />
                </Link>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link to={getHref("imoveis")}>
                <Button 
                  variant="outline" 
                  className="border-2 px-8 py-6 text-sm tracking-wider"
                  style={{ 
                    borderColor: primaryColor, 
                    color: primaryColor,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = primaryColor;
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = primaryColor;
                  }}
                >
                  VER TODOS OS IMÓVEIS
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Category Accordion Section */}
      <section className="py-0" style={{ backgroundColor }}>
        {/* Mobile: Grid 2x2, Desktop: Flex accordion */}
        <div className="grid grid-cols-2 md:flex md:h-[500px] overflow-hidden">
          {categories.map((cat, idx) => (
            <Link
              key={cat.name}
              to={getHref(`imoveis?tipo=${encodeURIComponent(cat.type)}`)}
              onMouseEnter={() => setHoveredCategory(idx)}
              onMouseLeave={() => setHoveredCategory(null)}
              className={cn(
                "relative h-[180px] md:h-full overflow-hidden transition-all duration-500 ease-out cursor-pointer",
                // Desktop: accordion behavior
                "md:flex-1",
                hoveredCategory !== null && hoveredCategory === idx && "md:flex-[2]",
                hoveredCategory !== null && hoveredCategory !== idx && "md:flex-[0.6]"
              )}
            >
              <img
                src={cat.image}
                alt={cat.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500"
                style={{ transform: hoveredCategory === idx ? 'scale(1.1)' : 'scale(1)' }}
              />
              <div className="absolute inset-0 bg-black/40 md:hover:bg-black/30 transition-colors" />
              {/* Mobile: label at bottom center, Desktop: left center */}
              <div className="absolute inset-x-0 bottom-4 flex justify-center md:inset-x-auto md:bottom-auto md:left-0 md:top-1/2 md:-translate-y-1/2 md:block">
                <span className="bg-white text-gray-900 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-semibold tracking-wide">
                  {cat.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section 
        className="py-24 relative"
        style={{ backgroundColor: secondaryColor }}
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
              <Button 
                size="lg" 
                className="text-white px-8 py-6 text-base tracking-wide rounded-full"
                style={{ backgroundColor: primaryColor }}
              >
                Fale Conosco
              </Button>
            </Link>
            {siteConfig.whatsapp && organizationId && (
              <ContactFormDialog
                organizationId={organizationId}
                whatsappNumber={siteConfig.whatsapp}
                primaryColor={primaryColor}
                trigger={
                  <Button 
                    size="lg"
                    variant="outline"
                    className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white px-8 py-6 text-base tracking-wide rounded-full gap-2"
                  >
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp
                  </Button>
                }
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
