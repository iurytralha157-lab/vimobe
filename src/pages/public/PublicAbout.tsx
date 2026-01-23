import { usePublicSiteContext } from "@/contexts/PublicSiteContext";
import { Card, CardContent } from "@/components/ui/card";
import { Building, Users, Award, Heart } from "lucide-react";

export default function PublicAbout() {
  const { siteConfig } = usePublicSiteContext();

  const features = [
    { icon: Building, title: "Imóveis Selecionados", description: "Curadoria dos melhores imóveis da região" },
    { icon: Users, title: "Atendimento Personalizado", description: "Equipe dedicada para encontrar o imóvel ideal" },
    { icon: Award, title: "Experiência no Mercado", description: "Anos de experiência no setor imobiliário" },
    { icon: Heart, title: "Compromisso", description: "Seu sonho é a nossa prioridade" },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section 
        className="py-16 md:py-24 text-white"
        style={{ backgroundColor: siteConfig?.secondary_color }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {siteConfig?.about_title || `Sobre a ${siteConfig?.organization_name}`}
          </h1>
          <p className="text-white/80 text-lg max-w-3xl">
            Conheça nossa história e nosso compromisso com você.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Image */}
            <div>
              {siteConfig?.about_image_url ? (
                <img 
                  src={siteConfig.about_image_url} 
                  alt="Sobre nós"
                  className="rounded-2xl shadow-lg w-full h-auto"
                />
              ) : (
                <div 
                  className="rounded-2xl h-80 flex items-center justify-center"
                  style={{ backgroundColor: `${siteConfig?.primary_color}20` }}
                >
                  <Building 
                    className="w-24 h-24"
                    style={{ color: siteConfig?.primary_color }}
                  />
                </div>
              )}
            </div>

            {/* Text */}
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                Nossa História
              </h2>
              {siteConfig?.about_text ? (
                <div className="text-gray-600 whitespace-pre-wrap leading-relaxed">
                  {siteConfig.about_text}
                </div>
              ) : (
                <div className="text-gray-600 space-y-4">
                  <p>
                    A {siteConfig?.organization_name} nasceu com o objetivo de transformar a experiência 
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
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Por que escolher a {siteConfig?.organization_name}?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Oferecemos uma experiência diferenciada em todas as etapas do seu negócio imobiliário.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div 
                    className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                    style={{ backgroundColor: `${siteConfig?.primary_color}20` }}
                  >
                    <feature.icon 
                      className="w-8 h-8"
                      style={{ color: siteConfig?.primary_color }}
                    />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section 
        className="py-16"
        style={{ backgroundColor: siteConfig?.primary_color }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Pronto para encontrar seu imóvel?
          </h2>
          <p className="text-white/90 mb-8">
            Entre em contato conosco e vamos ajudá-lo a realizar seu sonho.
          </p>
          <a 
            href="/contato"
            className="inline-flex items-center justify-center px-8 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Fale Conosco
          </a>
        </div>
      </section>
    </div>
  );
}
