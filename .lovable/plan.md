

# Painel Lateral de Lead na Pagina de Conversas (Desktop)

## O que muda
Adicionar um painel lateral direito na pagina de Conversas (desktop only) que exibe informacoes do lead vinculado a conversa selecionada. Aparece somente quando a conversa tem um lead associado.

## Layout

```text
+------------------+---------------------------+----------------+
|  Lista Conversas |      Area do Chat         | Painel Lead    |
|    (350px)       |      (flex-1)             |   (300px)      |
|                  |                           |                |
|                  |  Header                   | Avatar + Nome  |
|                  |  Mensagens                | Telefone       |
|                  |  Input                    | Email          |
|                  |                           | Cidade/UF      |
|                  |                           | Estagio        |
|                  |                           | Tags           |
|                  |                           | Acoes rapidas  |
+------------------+---------------------------+----------------+
```

- Sem lead: painel nao aparece, chat ocupa todo o espaco
- Com lead: painel de ~300px aparece a direita com animacao suave
- Mobile: sem painel (tela muito pequena)

## Dados extras necessarios

A query de conversas ja traz `lead.id, name, pipeline, stage, tags`. Para exibir email, telefone, cidade, etc., criaremos um **hook simples** `useConversationLeadDetail` que busca os campos extras do lead quando o painel esta visivel.

## Componentes

### 1. Novo hook: `src/hooks/use-conversation-lead-detail.ts`
- Query simples: `leads` por ID, trazendo `email, phone, cidade, uf, source, created_at, valor_pretendido`
- Habilitado apenas quando `leadId` existe

### 2. Novo componente: `src/components/whatsapp/ConversationLeadPanel.tsx`
- Reutiliza a estrutura visual do `LeadSidePanel` existente mas adaptado para o contexto de conversas
- Secoes:
  - **Cabecalho**: Avatar, nome, telefone
  - **Contato**: email, telefone, cidade/UF
  - **Estagio**: badge com cor do estagio atual + nome do pipeline
  - **Tags**: tags do lead com cores
  - **Valor**: valor pretendido (se houver)
  - **Acoes**: botao "Ver Lead Completo" (link para pipeline), "Agendar Atividade"
  - **Data criacao**: quando o lead foi criado
- Botao de fechar (X) que colapsa o painel
- Toggle via botao no header do chat

### 3. Alteracao: `src/pages/Conversations.tsx` (desktop layout)
- Adicionar estado `showLeadPanel` (default: true)
- Quando `selectedConversation.lead` existe, renderizar o `ConversationLeadPanel` a direita
- Adicionar botao no header para toggle do painel
- Ajuste no layout flex para acomodar o terceiro painel

### 4. Alteracao: `src/components/whatsapp/ConversationHeader.tsx`
- Adicionar prop `onToggleLeadPanel` e `showLeadPanel`
- Renderizar botao de toggle (icone de painel lateral) ao lado dos botoes existentes

## Detalhes visuais
- Painel com `border-l`, fundo `bg-card`
- Transicao suave com `transition-all duration-300`
- ScrollArea para conteudo que excede a altura
- Consistente com o design do `LeadSidePanel` ja existente
