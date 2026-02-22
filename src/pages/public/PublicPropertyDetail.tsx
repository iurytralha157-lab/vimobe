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

  // Build all images array
  const allImages = property 
    ? [property.imagem_principal, ...(property.fotos || [])].filter(Boolean) as string[]
    : [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div 
          className="animate-spin rounded-full h-12 w-12 border-b-2" 
          style={{ borderColor: primaryColor }}
        />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50">
        <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
          <Building className="w-12 h-12 text-gray-300" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Imóvel não encontrado</h1>
        <p className="text-gray-600 mb-6 text-center">O imóvel que você procura não está disponível.</p>
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
    <div className="min-h-screen bg-gray-50">
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
            <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100">
              {/* Tags */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span 
                  className="px-4 py-1.5 text-sm font-semibold text-white rounded-full"
                  style={{ backgroundColor: primaryColor }}
                >
                  {property.tipo_imovel || (property as any).tipo_de_imovel}
                </span>
                <span className="px-4 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-full">
                  Cód: {property.codigo || (property as any).code}
                </span>
                {(property as any).tipo_de_negocio && (
                  <span className="px-4 py-1.5 text-sm font-medium bg-blue-100 text-blue-700 rounded-full">
                    {(property as any).tipo_de_negocio}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                {property.titulo || (property as any).title}
              </h1>

              {/* Address */}
              <p className="text-gray-500 flex items-center gap-2 text-lg">
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
            <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Características</h2>
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
              />
            </div>

            {/* Description Section */}
            {(property.descricao || (property as any).descricao) && (
              <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Descrição</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">
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
          />
        </div>
      </div>
    </div>
  );
}
