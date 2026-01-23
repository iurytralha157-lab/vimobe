import { useParams, Link } from "react-router-dom";
import { usePublicSiteContext } from "@/contexts/PublicSiteContext";
import { usePublicProperty, submitContactForm } from "@/hooks/use-public-site";
import { MapPin, Bed, Bath, Car, Maximize, Phone, ArrowLeft, ChevronLeft, ChevronRight, Building, MessageCircle, Share2, Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";

export default function PublicPropertyDetail() {
  const { codigo } = useParams<{ codigo: string }>();
  const { organizationId, siteConfig } = usePublicSiteContext();
  const { data: property, isLoading } = usePublicProperty(organizationId, codigo || null);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: siteConfig?.primary_color }}></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
          <Building className="w-12 h-12 text-gray-300" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Imóvel não encontrado</h1>
        <p className="text-gray-600 mb-6 text-center">O imóvel que você procura não está disponível.</p>
        <Link to="/imoveis">
          <Button 
            className="rounded-full text-white"
            style={{ backgroundColor: siteConfig?.primary_color }}
          >
            Ver todos os imóveis
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/imoveis" className="text-gray-600 hover:text-gray-900 flex items-center gap-2 text-sm font-medium">
              <ArrowLeft className="w-4 h-4" />
              Voltar para imóveis
            </Link>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full"
                onClick={handleShare}
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            {allImages.length > 0 && (
              <div className="relative rounded-2xl overflow-hidden bg-gray-900">
                <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                  <DialogTrigger asChild>
                    <button className="w-full cursor-zoom-in">
                      <img
                        src={allImages[currentImageIndex] || '/placeholder.svg'}
                        alt={property.titulo}
                        className="w-full h-[350px] md:h-[450px] lg:h-[500px] object-contain"
                      />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0">
                    <button 
                      onClick={() => setLightboxOpen(false)}
                      className="absolute top-4 right-4 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"
                    >
                      <X className="w-6 h-6" />
                    </button>
                    <img
                      src={allImages[currentImageIndex] || '/placeholder.svg'}
                      alt={property.titulo}
                      className="w-full h-full object-contain"
                    />
                    {allImages.length > 1 && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); prevImage(); }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white"
                        >
                          <ChevronLeft className="w-8 h-8" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); nextImage(); }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white"
                        >
                          <ChevronRight className="w-8 h-8" />
                        </button>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
                
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
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-full text-white text-sm font-medium">
                      {currentImageIndex + 1} / {allImages.length}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {allImages.map((img, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                  index === currentImageIndex 
                    ? 'ring-2 ring-offset-2' 
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{ 
                  borderColor: index === currentImageIndex ? siteConfig?.primary_color : 'transparent',
                }}
              >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Property Info */}
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span 
                    className="px-4 py-1.5 text-sm font-semibold text-white rounded-full"
                    style={{ backgroundColor: siteConfig?.primary_color }}
                  >
                    {property.tipo_imovel}
                  </span>
                  <span className="px-4 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-full">
                    Cód: {property.codigo}
                  </span>
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                  {property.titulo}
                </h1>

                <p className="text-gray-500 flex items-center gap-2 mb-8 text-lg">
                  <MapPin className="w-5 h-5 flex-shrink-0" />
                  {[property.endereco, property.bairro, property.cidade, property.estado].filter(Boolean).join(', ')}
                </p>

                {/* Features Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {property.quartos && (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${siteConfig?.primary_color}15` }}
                      >
                        <Bed className="w-6 h-6" style={{ color: siteConfig?.primary_color }} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{property.quartos}</p>
                        <p className="text-sm text-gray-500">Quartos</p>
                      </div>
                    </div>
                  )}
                  {property.banheiros && (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${siteConfig?.primary_color}15` }}
                      >
                        <Bath className="w-6 h-6" style={{ color: siteConfig?.primary_color }} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{property.banheiros}</p>
                        <p className="text-sm text-gray-500">Banheiros</p>
                      </div>
                    </div>
                  )}
                  {property.vagas && (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${siteConfig?.primary_color}15` }}
                      >
                        <Car className="w-6 h-6" style={{ color: siteConfig?.primary_color }} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{property.vagas}</p>
                        <p className="text-sm text-gray-500">Vagas</p>
                      </div>
                    </div>
                  )}
                  {property.area_total && (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${siteConfig?.primary_color}15` }}
                      >
                        <Maximize className="w-6 h-6" style={{ color: siteConfig?.primary_color }} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{property.area_total}</p>
                        <p className="text-sm text-gray-500">m² Área</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                {property.descricao && (
                  <div>
                    <h2 className="text-xl font-bold mb-4">Descrição</h2>
                    <div className="text-gray-600 whitespace-pre-wrap leading-relaxed">
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
            <Card className="rounded-2xl border-0 shadow-sm sticky top-24">
              <CardContent className="p-6">
                {property.valor_venda && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-500 font-medium">Valor de Venda</p>
                    <p 
                      className="text-3xl md:text-4xl font-bold"
                      style={{ color: siteConfig?.primary_color }}
                    >
                      {formatPrice(property.valor_venda)}
                    </p>
                  </div>
                )}

                {property.valor_aluguel && (
                  <div className="mb-6">
                    <p className="text-sm text-gray-500 font-medium">Valor do Aluguel</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatPrice(property.valor_aluguel)}<span className="text-base font-normal text-gray-500">/mês</span>
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
                        className="w-full text-white rounded-xl h-12 text-base font-semibold gap-2 shadow-lg hover:shadow-xl transition-all"
                        style={{ backgroundColor: '#25D366' }}
                      >
                        <MessageCircle className="w-5 h-5" />
                        Chamar no WhatsApp
                      </Button>
                    </a>
                  )}
                  
                  {siteConfig?.phone && (
                    <a href={`tel:${siteConfig.phone}`} className="block">
                      <Button variant="outline" className="w-full rounded-xl h-12 gap-2">
                        <Phone className="w-5 h-5" />
                        {siteConfig.phone}
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contact Form */}
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Tenho Interesse</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    placeholder="Seu nome *"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="rounded-xl h-12"
                  />
                  <Input
                    type="tel"
                    placeholder="Seu telefone *"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="rounded-xl h-12"
                  />
                  <Input
                    type="email"
                    placeholder="Seu e-mail"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="rounded-xl h-12"
                  />
                  <Textarea
                    placeholder="Mensagem (opcional)"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={3}
                    className="rounded-xl resize-none"
                  />
                  <Button 
                    type="submit" 
                    className="w-full text-white rounded-xl h-12 font-semibold"
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

      {/* Mobile Fixed Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-40">
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          <div className="flex-1">
            {property.valor_venda && (
              <p 
                className="text-xl font-bold"
                style={{ color: siteConfig?.primary_color }}
              >
                {formatPrice(property.valor_venda)}
              </p>
            )}
            {property.valor_aluguel && !property.valor_venda && (
              <p 
                className="text-xl font-bold"
                style={{ color: siteConfig?.primary_color }}
              >
                {formatPrice(property.valor_aluguel)}/mês
              </p>
            )}
          </div>
          {siteConfig?.whatsapp && (
            <a
              href={`https://wa.me/${siteConfig.whatsapp.replace(/\D/g, '')}?text=Olá! Tenho interesse no imóvel ${property.codigo} - ${property.titulo}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button 
                className="text-white rounded-xl h-12 px-6 gap-2"
                style={{ backgroundColor: '#25D366' }}
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
