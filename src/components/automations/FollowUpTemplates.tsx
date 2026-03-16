import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Clock, Calendar, Plus, Sparkles, Building2 } from 'lucide-react';

export interface FollowUpTemplate {
  id: string;
  name: string;
  description: string;
  days: number;
  industry: 'real_estate' | 'general';
  messages: {
    day: number;
    title: string;
    content: string;
  }[];
  onReplyMessage?: string;
}

export const DEFAULT_ON_REPLY_MESSAGE = `Olá {{lead.name}}! 🎉

Que bom que você se interessou!
Nossa equipe entrará em contato em breve para te atender.

Enquanto isso, posso te ajudar com algo?`;

export const FOLLOW_UP_TEMPLATES: FollowUpTemplate[] = [
  {
    id: 'real_estate_3',
    name: 'Follow-up 3 Dias',
    description: 'Sequência rápida de 3 mensagens para leads quentes',
    days: 3,
    industry: 'real_estate',
    onReplyMessage: DEFAULT_ON_REPLY_MESSAGE,
    messages: [
      { day: 1, title: 'Primeiro contato', content: `Olá {{lead.name}}! 👋\n\nAqui é da {{organization.name}}. Vi que você demonstrou interesse em nossos imóveis.\n\nPosso ajudar a encontrar o imóvel perfeito para você? Qual região você está procurando?` },
      { day: 2, title: 'Lembrete', content: `Oi {{lead.name}}, tudo bem? \n\nSó passando para lembrar que estamos à disposição para ajudar na sua busca!\n\nTemos ótimas opções disponíveis. Quer que eu envie algumas sugestões?` },
      { day: 3, title: 'Última tentativa', content: `{{lead.name}}, última mensagem! 😊\n\nCaso ainda esteja procurando imóvel, ficarei feliz em ajudar.\n\nSe mudar de ideia, é só me chamar aqui!` },
    ],
  },
  {
    id: 'real_estate_6',
    name: 'Follow-up 6 Dias',
    description: 'Sequência completa para nutrir leads interessados',
    days: 6,
    industry: 'real_estate',
    onReplyMessage: DEFAULT_ON_REPLY_MESSAGE,
    messages: [
      { day: 1, title: 'Boas-vindas', content: `Olá {{lead.name}}! 👋\n\nSeja bem-vindo(a) à {{organization.name}}! \n\nEstou aqui para ajudar você a encontrar o imóvel ideal. Pode me contar um pouco sobre o que você busca? 🏠` },
      { day: 2, title: 'Apresentação', content: `Oi {{lead.name}}! Tudo bem?\n\nAproveitando para me apresentar melhor: sou consultor(a) imobiliário(a) e tenho acesso a diversas opções que podem te interessar.\n\nQual tipo de imóvel você está procurando? Casa, apartamento, terreno?` },
      { day: 3, title: 'Dica de mercado', content: `{{lead.name}}, você sabia? 📊\n\nO momento atual está muito favorável para quem quer comprar ou alugar imóvel.\n\nPosso te mostrar algumas oportunidades imperdíveis na sua região de interesse!` },
      { day: 4, title: 'Oferta especial', content: `Oi {{lead.name}}! \n\nSeparei algumas opções especiais que podem combinar com o que você procura.\n\nQuer que eu te envie os detalhes? É só me responder! 📱` },
      { day: 5, title: 'Convite para visita', content: `{{lead.name}}, que tal agendar uma visita? 🗓️\n\nPosso organizar para você conhecer pessoalmente os imóveis que mais se encaixam no seu perfil.\n\nQual o melhor dia e horário para você?` },
      { day: 6, title: 'Encerramento', content: `{{lead.name}}, última mensagem da nossa sequência! \n\nCaso precise de ajuda com imóveis no futuro, pode contar comigo.\n\nSalva meu contato e chama quando precisar! 🤝` },
    ],
  },
  {
    id: 'real_estate_10',
    name: 'Follow-up 10 Dias',
    description: 'Sequência estendida para leads que precisam mais tempo',
    days: 10,
    industry: 'real_estate',
    onReplyMessage: DEFAULT_ON_REPLY_MESSAGE,
    messages: [
      { day: 1, title: 'Primeiro contato', content: `Olá {{lead.name}}! 👋\n\nBem-vindo(a) à {{organization.name}}! \n\nEstou aqui para ajudar você na busca pelo imóvel ideal. O que você está procurando?` },
      { day: 2, title: 'Apresentação', content: `Oi {{lead.name}}! \n\nSou especialista em imóveis na região e posso te ajudar a encontrar opções que combinam com você.\n\nQual seu orçamento e localização de preferência?` },
      { day: 3, title: 'Opções disponíveis', content: `{{lead.name}}, temos várias opções interessantes! 🏠\n\nPosso te enviar uma seleção personalizada com base no que você procura.\n\nMe conta mais sobre suas preferências!` },
      { day: 4, title: 'Conteúdo educativo', content: `Oi {{lead.name}}! Dica do dia 📚\n\nSabia que é importante verificar a documentação do imóvel antes de fechar negócio?\n\nPosso te ajudar com isso também! Quer saber mais?` },
      { day: 5, title: 'Destaques da semana', content: `{{lead.name}}, olha só os destaques desta semana! ⭐\n\nSeparei algumas opções especiais com ótimas condições.\n\nQuer que eu te mostre?` },
      { day: 6, title: 'Convite para conhecer', content: `Oi {{lead.name}}! \n\nQue tal marcar uma visita para conhecer pessoalmente os imóveis?\n\nPosso organizar tudo para você! Qual sua disponibilidade? 🗓️` },
      { day: 7, title: 'Lembrete de benefícios', content: `{{lead.name}}, lembre-se dos benefícios de trabalhar comigo:\n\n✅ Atendimento personalizado\n✅ Opções selecionadas para você\n✅ Suporte em toda a negociação\n\nVamos conversar?` },
      { day: 8, title: 'Última promoção', content: `Oi {{lead.name}}! \n\nRecebi uma oportunidade imperdível que pode te interessar.\n\nPosso te contar mais? É por tempo limitado! ⏰` },
      { day: 9, title: 'Disponibilidade', content: `{{lead.name}}, só confirmando:\n\nContinuo à disposição para te ajudar quando precisar! \n\nÉ só me chamar aqui que respondo rapidinho 📱` },
      { day: 10, title: 'Despedida', content: `{{lead.name}}, última mensagem! \n\nFoi um prazer te conhecer. Quando decidir buscar um imóvel, pode contar comigo.\n\nSalva meu contato e até breve! 🤝` },
    ],
  },
];

