import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Building2, 
  Kanban, 
  ListTodo, 
  Shuffle, 
  Tags, 
  Facebook,
  Search,
  HelpCircle,
  MessageSquare,
  Calendar,
  DollarSign,
  FileText,
  BarChart3,
  Bell,
  Zap,
  UserPlus,
  Phone,
  Globe
} from 'lucide-react';
import { useState } from 'react';

const helpSections = [
  {
    icon: Building2,
    title: 'Começando',
    items: [
      {
        question: 'Como funciona o CRM?',
        answer: 'O CRM (Customer Relationship Management) é uma ferramenta para gerenciar seus leads e clientes. Você pode acompanhar todo o histórico de interações, organizar leads por estágios do funil de vendas e automatizar tarefas de acompanhamento.'
      },
      {
        question: 'O que é o pipeline?',
        answer: 'O pipeline é um quadro visual em formato Kanban que mostra seus leads organizados por estágio. Cada coluna representa uma etapa do seu processo de vendas (ex: Novo Lead, Em Contato, Proposta Enviada, Fechado). Você arrasta os cards para acompanhar o progresso.'
      },
      {
        question: 'Onde vejo minhas tarefas pendentes?',
        answer: 'Suas tarefas aparecem no Dashboard na seção "Tarefas do Dia", na Agenda com visualização de calendário, e também no painel de detalhes de cada lead. Tarefas vencidas ficam destacadas em vermelho.'
      },
    ]
  },
  {
    icon: Kanban,
    title: 'Gerenciando Leads',
    items: [
      {
        question: 'Como criar um novo lead?',
        answer: 'No pipeline, clique no botão "Novo Lead" no canto superior direito. Preencha os dados do contato como nome, telefone, email e selecione o imóvel de interesse se houver. O lead aparecerá na primeira coluna do pipeline.'
      },
      {
        question: 'Como mover um lead entre estágios?',
        answer: 'Basta arrastar o card do lead de uma coluna para outra. Ao soltar, o sistema atualiza automaticamente o estágio e registra a movimentação no histórico. Você também pode alterar clicando no card e selecionando o novo estágio.'
      },
      {
        question: 'Como ver o histórico de um lead?',
        answer: 'Clique no card do lead para abrir o painel de detalhes. Na aba "Histórico" você vê todas as atividades: mensagens enviadas, ligações realizadas, mudanças de estágio, tarefas concluídas e anotações.'
      },
      {
        question: 'Como adicionar anotações em um lead?',
        answer: 'Abra os detalhes do lead clicando no card. Na aba "Atividades" você pode adicionar observações, registrar ligações e adicionar informações importantes que ficarão salvas no histórico.'
      },
      {
        question: 'Como filtrar leads?',
        answer: 'Use os filtros disponíveis no topo do pipeline: por responsável, por tags, por fonte de origem ou por data. Você também pode buscar por nome, telefone ou email na barra de pesquisa.'
      },
    ]
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp e Conversas',
    items: [
      {
        question: 'Como enviar mensagens pelo CRM?',
        answer: 'Acesse o menu "Conversas" para ver todas as conversas ativas. Clique em uma conversa para abrir o chat e enviar mensagens. Você também pode iniciar uma conversa clicando no botão de WhatsApp no card do lead.'
      },
      {
        question: 'Como funciona o chat flutuante?',
        answer: 'O botão verde no canto inferior direito abre o chat flutuante. Ele permite responder mensagens rapidamente sem sair da tela atual. Você vê a lista de conversas recentes e pode trocar entre elas.'
      },
      {
        question: 'Como enviar arquivos e imagens?',
        answer: 'No chat, clique no ícone de anexo ao lado do campo de texto. Você pode enviar fotos, documentos PDF e outros arquivos. Eles serão entregues via WhatsApp para o cliente.'
      },
      {
        question: 'Como ver conversas não lidas?',
        answer: 'Conversas com mensagens não lidas aparecem destacadas na lista com um indicador numérico. O ícone do chat flutuante também mostra a quantidade total de mensagens não lidas.'
      },
    ]
  },
  {
    icon: ListTodo,
    title: 'Tarefas e Cadências',
    items: [
      {
        question: 'O que são cadências?',
        answer: 'Cadências são sequências de tarefas automáticas que são criadas quando um lead entra em um estágio. Por exemplo: dia 0 = ligação de boas-vindas, dia 1 = mensagem de follow-up, dia 3 = envio de material. Isso garante um acompanhamento consistente.'
      },
      {
        question: 'Como marcar uma tarefa como concluída?',
        answer: 'Nas tarefas do lead, clique no checkbox ao lado da tarefa. Ela será marcada como concluída e removida da sua lista de pendências. O sistema registra quem concluiu e quando.'
      },
      {
        question: 'Como criar tarefas manuais?',
        answer: 'Abra os detalhes do lead e clique em "Nova Tarefa". Defina o título, tipo (ligação, mensagem, visita), data de vencimento e descrição. A tarefa aparecerá na sua agenda e no painel do lead.'
      },
      {
        question: 'Onde vejo todas as minhas tarefas?',
        answer: 'O Dashboard mostra as tarefas do dia. A Agenda mostra todas as tarefas em formato de calendário. Você pode filtrar por data, tipo e status (pendente, concluída, atrasada).'
      },
    ]
  },
  {
    icon: Calendar,
    title: 'Agenda',
    items: [
      {
        question: 'Como agendar uma visita?',
        answer: 'Na Agenda, clique em "Novo Evento" e selecione o tipo "Visita". Preencha o lead relacionado, imóvel, data/hora e observações. O evento aparece no calendário e nas tarefas do lead.'
      },
      {
        question: 'Como sincronizar com Google Agenda?',
        answer: 'Em Configurações > Integrações, conecte sua conta Google. Após autorizar, seus eventos do CRM serão sincronizados automaticamente com sua agenda Google e vice-versa.'
      },
      {
        question: 'Como visualizar a agenda de toda equipe?',
        answer: 'Na Agenda, use o filtro de usuários para ver os compromissos de todos os corretores. Isso ajuda a organizar visitas e evitar conflitos de horário.'
      },
    ]
  },
  {
    icon: Building2,
    title: 'Imóveis',
    items: [
      {
        question: 'Como cadastrar um imóvel?',
        answer: 'Acesse o menu "Imóveis" e clique em "Novo Imóvel". Preencha as informações: tipo, preço, endereço, características (quartos, vagas, área) e faça upload das fotos. O sistema gera um código único automaticamente.'
      },
      {
        question: 'Como funciona o código do imóvel?',
        answer: 'Cada imóvel recebe um código automático baseado no tipo: AP (Apartamento), CA (Casa), TE (Terreno), CO (Comercial), SA (Sala), LA (Laje). O número incrementa automaticamente: AP0001, AP0002, etc.'
      },
      {
        question: 'Como vincular um imóvel a um lead?',
        answer: 'Nos detalhes do lead, selecione o imóvel de interesse no campo específico. Você também pode fazer isso ao criar o lead. Leads podem ter interesse em múltiplos imóveis.'
      },
      {
        question: 'Como destacar imóveis importantes?',
        answer: 'Na lista de imóveis, use o botão de estrela para marcar como destaque. Imóveis em destaque aparecem primeiro nas buscas e podem ser usados para campanhas específicas.'
      },
    ]
  },
  {
    icon: Tags,
    title: 'Tags e Organização',
    items: [
      {
        question: 'Para que servem as tags?',
        answer: 'Tags são etiquetas coloridas para categorizar leads. Exemplos: "Quente" (alta probabilidade), "Investidor", "Alto Padrão", "Urgente". Elas facilitam filtrar e organizar seus leads.'
      },
      {
        question: 'Como aplicar tags em leads?',
        answer: 'Abra os detalhes do lead e clique em "Adicionar Tag". Selecione uma tag existente ou crie uma nova com nome e cor. Você pode aplicar múltiplas tags em um mesmo lead.'
      },
      {
        question: 'Como filtrar leads por tags?',
        answer: 'No pipeline e na lista de contatos, use o filtro de tags. Você pode selecionar uma ou mais tags para ver apenas os leads que possuem todas elas.'
      },
    ]
  },
  {
    icon: Shuffle,
    title: 'Distribuição de Leads',
    items: [
      {
        question: 'O que é a roleta de distribuição?',
        answer: 'A roleta distribui automaticamente novos leads entre os corretores da equipe. Quando um lead chega (via Meta, site ou manualmente), ele é atribuído ao próximo corretor da fila de forma justa e equilibrada.'
      },
      {
        question: 'Como funciona a distribuição por peso?',
        answer: 'Você pode definir pesos diferentes para cada corretor. Por exemplo, um corretor sênior pode ter peso 2 e receber o dobro de leads que um júnior com peso 1.'
      },
      {
        question: 'Posso ter roletas diferentes?',
        answer: 'Sim! Crie roletas específicas por campanha, tipo de imóvel ou fonte. Exemplo: leads do Instagram vão para a roleta A, leads do site para a roleta B.'
      },
    ]
  },
  {
    icon: Facebook,
    title: 'Integração Meta (Facebook/Instagram)',
    items: [
      {
        question: 'Como conectar minha conta?',
        answer: 'Acesse Configurações > Integração Meta e clique em "Conectar com Facebook". Autorize o acesso e selecione a página e formulários de Lead Ads que deseja sincronizar.'
      },
      {
        question: 'Os leads chegam em tempo real?',
        answer: 'Sim! Após configurar, os leads do Meta são recebidos instantaneamente. Eles aparecem na coluna "Novo Lead" do pipeline e são distribuídos pela roleta automaticamente.'
      },
      {
        question: 'Como mapear campanhas para imóveis?',
        answer: 'Nas configurações do Meta, crie regras de mapeamento: leads de uma campanha específica são automaticamente associados a um código de imóvel.'
      },
    ]
  },
  {
    icon: Globe,
    title: 'Integração WordPress/Site',
    items: [
      {
        question: 'Como receber leads do meu site?',
        answer: 'Acesse Configurações > Webhooks e copie a URL do webhook. Configure seu formulário WordPress para enviar os dados para essa URL. Os leads chegarão automaticamente no CRM.'
      },
      {
        question: 'Quais campos são importados?',
        answer: 'Os campos padrão são: nome, email, telefone, mensagem e código do imóvel. Campos personalizados também podem ser mapeados nas configurações.'
      },
    ]
  },
  {
    icon: DollarSign,
    title: 'Financeiro',
    items: [
      {
        question: 'Como registrar uma venda?',
        answer: 'No menu Contratos, clique em "Novo Contrato". Preencha os dados do cliente, imóvel, valor e condições de pagamento. O sistema calcula automaticamente as comissões baseado nas regras configuradas.'
      },
      {
        question: 'Como acompanhar comissões?',
        answer: 'O menu Comissões mostra todas as comissões pendentes, aprovadas e pagas. Você vê o valor, corretor responsável, contrato relacionado e pode gerenciar o fluxo de aprovação.'
      },
      {
        question: 'Como lançar despesas e receitas?',
        answer: 'No menu Financeiro > Lançamentos, registre receitas e despesas com categoria, data de vencimento e competência. Use para controlar fluxo de caixa da imobiliária.'
      },
    ]
  },
  {
    icon: FileText,
    title: 'Contratos',
    items: [
      {
        question: 'Como criar um contrato?',
        answer: 'Acesse Contratos > Novo Contrato. Selecione o lead/cliente, imóvel, tipo (venda ou locação), valor e condições. Você pode vincular os corretores participantes e suas porcentagens de comissão.'
      },
      {
        question: 'Como acompanhar o status?',
        answer: 'Contratos passam por etapas: Rascunho, Assinado, Em Andamento, Concluído. O painel mostra indicadores de cada status e você pode filtrar por tipo e data.'
      },
    ]
  },
  {
    icon: BarChart3,
    title: 'Dashboard e Relatórios',
    items: [
      {
        question: 'O que vejo no Dashboard?',
        answer: 'O Dashboard mostra: leads do período, conversões, tarefas pendentes, desempenho por corretor e gráficos de evolução. Use os filtros de data para analisar diferentes períodos.'
      },
      {
        question: 'Como ver o desempenho da equipe?',
        answer: 'O menu Desempenho mostra ranking de corretores, taxa de conversão, tempo médio de atendimento e leads por fonte. Ideal para gestores acompanharem a equipe.'
      },
      {
        question: 'Como exportar dados?',
        answer: 'Na lista de contatos e relatórios, use o botão "Exportar". Os dados são baixados em formato Excel (XLSX) para análises externas.'
      },
    ]
  },
  {
    icon: Zap,
    title: 'Automações',
    items: [
      {
        question: 'O que posso automatizar?',
        answer: 'Você pode criar automações para: enviar mensagens automáticas quando um lead entra, mover leads entre estágios baseado em condições, criar tarefas automaticamente e notificar a equipe.'
      },
      {
        question: 'Como criar uma automação?',
        answer: 'No menu Automações, clique em "Nova Automação". Defina o gatilho (ex: lead criado), as condições (ex: fonte = Meta) e as ações (ex: enviar mensagem de boas-vindas).'
      },
    ]
  },
  {
    icon: Bell,
    title: 'Notificações',
    items: [
      {
        question: 'Que notificações recebo?',
        answer: 'Você recebe notificações de: novos leads atribuídos, mensagens de clientes, tarefas vencendo, leads parados há muito tempo e menções de colegas.'
      },
      {
        question: 'Como configurar notificações?',
        answer: 'Em Configurações > Notificações, escolha quais alertas deseja receber e por qual canal (push no navegador, email). Você pode silenciar temporariamente se necessário.'
      },
    ]
  },
  {
    icon: Phone,
    title: 'Contatos',
    items: [
      {
        question: 'Qual a diferença entre Leads e Contatos?',
        answer: 'Leads são oportunidades ativas no funil de vendas. Contatos é a base completa de pessoas cadastradas, incluindo leads convertidos, clientes antigos e contatos gerais.'
      },
      {
        question: 'Como importar contatos?',
        answer: 'No menu Contatos, clique em "Importar". Faça upload de uma planilha Excel com as colunas: nome, telefone, email. O sistema valida e importa os dados automaticamente.'
      },
      {
        question: 'Como exportar minha base?',
        answer: 'Na lista de contatos, use o botão "Exportar". Você pode exportar todos os contatos ou apenas os filtrados em formato Excel.'
      },
    ]
  },
];

export default function Help() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSections = helpSections.map(section => ({
    ...section,
    items: section.items.filter(
      item =>
        item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter(section => section.items.length > 0);

  return (
    <AppLayout title="Central de Ajuda">
      <div className="animate-in">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <HelpCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Guia de Uso</h1>
              <p className="text-muted-foreground">Tudo que você precisa saber para usar o CRM</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar no guia de ajuda..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Sections - Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSections.map((section) => (
            <Card key={section.title}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <section.icon className="h-5 w-5 text-primary" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Accordion type="single" collapsible className="w-full">
                  {section.items.map((item, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left hover:no-underline">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSections.length === 0 && (
          <Card className="p-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground">
              Tente buscar por outros termos ou navegue pelas seções acima.
            </p>
          </Card>
        )}

        {/* Contact */}
        <Card className="mt-8">
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold mb-2">Ainda precisa de ajuda?</h3>
            <p className="text-muted-foreground mb-4">
              Nossa equipe de suporte está pronta para ajudar você.
            </p>
            <a 
              href="mailto:suporte@vettercrm.com" 
              className="text-primary hover:underline"
            >
              suporte@vettercrm.com
            </a>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
