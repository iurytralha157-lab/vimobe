import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

// Default message when lead replies
export const DEFAULT_ON_REPLY_MESSAGE = `Olá {{lead.name}}! 🎉

Que bom que você se interessou!
Nossa equipe entrará em contato em breve para te atender.

Enquanto isso, posso te ajudar com algo?`;

// Pre-configured templates for real estate industry
export const FOLLOW_UP_TEMPLATES: FollowUpTemplate[] = [
  {
    id: 'real_estate_3',
    name: 'Follow-up 3 Dias',
    description: 'Sequência rápida de 3 mensagens para leads quentes',
    days: 3,
    industry: 'real_estate',
    onReplyMessage: DEFAULT_ON_REPLY_MESSAGE,
    messages: [
      {
        day: 1,
        title: 'Primeiro contato',
        content: `Olá {{lead.name}}! 👋

Aqui é da {{organization.name}}. Vi que você demonstrou interesse em nossos imóveis.

Posso ajudar a encontrar o imóvel perfeito para você? Qual região você está procurando?`,
      },
      {
        day: 2,
        title: 'Lembrete',
        content: `Oi {{lead.name}}, tudo bem? 

Só passando para lembrar que estamos à disposição para ajudar na sua busca!

Temos ótimas opções disponíveis. Quer que eu envie algumas sugestões?`,
      },
      {
        day: 3,
        title: 'Última tentativa',
        content: `{{lead.name}}, última mensagem! 😊

Caso ainda esteja procurando imóvel, ficarei feliz em ajudar.

Se mudar de ideia, é só me chamar aqui!`,
      },
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
      {
        day: 1,
        title: 'Boas-vindas',
        content: `Olá {{lead.name}}! 👋

Seja bem-vindo(a) à {{organization.name}}! 

Estou aqui para ajudar você a encontrar o imóvel ideal. Pode me contar um pouco sobre o que você busca? 🏠`,
      },
      {
        day: 2,
        title: 'Apresentação',
        content: `Oi {{lead.name}}! Tudo bem?

Aproveitando para me apresentar melhor: sou consultor(a) imobiliário(a) e tenho acesso a diversas opções que podem te interessar.

Qual tipo de imóvel você está procurando? Casa, apartamento, terreno?`,
      },
      {
        day: 3,
        title: 'Dica de mercado',
        content: `{{lead.name}}, você sabia? 📊

O momento atual está muito favorável para quem quer comprar ou alugar imóvel.

Posso te mostrar algumas oportunidades imperdíveis na sua região de interesse!`,
      },
      {
        day: 4,
        title: 'Oferta especial',
        content: `Oi {{lead.name}}! 

Separei algumas opções especiais que podem combinar com o que você procura.

Quer que eu te envie os detalhes? É só me responder! 📱`,
      },
      {
        day: 5,
        title: 'Convite para visita',
        content: `{{lead.name}}, que tal agendar uma visita? 🗓️

Posso organizar para você conhecer pessoalmente os imóveis que mais se encaixam no seu perfil.

Qual o melhor dia e horário para você?`,
      },
      {
        day: 6,
        title: 'Encerramento',
        content: `{{lead.name}}, última mensagem da nossa sequência! 

Caso precise de ajuda com imóveis no futuro, pode contar comigo.

Salva meu contato e chama quando precisar! 🤝`,
      },
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
      {
        day: 1,
        title: 'Primeiro contato',
        content: `Olá {{lead.name}}! 👋

Bem-vindo(a) à {{organization.name}}! 

Estou aqui para ajudar você na busca pelo imóvel ideal. O que você está procurando?`,
      },
      {
        day: 2,
        title: 'Apresentação',
        content: `Oi {{lead.name}}! 

Sou especialista em imóveis na região e posso te ajudar a encontrar opções que combinam com você.

Qual seu orçamento e localização de preferência?`,
      },
      {
        day: 3,
        title: 'Opções disponíveis',
        content: `{{lead.name}}, temos várias opções interessantes! 🏠

Posso te enviar uma seleção personalizada com base no que você procura.

Me conta mais sobre suas preferências!`,
      },
      {
        day: 4,
        title: 'Conteúdo educativo',
        content: `Oi {{lead.name}}! Dica do dia 📚

Sabia que é importante verificar a documentação do imóvel antes de fechar negócio?

Posso te ajudar com isso também! Quer saber mais?`,
      },
      {
        day: 5,
        title: 'Destaques da semana',
        content: `{{lead.name}}, olha só os destaques desta semana! ⭐

Separei algumas opções especiais com ótimas condições.

Quer que eu te mostre?`,
      },
      {
        day: 6,
        title: 'Convite para conhecer',
        content: `Oi {{lead.name}}! 

Que tal marcar uma visita para conhecer pessoalmente os imóveis?

Posso organizar tudo para você! Qual sua disponibilidade? 🗓️`,
      },
      {
        day: 7,
        title: 'Lembrete de benefícios',
        content: `{{lead.name}}, lembre-se dos benefícios de trabalhar comigo:

✅ Atendimento personalizado
✅ Opções selecionadas para você
✅ Suporte em toda a negociação

Vamos conversar?`,
      },
      {
        day: 8,
        title: 'Última promoção',
        content: `Oi {{lead.name}}! 

Recebi uma oportunidade imperdível que pode te interessar.

Posso te contar mais? É por tempo limitado! ⏰`,
      },
      {
        day: 9,
        title: 'Disponibilidade',
        content: `{{lead.name}}, só confirmando:

Continuo à disposição para te ajudar quando precisar! 

É só me chamar aqui que respondo rapidinho 📱`,
      },
      {
        day: 10,
        title: 'Despedida',
        content: `{{lead.name}}, última mensagem! 

Foi um prazer te conhecer. Quando decidir buscar um imóvel, pode contar comigo.

Salva meu contato e até breve! 🤝`,
      },
    ],
  },
];

interface FollowUpTemplatesProps {
  onSelectTemplate: (template: FollowUpTemplate | null) => void;
}

export function FollowUpTemplates({ onSelectTemplate }: FollowUpTemplatesProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Templates Prontos
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Comece rapidamente com sequências pré-configuradas para o mercado imobiliário
          </p>
        </div>
        <Button variant="outline" onClick={() => onSelectTemplate(null)}>
          <Plus className="h-4 w-4 mr-2" />
          Criar do Zero
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {FOLLOW_UP_TEMPLATES.map((template) => (
          <Card 
            key={template.id} 
            className="cursor-pointer hover:border-primary/50 transition-colors group"
            onClick={() => onSelectTemplate(template)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  <Building2 className="h-3 w-3 mr-1" />
                  Imobiliário
                </Badge>
              </div>
              <CardTitle className="text-base mt-3">{template.name}</CardTitle>
              <CardDescription className="text-sm">{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{template.days} dias</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{template.messages.length} mensagens</span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
              >
                Usar template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