interface FollowUpTemplatesProps {
  onSelectTemplate: (template: FollowUpTemplate | null) => void;
}

export function FollowUpTemplates({ onSelectTemplate }: FollowUpTemplatesProps) {
  return (
    <div className="space-y-6">
      {/* Create from scratch - special card */}
      <Card 
        className="border-dashed border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 rounded-2xl cursor-pointer transition-all duration-200 group"
        onClick={() => onSelectTemplate(null)}
      >
        <CardContent className="flex items-center gap-4 p-6">
          <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Plus className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Criar do Zero
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Monte seu fluxo personalizado com o editor visual
            </p>
          </div>
          <Button size="sm" className="shrink-0">
            Começar
          </Button>
        </CardContent>
      </Card>

      {/* Templates */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Ou comece com um modelo pronto
        </h4>

        <div className="grid gap-4 md:grid-cols-3">
          {FOLLOW_UP_TEMPLATES.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer rounded-2xl bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/40 transition-all duration-200 group"
              onClick={() => onSelectTemplate(template)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    <Building2 className="h-3 w-3 mr-1" />
                    Imobiliário
                  </Badge>
                </div>

                <h3 className="font-semibold text-sm mb-1">{template.name}</h3>
                <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{template.description}</p>

                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{template.days} dias</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{template.messages.length} msgs</span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                >
                  Usar template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
