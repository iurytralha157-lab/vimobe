
# Plano: Sistema de Resultado de Tentativas de Contato

## Visão Geral

Implementar um sistema que, ao marcar uma tarefa de cadência como feita, abre um dialog perguntando o **resultado** dessa tentativa. Isso vai enriquecer significativamente o histórico do lead e permitir análises futuras sobre qualidade de leads e efetividade dos corretores.

---

## O Que Será Implementado

### 1. Dialog de Resultado ao Completar Tarefa

Quando o corretor clicar para completar uma tarefa (ligação, mensagem, email), aparecerá um pequeno formulário perguntando:

**Para Ligações:**
- Atendeu?
  - Sim, conversamos
  - Não atendeu / Caixa postal
  - Número inexistente / Errado
  - Linha ocupada

**Para Mensagens (WhatsApp):**
- O lead respondeu?
  - Sim, respondeu
  - Visualizou mas não respondeu
  - Não visualizou
  - Número sem WhatsApp

**Para Emails:**
- Resultado:
  - Respondeu
  - Não respondeu
  - Email inválido

Cada opção também permite adicionar uma **observação livre** opcional.

---

## Detalhes Técnicos

### Alterações no Banco de Dados

**Tabela `lead_tasks`** - Adicionar colunas:
```sql
ALTER TABLE lead_tasks 
ADD COLUMN outcome TEXT,           -- 'answered', 'not_answered', 'invalid_number', etc.
ADD COLUMN outcome_notes TEXT;     -- Observação livre do corretor
```

**Tabela `activities`** - O metadata JSON já suporta campos adicionais, então vamos incluir `outcome` e `outcome_notes` no registro.

---

### Alterações no Frontend

**1. Novo componente: `TaskOutcomeDialog.tsx`**
- Dialog/Sheet que aparece quando o corretor clica para completar a tarefa
- Mostra opções de resultado específicas por tipo de tarefa (call/message/email)
- Campo opcional para observações
- Botões "Salvar" e "Cancelar"

**2. Modificar `use-lead-tasks.ts`**
- Atualizar `useCompleteCadenceTask` para aceitar `outcome` e `outcome_notes`
- Salvar esses dados tanto na `lead_tasks` quanto no `activities.metadata`

**3. Modificar `LeadDetailDialog.tsx`**
- Ao clicar na tarefa, abrir o `TaskOutcomeDialog` ao invés de completar diretamente
- Passar os dados do resultado para a mutation

**4. Atualizar exibição de atividades**
- Mostrar o resultado junto com a atividade no histórico
- Ex: "Ligação realizada - Não atendeu" ou "Mensagem enviada - Lead respondeu"

---

### Opções de Resultado por Tipo

```text
┌─────────────────────────────────────────────────────────────┐
│  TIPO: LIGAÇÃO (call)                                       │
├─────────────────────────────────────────────────────────────┤
│  answered          →  "Atendeu - Conversamos"               │
│  not_answered      →  "Não atendeu / Caixa postal"          │
│  invalid_number    →  "Número inexistente / Errado"         │
│  busy              →  "Linha ocupada"                       │
│  scheduled         →  "Agendou retorno"                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  TIPO: MENSAGEM (message)                                   │
├─────────────────────────────────────────────────────────────┤
│  replied           →  "Respondeu"                           │
│  seen_no_reply     →  "Visualizou mas não respondeu"        │
│  not_seen          →  "Não visualizou"                      │
│  no_whatsapp       →  "Número sem WhatsApp"                 │
│  scheduled         →  "Agendou visita/reunião"              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  TIPO: EMAIL (email)                                        │
├─────────────────────────────────────────────────────────────┤
│  replied           →  "Respondeu"                           │
│  not_replied       →  "Não respondeu"                       │
│  bounced           →  "Email inválido / Retornou"           │
└─────────────────────────────────────────────────────────────┘
```

---

## Fluxo do Usuário

```text
1. Corretor abre o lead
2. Na aba "Atividades", vê a cadência configurada
3. Clica em "Primeira tentativa de contato (Ligação)"
4. Abre dialog: "Como foi essa ligação?"
   ┌────────────────────────────────────┐
   │  Como foi essa ligação?            │
   │                                    │
   │  ○ Atendeu - Conversamos           │
   │  ○ Não atendeu / Caixa postal      │
   │  ○ Número inexistente              │
   │  ○ Linha ocupada                   │
   │  ○ Agendou retorno                 │
   │                                    │
   │  Observação (opcional):            │
   │  ┌──────────────────────────────┐  │
   │  │ Disse que vai ligar depois   │  │
   │  └──────────────────────────────┘  │
   │                                    │
   │     [Cancelar]     [Registrar]     │
   └────────────────────────────────────┘
5. Corretor seleciona resultado e clica em "Registrar"
6. Sistema salva a tarefa como completa + resultado
7. No histórico aparece: "Ligação realizada - Não atendeu"
```

---

## Exibição no Histórico

Após implementado, o histórico mostrará informações muito mais ricas:

```text
Atividades Recentes:
───────────────────────────────────────────
🔴 Ligação realizada - Não atendeu
   "Tentei 3x mas foi caixa postal"
   há 2 minutos • João Silva

💬 Mensagem enviada - Lead respondeu
   "Interessado, pediu mais informações"
   há 1 hora • João Silva

🔴 Ligação realizada - Número inexistente
   há 2 dias • Maria Santos
───────────────────────────────────────────
```

---

## Arquivos a Serem Modificados/Criados

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/xxx.sql` | Criar - adicionar colunas outcome |
| `src/components/leads/TaskOutcomeDialog.tsx` | Criar - dialog de resultado |
| `src/hooks/use-lead-tasks.ts` | Modificar - aceitar outcome |
| `src/components/leads/LeadDetailDialog.tsx` | Modificar - integrar dialog |
| `src/components/leads/LeadHistory.tsx` | Modificar - exibir outcome |
| `src/integrations/supabase/types.ts` | Atualizar - tipos gerados |

---

## Benefícios

1. **Histórico completo**: Saber exatamente o que aconteceu em cada tentativa
2. **Métricas de qualidade**: Leads com números errados, leads que respondem, etc.
3. **Avaliação de corretores**: Quantas tentativas até conseguir contato
4. **Base para IA futura**: Dados ricos para gerar resumos automatizados
5. **Relatórios**: Possibilidade de criar dashboards com taxa de contato efetivo

---

## Considerações Finais

Este é o primeiro passo para ter um histórico completo e rico. No futuro, com esses dados estruturados, será muito mais fácil implementar:
- Resumo por IA (como você viu no Bot Leads)
- Dashboard de performance de contato
- Alertas automáticos para leads com muitas tentativas sem sucesso
