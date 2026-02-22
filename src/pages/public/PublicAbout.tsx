import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, Users, Award, Heart, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { usePublicContext } from "./usePublicContext";

export default function PublicAbout() {
  const { siteConfig } = usePublicContext();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Get base path for preview mode
  const isPreviewMode = location.pathname.includes('/site/preview') || location.pathname.includes('/site/previsualização');
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

  if (!siteConfig) {
    return null;
  }

  const features = [
    { icon: Building, title: "Imóveis Selecionados", description: "Curadoria dos melhores imóveis da região com critérios rigorosos de qualidade" },
    { icon: Users, title: "Atendimento Personalizado", description: "Equipe dedicada e treinada para encontrar o imóvel ideal para você" },
    { icon: Award, title: "Experiência no Mercado", description: "Anos de experiência e centenas de clientes satisfeitos no setor imobiliário" },
    { icon: Heart, title: "Compromisso", description: "Seu sonho é a nossa prioridade e trabalhamos para realizá-lo" },
  ];

  const stats = [
    { value: "500+", label: "Imóveis Vendidos" },
    { value: "98%", label: "Clientes Satisfeitos" },
    { value: "15+", label: "Anos de Experiência" },
    { value: "50+", label: "Parceiros" },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section 
        className="py-16 md:py-20 relative overflow-hidden"
        style={{
          backgroundImage: siteConfig.page_banner_url 
            ? `url(${siteConfig.page_banner_url})` 
            : undefined,
          backgroundColor: !siteConfig.page_banner_url ? siteConfig.secondary_color : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white pt-16 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-light">
            {siteConfig.about_title || 'Sobre Nós'}
          </h1>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p 
                  className="text-4xl md:text-5xl font-bold mb-2"
                  style={{ color: siteConfig.primary_color }}
                >
                  {stat.value}
                </p>
                <p className="text-gray-600 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Image */}
            <div className="order-2 lg:order-1">
              {siteConfig.about_image_url ? (
                <img 
                  src={siteConfig.about_image_url} 
                  alt="Sobre nós"
                  className="rounded-3xl shadow-2xl w-full h-auto"
                />
              ) : (
                <div 
                  className="rounded-3xl h-[400px] md:h-[500px] flex items-center justify-center relative overflow-hidden"
                  style={{ backgroundColor: `${siteConfig.primary_color}10` }}
                >
                  <div 
                    className="absolute inset-0 opacity-20"
                    style={{ 
                      backgroundImage: `linear-gradient(135deg, ${siteConfig.primary_color} 0%, transparent 50%)` 
                    }}
                  ></div>
                  <Building 
                    className="w-32 h-32"
                    style={{ color: siteConfig.primary_color }}
                  />
                </div>
              )}
            </div>

            {/* Text */}
            <div className="order-1 lg:order-2">
              <span 
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: siteConfig.primary_color }}
              >
                Nossa História
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-6">
                Transformando sonhos em realidade desde o início
              </h2>
              {siteConfig.about_text ? (
                <div className="text-gray-600 whitespace-pre-wrap leading-relaxed text-lg">
                  {siteConfig.about_text}
                </div>
              ) : (
                <div className="text-gray-600 space-y-4 text-lg leading-relaxed">
                  <p>
                    A {siteConfig.organization_name} nasceu com o objetivo de transformar a experiência 
                    de comprar, vender ou alugar imóveis. Acreditamos que encontrar o lugar perfeito 
                    deve ser uma jornada prazerosa e sem complicações.
                  </p>
                  <p>
                    Nossa equipe é formada por profissionais experientes e apaixonados pelo mercado 
                    imobiliário, sempre prontos para oferecer o melhor atendimento e as melhores 
                    oportunidades para você.
                  </p>
                  <p>
                    Com uma seleção cuidadosa de imóveis e um compromisso inabalável com a 
                    satisfação dos nossos clientes, trabalhamos para que você encontre não 
                    apenas um imóvel, mas o seu novo lar.
                  </p>
                </div>
              )}

              {/* Checkmarks */}
              <div className="mt-8 space-y-3">
                {["Atendimento personalizado", "Imóveis verificados", "Suporte completo"].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: siteConfig.primary_color }} />
                    <span className="text-gray-700 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span 
              className="text-sm font-semibold uppercase tracking-wider"
              style={{ color: siteConfig.primary_color }}
            >
              Nossos Diferenciais
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-4">
              Por que escolher a {siteConfig.organization_name}?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Oferecemos uma experiência diferenciada em todas as etapas do seu negócio imobiliário.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-xl transition-all duration-300 border-0 rounded-2xl group">
                <CardContent className="p-8">
                  <div 
                    className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${siteConfig.primary_color}15` }}
                  >
                    <feature.icon 
                      className="w-8 h-8"
                      style={{ color: siteConfig.primary_color }}
                    />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-3 text-lg">{feature.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section 
        className="py-20 relative overflow-hidden"
        style={{ backgroundColor: siteConfig.primary_color }}
      >
        <div 
          className="absolute inset-0 opacity-10"
          style={{ 
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}
        ></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Pronto para encontrar seu imóvel?
          </h2>
          <p className="text-white/90 mb-10 text-lg max-w-2xl mx-auto">
            Entre em contato conosco e vamos ajudá-lo a realizar seu sonho.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={getHref("contato")}>
              <Button 
                size="lg"
                className="bg-white hover:bg-gray-100 w-full sm:w-auto rounded-full px-8 gap-2"
                style={{ color: siteConfig.primary_color }}
              >
                Fale Conosco
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to={getHref("imoveis")}>
              <Button 
                size="lg"
                variant="outline"
                className="border-2 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white w-full sm:w-auto rounded-full px-8"
              >
                Ver Imóveis
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
