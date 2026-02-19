
# Refatorar Histórico do Lead — Nova Versão Aprimorada

## O que os arquivos propõem

Você recebeu dois arquivos com uma versão melhorada do histórico do lead. Vou aplicar essas melhorias substituindo os arquivos existentes.

## Comparação: Atual vs. Proposto

### Hook: `use-lead-full-history.ts` → `use-lead-history.ts`

| Aspecto | Atual | Proposto |
|---|---|---|
| Arquitetura | Usa dois hooks separados (`useLeadTimeline` + `useActivities`) com `useMemo` | Uma única query direta ao Supabase via `useQuery` — mais eficiente |
| Deduplicação | Nenhuma — duplicatas aparecem | Define `ACTIVITY_ONLY_TYPES` e `TIMELINE_AUTHORITY_TYPES` para evitar eventos duplicados |
| Enriquecimento | Labels com emojis no texto | Labels limpos em texto puro, ícones tratados na UI |
| Resolução de atores | Depende do hook de timeline | Resolve IDs de usuários em metadata dinamicamente via query extra |
| Enriquecimento de webhook | Não busca nome do webhook | Busca `webhooks_integrations` para mostrar o nome real do webhook |
| Tempo de resposta | Calcula manualmente (minutos/segundos) | Usa `formatResponseTime` já exportado de `use-lead-timeline` |
| Ordem | Mais recentes primeiro (descending) | Mais antigos primeiro (ascending) — ordem cronológica natural |

### Componente: `LeadHistory.tsx` → `LeadHistory-2.tsx`

| Aspecto | Atual | Proposto |
|---|---|---|
| Ícones por origem | Um único ícone para `lead_created` | Ícones diferentes para Meta Ads, WhatsApp, Site, Manual, Webhook |
| Outcomes | Usa `getOutcomeLabel`/`getOutcomeVariant` de `TaskOutcomeDialog` | Define `OUTCOME_CONFIG` inline com mais tipos (voicemail, busy, bounced, etc.) |
| Banner de primeira resposta | Banner amarelo simples | Banner mais polido com tempo formatado via `formatResponseTime` |
| Linha de conexão | Linha fixa do topo ao fundo | Linha dinâmica entre eventos (não aparece após o último) |
| Badge "Sistema" | Aparece em todos eventos de timeline | Só aparece para eventos sem ator humano E sem automação |
| Estilo dos ícones | Cores sólidas `bg-*-100` | Fundo translúcido `bg-*/15` — visual mais moderno |

## Mudanças a implementar

### 1. Criar `src/hooks/use-lead-history.ts`
Novo hook com a arquitetura melhorada (query única, deduplicação, enriquecimento de webhook, resolução de atores).

### 2. Atualizar `src/components/leads/LeadHistory.tsx`
Substituir pelo componente melhorado que importa do novo hook `use-lead-history` e aplica os estilos aprimorados.

### 3. Manter `src/hooks/use-lead-full-history.ts`
Deixar o arquivo antigo intacto por enquanto — ele pode ter outras dependências. O componente `LeadHistory.tsx` passará a usar o novo hook.

## Technical Details

- O novo hook usa `queryKey: ['lead-history-v2', leadId]` — não conflita com cache existente
- `ACTIVITY_ONLY_TYPES` filtra apenas: `call`, `email`, `note`, `message`, `task_completed`, `contact_updated`, `automation_message` — evitando duplicação de eventos de sistema
- A query de `lead_timeline_events` busca pelo campo `created_at` (não `event_at` do hook antigo)
- O componente novo importa `formatResponseTime` de `use-lead-timeline` — exportação já existe

## Arquivos afetados

- `src/hooks/use-lead-history.ts` — criar (novo arquivo)
- `src/components/leads/LeadHistory.tsx` — substituir pelo conteúdo de `LeadHistory-2.tsx`
