import { submitContactForm } from "@/hooks/use-public-site";
import { Phone, Mail, MapPin, Instagram, Facebook, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";

// Try to import from PreviewSiteWrapper context first (for preview mode)
let usePublicSiteContext: () => { organizationId: string | null; siteConfig: any; isLoading: boolean; error: string | null };
try {
  const previewContext = require('./PreviewSiteWrapper');
  usePublicSiteContext = previewContext.usePreviewSiteContext;
} catch {
  const publicContext = require('@/contexts/PublicSiteContext');
  usePublicSiteContext = publicContext.usePublicSiteContext;
}

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

  const contactItems = [
    {
      icon: Phone,
      label: "Telefone",
      value: siteConfig?.phone,
      href: siteConfig?.phone ? `tel:${siteConfig.phone}` : undefined,
      color: siteConfig?.primary_color,
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: siteConfig?.whatsapp,
      href: siteConfig?.whatsapp ? `https://wa.me/${siteConfig.whatsapp.replace(/\D/g, '')}` : undefined,
      color: '#25D366',
      external: true,
    },
    {
      icon: Mail,
      label: "E-mail",
      value: siteConfig?.email,
      href: siteConfig?.email ? `mailto:${siteConfig.email}` : undefined,
      color: siteConfig?.primary_color,
    },
    {
      icon: MapPin,
      label: "Endereço",
      value: siteConfig?.address ? `${siteConfig.address}${siteConfig.city ? `, ${siteConfig.city}` : ''}${siteConfig.state ? ` - ${siteConfig.state}` : ''}` : undefined,
      color: siteConfig?.primary_color,
    },
  ].filter(item => item.value);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section 
        className="py-20 md:py-28 relative overflow-hidden"
        style={{ backgroundColor: siteConfig?.secondary_color }}
      >
        <div 
          className="absolute inset-0 opacity-10"
          style={{ 
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}
        ></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white">
          <span 
            className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-6"
            style={{ backgroundColor: `${siteConfig?.primary_color}30`, color: siteConfig?.primary_color }}
          >
            Contato
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Entre em Contato
          </h1>
          <p className="text-white/70 text-lg md:text-xl max-w-2xl">
            Estamos prontos para ajudá-lo a encontrar o imóvel perfeito. 
            Fale conosco por qualquer um dos nossos canais!
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-10">
            {/* Contact Info */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Informações de Contato
                </h2>
                <p className="text-gray-600">
                  Escolha a forma de contato que preferir. Responderemos o mais rápido possível!
                </p>
              </div>

              <div className="space-y-4">
                {contactItems.map((item, index) => (
                  <Card key={index} className="border-0 rounded-2xl hover:shadow-lg transition-all duration-300 group">
                    <CardContent className="p-5">
                      {item.href ? (
                        <a 
                          href={item.href}
                          target={item.external ? "_blank" : undefined}
                          rel={item.external ? "noopener noreferrer" : undefined}
                          className="flex items-center gap-4"
                        >
                          <div 
                            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                            style={{ backgroundColor: `${item.color}15` }}
                          >
                            <item.icon 
                              className="w-6 h-6"
                              style={{ color: item.color }}
                            />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 font-medium">{item.label}</p>
                            <p className="font-semibold text-gray-900 group-hover:underline">
                              {item.value}
                            </p>
                          </div>
                        </a>
                      ) : (
                        <div className="flex items-start gap-4">
                          <div 
                            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${item.color}15` }}
                          >
                            <item.icon 
                              className="w-6 h-6"
                              style={{ color: item.color }}
                            />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 font-medium">{item.label}</p>
                            <p className="font-semibold text-gray-900">
                              {item.value}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Social Links */}
              {(siteConfig?.instagram || siteConfig?.facebook) && (
                <div className="pt-6">
                  <h3 className="font-bold text-gray-900 mb-4">Siga-nos nas redes</h3>
                  <div className="flex gap-3">
                    {siteConfig?.instagram && (
                      <a
                        href={siteConfig.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center text-white hover:scale-110 transition-transform"
                      >
                        <Instagram className="w-6 h-6" />
                      </a>
                    )}
                    {siteConfig?.facebook && (
                      <a
                        href={siteConfig.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white hover:scale-110 transition-transform"
                      >
                        <Facebook className="w-6 h-6" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-3">
              <Card className="border-0 rounded-3xl shadow-xl">
                <CardContent className="p-8 md:p-10">
                  <div className="mb-8">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                      Envie sua mensagem
                    </h2>
                    <p className="text-gray-600">
                      Preencha o formulário abaixo e entraremos em contato em breve.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Nome completo *
                        </label>
                        <Input
                          placeholder="Seu nome"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          className="h-12 rounded-xl border-gray-200 focus:border-gray-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Telefone / WhatsApp *
                        </label>
                        <Input
                          type="tel"
                          placeholder="(00) 00000-0000"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          required
                          className="h-12 rounded-xl border-gray-200 focus:border-gray-300"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        E-mail
                      </label>
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="h-12 rounded-xl border-gray-200 focus:border-gray-300"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Mensagem
                      </label>
                      <Textarea
                        placeholder="Como podemos ajudá-lo? Descreva o que você procura..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={5}
                        className="rounded-xl border-gray-200 focus:border-gray-300 resize-none"
                      />
                    </div>

                    <Button 
                      type="submit"
                      size="lg"
                      className="w-full text-white h-14 text-base font-semibold rounded-xl gap-2 shadow-lg hover:shadow-xl transition-all"
                      style={{ backgroundColor: siteConfig?.primary_color }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        'Enviando...'
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Enviar Mensagem
                        </>
                      )}
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
