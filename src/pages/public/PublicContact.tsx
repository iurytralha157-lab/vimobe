import { usePublicSiteContext } from "@/contexts/PublicSiteContext";
import { submitContactForm } from "@/hooks/use-public-site";
import { Phone, Mail, MapPin, Instagram, Facebook, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";

export default function PublicContact() {
  const { organizationId, siteConfig } = usePublicSiteContext();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        message: formData.message || undefined,
      });
      toast.success('Mensagem enviada com sucesso! Entraremos em contato em breve.');
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      toast.error('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section 
        className="py-16 md:py-24 text-white"
        style={{ backgroundColor: siteConfig?.secondary_color }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Entre em Contato
          </h1>
          <p className="text-white/80 text-lg max-w-3xl">
            Estamos prontos para ajudá-lo a encontrar o imóvel perfeito. 
            Fale conosco!
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Contact Info */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Informações de Contato
              </h2>

              <div className="space-y-4">
                {siteConfig?.phone && (
                  <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${siteConfig?.primary_color}20` }}
                      >
                        <Phone 
                          className="w-5 h-5"
                          style={{ color: siteConfig?.primary_color }}
                        />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Telefone</p>
                        <a 
                          href={`tel:${siteConfig.phone}`}
                          className="font-medium text-gray-900 hover:underline"
                        >
                          {siteConfig.phone}
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {siteConfig?.whatsapp && (
                  <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">WhatsApp</p>
                        <a 
                          href={`https://wa.me/${siteConfig.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-gray-900 hover:underline"
                        >
                          {siteConfig.whatsapp}
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {siteConfig?.email && (
                  <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${siteConfig?.primary_color}20` }}
                      >
                        <Mail 
                          className="w-5 h-5"
                          style={{ color: siteConfig?.primary_color }}
                        />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">E-mail</p>
                        <a 
                          href={`mailto:${siteConfig.email}`}
                          className="font-medium text-gray-900 hover:underline"
                        >
                          {siteConfig.email}
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {siteConfig?.address && (
                  <Card>
                    <CardContent className="p-4 flex items-start gap-4">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${siteConfig?.primary_color}20` }}
                      >
                        <MapPin 
                          className="w-5 h-5"
                          style={{ color: siteConfig?.primary_color }}
                        />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Endereço</p>
                        <p className="font-medium text-gray-900">
                          {siteConfig.address}
                          {siteConfig.city && <><br />{siteConfig.city}</>}
                          {siteConfig.state && ` - ${siteConfig.state}`}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Social Links */}
              {(siteConfig?.instagram || siteConfig?.facebook) && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Redes Sociais</h3>
                  <div className="flex gap-3">
                    {siteConfig?.instagram && (
                      <a
                        href={siteConfig.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                      >
                        <Instagram className="w-5 h-5 text-pink-600" />
                      </a>
                    )}
                    {siteConfig?.facebook && (
                      <a
                        href={siteConfig.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                      >
                        <Facebook className="w-5 h-5 text-blue-600" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Envie sua mensagem
                  </h2>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome *
                        </label>
                        <Input
                          placeholder="Seu nome completo"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Telefone *
                        </label>
                        <Input
                          type="tel"
                          placeholder="(00) 00000-0000"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        E-mail
                      </label>
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mensagem
                      </label>
                      <Textarea
                        placeholder="Como podemos ajudá-lo?"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={5}
                      />
                    </div>

                    <Button 
                      type="submit"
                      size="lg"
                      className="w-full text-white"
                      style={{ backgroundColor: siteConfig?.primary_color }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Enviando...' : 'Enviar Mensagem'}
                    </Button>

                    <p className="text-sm text-gray-500 text-center">
                      Ao enviar, você concorda em receber contato da nossa equipe.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
