import { useParams, Link, useLocation, useSearchParams } from "react-router-dom";
import { usePublicProperty } from "@/hooks/use-public-site";
import { MapPin, ArrowLeft, Building, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { usePublicContext } from "./usePublicContext";
import {
  PropertyGallery,
  PropertyFeatures,
  PropertyDetails,
  PropertyLocation,
  PropertyPricing,
  RelatedProperties,
} from "@/components/public/property-detail";

export default function PublicPropertyDetail() {
  // Support both old route (/imoveis/:codigo) and new route (/imovel/:code)
  const { codigo, code } = useParams<{ codigo?: string; code?: string }>();
  const propertyCode = code || codigo;
  
  const { organizationId, siteConfig } = usePublicContext();
  const { data: property, isLoading } = usePublicProperty(organizationId, propertyCode || null);
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Get base path for preview mode
  const isPreviewMode = location.pathname.includes('/site/preview');
  const orgParam = searchParams.get('org');
  
  const getHref = (path: string) => {
    if (isPreviewMode && orgParam) {
      return `/site/preview/${path}?org=${orgParam}`;
    }
    const siteMatch = location.pathname.match(/^\/sites\/([^/]+)/);
    if (siteMatch) {
      return `/sites/${siteMatch[1]}/${path}`;
    }
    return `/${path}`;
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: property?.titulo,
          text: `Confira este imóvel: ${property?.titulo}`,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado!');
    }
  };

  const primaryColor = siteConfig?.primary_color || '#F97316';
  const secondaryColor = siteConfig?.secondary_color || '#0D0D0D';
  const cardColor = siteConfig?.card_color || '#FFFFFF';
  const textColor = siteConfig?.text_color || '#FFFFFF';
  const backgroundColor = siteConfig?.background_color || '#0D0D0D';

  // Build all images array
  const allImages = property 
    ? [property.imagem_principal, ...(property.fotos || [])].filter(Boolean) as string[]
    : [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor }}>
        <div 
          className="animate-spin rounded-full h-12 w-12 border-b-2" 
          style={{ borderColor: primaryColor }}
        />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor }}>
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: `${textColor}10` }}>
          <Building className="w-12 h-12" style={{ color: `${textColor}40` }} />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: textColor }}>Imóvel não encontrado</h1>
        <p className="mb-6 text-center" style={{ color: textColor, opacity: 0.6 }}>O imóvel que você procura não está disponível.</p>
        <Link to={getHref("imoveis")}>
          <Button 
            className="rounded-full text-white"
            style={{ backgroundColor: primaryColor }}
          >
            Ver todos os imóveis
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor }}>
      {/* Gallery at Top - Full Width */}
      <PropertyGallery 
        images={allImages} 
        title={property.titulo} 
        primaryColor={primaryColor}
        videoUrl={(property as any).video_imovel}
        watermarkEnabled={siteConfig?.watermark_enabled || false}
        watermarkOpacity={siteConfig?.watermark_opacity || 20}
        watermarkUrl={siteConfig?.watermark_logo_url || siteConfig?.logo_url}
        watermarkSize={siteConfig?.watermark_size || 80}
        watermarkPosition={(siteConfig?.watermark_position as any) || 'bottom-right'}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Property Header */}
            <div className="rounded-2xl p-6 md:p-8" style={{ backgroundColor: cardColor, borderColor: `${textColor}15`, borderWidth: 1 }}>
              {/* Tags */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span 
                  className="px-4 py-1.5 text-sm font-semibold text-white rounded-full"
                  style={{ backgroundColor: primaryColor }}
                >
                  {property.tipo_imovel || (property as any).tipo_de_imovel}
                </span>
                <span className="px-4 py-1.5 text-sm font-medium rounded-full" style={{ backgroundColor: `${textColor}10`, color: textColor }}>
                  Cód: {property.codigo || (property as any).code}
                </span>
                {(property as any).tipo_de_negocio && (
                  <span className="px-4 py-1.5 text-sm font-medium rounded-full" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                    {(property as any).tipo_de_negocio}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: textColor }}>
                {property.titulo || (property as any).title}
              </h1>

              {/* Address */}
              <p className="flex items-center gap-2 text-lg" style={{ color: textColor, opacity: 0.6 }}>
                <MapPin className="w-5 h-5 flex-shrink-0" style={{ color: primaryColor }} />
                {[
                  property.endereco || (property as any).endereco,
                  (property as any).numero,
                  property.bairro || (property as any).bairro,
                  property.cidade || (property as any).cidade,
                  property.estado || (property as any).uf,
                ].filter(Boolean).join(', ')}
              </p>
            </div>

            {/* Features */}
            <div className="rounded-2xl p-6 md:p-8" style={{ backgroundColor: cardColor, borderColor: `${textColor}15`, borderWidth: 1 }}>
              <h2 className="text-xl font-bold mb-6" style={{ color: textColor }}>Características</h2>
              <PropertyFeatures
                quartos={property.quartos || (property as any).quartos}
                suites={property.suites || (property as any).suites}
                banheiros={property.banheiros || (property as any).banheiros}
                vagas={property.vagas || (property as any).vagas}
                areaUtil={(property as any).area_util}
                areaTotal={property.area_total || (property as any).area_total}
                andar={(property as any).andar}
                anoConstrucao={(property as any).ano_construcao}
                mobilia={(property as any).mobilia}
                regraPet={(property as any).regra_pet}
                primaryColor={primaryColor}
                textColor={textColor}
              />
            </div>

            {/* Description Section */}
            {(property.descricao || (property as any).descricao) && (
              <div className="rounded-2xl p-6 md:p-8" style={{ backgroundColor: cardColor, borderColor: `${textColor}15`, borderWidth: 1 }}>
                <h2 className="text-xl font-bold mb-4" style={{ color: textColor }}>Descrição</h2>
                <div className="prose max-w-none">
                  <p className="leading-relaxed whitespace-pre-line" style={{ color: textColor, opacity: 0.7 }}>
                    {property.descricao || (property as any).descricao}
                  </p>
                </div>
              </div>
            )}

            {/* Details (Extras, Nearby) */}
            <PropertyDetails
              descricao={null}
              detalhesExtras={(property as any).detalhes_extras}
              proximidades={(property as any).proximidades}
              primaryColor={primaryColor}
              cardColor={cardColor}
              textColor={textColor}
            />

            {/* Location Map */}
            <PropertyLocation
              latitude={(property as any).latitude}
              longitude={(property as any).longitude}
              endereco={property.endereco || (property as any).endereco}
              numero={(property as any).numero}
              complemento={(property as any).complemento}
              bairro={property.bairro || (property as any).bairro}
              cidade={property.cidade || (property as any).cidade}
              uf={property.estado || (property as any).uf}
              cep={property.cep || (property as any).cep}
              title={property.titulo || (property as any).title}
              primaryColor={primaryColor}
              cardColor={cardColor}
              textColor={textColor}
            />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <PropertyPricing
              preco={property.valor_venda || (property as any).preco}
              tipoNegocio={(property as any).tipo_de_negocio}
              condominio={(property as any).condominio}
              iptu={(property as any).iptu}
              seguroIncendio={(property as any).seguro_incendio}
              taxaServico={(property as any).taxa_de_servico}
              codigo={property.codigo || (property as any).code}
              titulo={property.titulo || (property as any).title}
              propertyId={property.id}
              organizationId={organizationId || ''}
              whatsappNumber={siteConfig?.whatsapp}
              phoneNumber={siteConfig?.phone}
              primaryColor={primaryColor}
              cardColor={cardColor}
              textColor={textColor}
            />
          </div>
        </div>

        {/* Related Properties */}
        <div className="mt-16">
          <RelatedProperties
            organizationId={organizationId || ''}
            currentPropertyCode={property.codigo || (property as any).code}
            tipoImovel={property.tipo_imovel || (property as any).tipo_de_imovel}
            cidade={property.cidade || (property as any).cidade}
            getHref={getHref}
            primaryColor={primaryColor}
            cardColor={siteConfig?.card_color}
            textColor={siteConfig?.text_color}
          />
        </div>
      </div>
    </div>
  );
}
