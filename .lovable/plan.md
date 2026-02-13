# Registro Completo de Tempo de Resposta e Historico de Acoes

## Resumo

Hoje, ao clicar nos botoes de acao rapida (telefone, WhatsApp, email), o sistema registra o "tempo de primeira resposta" via edge function, mas **nao cria nenhum registro visivel no historico do lead** e **nao abre popup de resultado**. Alem disso, **mover o lead no Kanban** nao registra tempo de resposta. Vamos corrigir tudo isso.

## O que muda

### 1. Mover lead no Kanban registra tempo de resposta

- No `handleDragEnd` em `Pipelines.tsx`, adicionar chamada ao `recordFirstResponse` com channel `'stage_move'`
- Isso garante que se a primeira acao do corretor for mover o lead, o tempo de resposta sera registrado

### 2. Botoes de acao rapida criam atividade no historico

- Ao clicar em **Telefone**: cria atividade tipo `call` no historico ("Tentativa de ligacao")
- Ao clicar em **WhatsApp**: cria atividade tipo `message` no historico ("Mensagem iniciada via WhatsApp") (só a primeira vez, depois não faz mais registro de mensagem do Wahtsapp
- Ao clicar em **Email**: cria atividade tipo `email` no historico ("Email enviado")
- Isso acontece nos dois componentes: `LeadCard.tsx` (card do pipeline) e `LeadDetailDialog.tsx` (detalhes do lead)

### 3. Popup de resultado apos acao (Telefone e Email)

- Apos clicar no botao de **Telefone**, abre o `TaskOutcomeDialog` para o corretor informar: "Atendeu", "Nao atendeu", "Numero inexistente", etc.
- Apos clicar no botao de **Email**, abre o `TaskOutcomeDialog` para informar: "Respondeu", "Nao respondeu", "Email invalido"
- O resultado (outcome) e salvo no metadata da atividade e aparece no historico com badge colorido (ja funciona no componente `LeadHistory`)
- **WhatsApp nao abre popup** pois a conversa ja fica registrada no chat interno

### 4. Atualizar labels e icones no historico

- Adicionar suporte aos novos tipos de evento no `LeadHistory.tsx` e `use-lead-full-history.ts`
- Channel `stage_move` precisa de label e icone adequados  


5. após a primeira ação do lead registra no historico o tempo de resposta do usuário, e salva o tempo de respota
6. &nbsp;

---

## Detalhes Tecnicos

### Arquivos alterados


| Arquivo                                                | Alteracao                                                                                                                                       |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/Pipelines.tsx`                              | Importar e usar `useRecordFirstResponseOnAction`. Chamar `recordFirstResponse` no `handleDragEnd` com channel `stage_move`                      |
| `src/components/leads/LeadCard.tsx`                    | Importar `useCreateActivity`. Apos cada clique de acao, criar atividade. Para telefone: abrir `TaskOutcomeDialog` e salvar outcome na atividade |
| `src/components/leads/LeadDetailDialog.tsx`            | Mesma logica do LeadCard para os botoes de acao rapida (telefone, email) - criar atividade + popup de outcome                                   |
| `src/hooks/use-lead-full-history.ts`                   | Adicionar label para channel `stage_move` na funcao `getActivityLabel`                                                                          |
| `src/hooks/use-first-response.ts`                      | Adicionar `stage_move` como channel valido no tipo `RecordFirstResponseParams`                                                                  |
| `supabase/functions/calculate-first-response/index.ts` | Aceitar `stage_move` como channel valido (ja aceita qualquer string, so precisa ajustar o titulo do evento)                                     |


### Fluxo do Telefone (exemplo)

```text
1. Corretor clica no icone de telefone
2. Sistema registra first_response (se for primeiro contato)
3. Sistema abre tel: para iniciar ligacao
4. TaskOutcomeDialog abre automaticamente
5. Corretor seleciona "Atendeu" ou "Nao atendeu" + observacao
6. Sistema salva atividade tipo "call" com outcome no metadata
7. Historico mostra: "Tentativa de ligacao" + badge "Atendeu" (verde)
```

### Fluxo do WhatsApp

```text
1. Corretor clica no icone de WhatsApp
2. Sistema registra first_response (se for primeiro contato)
3. Sistema cria atividade tipo "message" (sem popup de outcome)
4. Chat flutuante abre
5. Historico mostra: "Chat WhatsApp iniciado"
```

### Fluxo do Drag (mover lead)

```text
1. Corretor arrasta lead para outro estagio
2. Sistema registra first_response com channel "stage_move"
3. Trigger do banco cria atividade de stage_change automaticamente
4. Historico mostra ambos: tempo de resposta + mudanca de estagio
```