import { useParams, Link } from "react-router-dom";
import { usePublicSiteContext } from "@/contexts/PublicSiteContext";
import { usePublicProperty, submitContactForm } from "@/hooks/use-public-site";
import { MapPin, Bed, Bath, Car, Maximize, Phone, Mail, ArrowLeft, ChevronLeft, ChevronRight, Check, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";

export default function PublicPropertyDetail() {
  const { codigo } = useParams<{ codigo: string }>();
  const { organizationId, siteConfig } = usePublicSiteContext();
  const { data: property, isLoading } = usePublicProperty(organizationId, codigo || null);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allImages = property ? [property.imagem_principal, ...(property.fotos || [])].filter(Boolean) : [];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !formData.name || !formData.phone) {
      toast.error('Preencha nome e telefone');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitContactForm({
        organization_id: organizationId,
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone,
        message: formData.message || `Interesse no imóvel ${codigo}`,
        property_id: property?.id,
        property_code: codigo,
      });
      toast.success('Mensagem enviada! Entraremos em contato em breve.');
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      toast.error('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (value: number | null) => {
    if (!value) return null;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Building className="w-16 h-16 text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Imóvel não encontrado</h1>
        <p className="text-gray-600 mb-4">O imóvel que você procura não está disponível.</p>
        <Link to="/imoveis">
          <Button>Ver todos os imóveis</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/imoveis" className="text-gray-600 hover:text-gray-900 flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Voltar para imóveis
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            {allImages.length > 0 && (
              <div className="relative bg-black rounded-xl overflow-hidden">
                <img
                  src={allImages[currentImageIndex] || '/placeholder.svg'}
                  alt={property.titulo}
                  className="w-full h-[300px] md:h-[400px] lg:h-[500px] object-contain"
                />
                
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full text-white text-sm">
                      {currentImageIndex + 1} / {allImages.length}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      index === currentImageIndex ? 'border-orange-500' : 'border-transparent'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Property Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span 
                    className="px-3 py-1 text-sm font-medium text-white rounded-full"
                    style={{ backgroundColor: siteConfig?.primary_color }}
                  >
                    {property.tipo_imovel}
                  </span>
                  <span className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-700 rounded-full">
                    Cód: {property.codigo}
                  </span>
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  {property.titulo}
                </h1>

                <p className="text-gray-500 flex items-center gap-2 mb-6">
                  <MapPin className="w-5 h-5" />
                  {[property.endereco, property.bairro, property.cidade, property.estado].filter(Boolean).join(', ')}
                </p>

                {/* Features Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {property.quartos && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      <Bed className="w-6 h-6 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Quartos</p>
                        <p className="font-semibold">{property.quartos}</p>
                      </div>
                    </div>
                  )}
                  {property.banheiros && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      <Bath className="w-6 h-6 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Banheiros</p>
                        <p className="font-semibold">{property.banheiros}</p>
                      </div>
                    </div>
                  )}
                  {property.vagas && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      <Car className="w-6 h-6 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Vagas</p>
                        <p className="font-semibold">{property.vagas}</p>
                      </div>
                    </div>
                  )}
                  {property.area_total && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      <Maximize className="w-6 h-6 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Área</p>
                        <p className="font-semibold">{property.area_total} m²</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                {property.descricao && (
                  <div>
                    <h2 className="text-lg font-semibold mb-3">Descrição</h2>
                    <div className="text-gray-600 whitespace-pre-wrap">
                      {property.descricao}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price Card */}
            <Card className="sticky top-24">
              <CardContent className="p-6">
                {property.valor_venda && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500">Valor de Venda</p>
                    <p 
                      className="text-3xl font-bold"
                      style={{ color: siteConfig?.primary_color }}
                    >
                      {formatPrice(property.valor_venda)}
                    </p>
                  </div>
                )}

                {property.valor_aluguel && (
                  <div className="mb-6">
                    <p className="text-sm text-gray-500">Valor do Aluguel</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatPrice(property.valor_aluguel)}/mês
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  {siteConfig?.whatsapp && (
                    <a
                      href={`https://wa.me/${siteConfig.whatsapp.replace(/\D/g, '')}?text=Olá! Tenho interesse no imóvel ${property.codigo} - ${property.titulo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button 
                        className="w-full text-white"
                        style={{ backgroundColor: '#25D366' }}
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        WhatsApp
                      </Button>
                    </a>
                  )}
                  
                  {siteConfig?.phone && (
                    <a href={`tel:${siteConfig.phone}`}>
                      <Button variant="outline" className="w-full">
                        <Phone className="w-4 h-4 mr-2" />
                        {siteConfig.phone}
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contact Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tenho Interesse</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    placeholder="Seu nome *"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  <Input
                    type="tel"
                    placeholder="Seu telefone *"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                  <Input
                    type="email"
                    placeholder="Seu e-mail"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  <Textarea
                    placeholder="Mensagem (opcional)"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={3}
                  />
                  <Button 
                    type="submit" 
                    className="w-full text-white"
                    style={{ backgroundColor: siteConfig?.primary_color }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Enviando...' : 'Enviar Mensagem'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
