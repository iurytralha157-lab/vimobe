
# Análise e Correção do Sistema de Distribuição

## Diagnóstico Detalhado

### Situação Atual (Confirmada via Banco de Dados)

| Lead | Responsável | Tempo para Atribuição | Status |
|------|-------------|----------------------|--------|
| Tiago (imagem) | Maikson | 0 segundos | ✅ Atribuído |
| Lucct | Maikson | 0 segundos | ✅ Atribuído |
| DAYANARA | Distribuído | 0 segundos | ✅ Atribuído |
| Gustavo | Distribuído | 0 segundos | ✅ Atribuído |

**Conclusão**: O sistema de distribuição está funcionando corretamente. Todos os leads estão sendo atribuídos instantaneamente.

### Causa Raiz do Badge "Sem Responsável"

O problema visual identificado na imagem ocorre por um **delay de sincronização entre o banco e a UI**:

```text
Fluxo Atual:
┌─────────────────────────────────────────────────────────────────┐
│ 1. Webhook recebe payload                                       │
│ 2. INSERT lead (assigned_user_id = null)                       │
│ 3. Trigger AFTER INSERT → handle_lead_intake()                 │
│ 4. Lead é atribuído via round-robin (banco atualizado)         │
│ 5. Realtime subscription dispara evento                        │
│ 6. Frontend refetch() → UI atualizada                          │
└─────────────────────────────────────────────────────────────────┘
       └── Entre 3 e 6 há um delay de ~100-500ms onde a UI 
           pode mostrar "Sem responsável" temporariamente
```

## Correções Propostas

### 1. Melhorar Resposta do Webhook

Após criar o lead, buscar os dados atualizados (pós-trigger) antes de retornar:

**Arquivo**: `supabase/functions/generic-webhook/index.ts`

```typescript
// Após INSERT, buscar dados atualizados pelo trigger
const { data: finalLead } = await supabase
  .from('leads')
  .select('id, pipeline_id, stage_id, assigned_user_id')
  .eq('id', lead.id)
  .single();

return new Response(
  JSON.stringify({
    success: true,
    lead_id: finalLead?.id,
    pipeline_id: finalLead?.pipeline_id,
    stage_id: finalLead?.stage_id,
    assigned_user_id: finalLead?.assigned_user_id, // Valor correto pós-trigger
  }),
  ...
);
```

### 2. Adicionar Debounce na Subscription Realtime

Evitar flickering visual com um pequeno delay antes do refetch:

**Arquivo**: `src/pages/Pipelines.tsx`

```typescript
// Adicionar debounce de 200ms para evitar flickering
let refetchTimeout: NodeJS.Timeout;

.on('postgres_changes', { ... }, () => {
  if (!isDraggingRef.current) {
    clearTimeout(refetchTimeout);
    refetchTimeout = setTimeout(() => refetch(), 200);
  }
})
```

### 3. Melhorar Loading State no LeadCard

Mostrar um estado transitório durante a atribuição:

**Arquivo**: `src/components/leads/LeadCard.tsx`

```typescript
// Se o lead foi criado há menos de 3 segundos e não tem responsável,
// mostrar "Atribuindo..." ao invés de "Sem responsável"
const isRecentlyCreated = lead.created_at && 
  (Date.now() - new Date(lead.created_at).getTime()) < 3000;

{!lead.assignee && isRecentlyCreated ? (
  <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 animate-pulse">
    <Loader2 className="h-2 w-2 mr-1 animate-spin" />
    Atribuindo...
  </Badge>
) : !lead.assignee ? (
  <Badge variant="destructive" ...>
    Sem responsável
  </Badge>
) : (
  // Avatar do responsável
)}
```

## Arquivos a Modificar

1. `supabase/functions/generic-webhook/index.ts` - Buscar dados finais pós-trigger
2. `src/pages/Pipelines.tsx` - Debounce na subscription realtime
3. `src/components/leads/LeadCard.tsx` - Estado "Atribuindo..." para leads recentes

## Impacto no Tempo de Resposta

O sistema de distribuição **não está afetando** o cálculo de tempo de resposta. O campo `first_response_at` permanece `null` até que o corretor faça contato real via:
- WhatsApp (automático)
- Telefone (clique no botão)
- Email (clique no botão)

A distribuição instantânea (0 segundos) garante que o corretor receba o lead imediatamente para iniciar o atendimento.

## Detalhes Técnicos

### Verificação do Trigger

```sql
-- O trigger AFTER INSERT está ativo e funcionando:
CREATE TRIGGER trigger_lead_intake 
  AFTER INSERT ON public.leads 
  FOR EACH ROW 
  EXECUTE FUNCTION public.trigger_handle_lead_intake();
```

### Verificação da Fila de Distribuição

A organização tem uma fila ativa configurada:
- **Nome**: "venda"
- **Regra**: webhook_id = 450fb731-9e8a-4de5-8bb1-54eac611340f
- **Estratégia**: Simple Round Robin
- **Membros**: 6 participantes

### Dados do Lead "Tiago" (Confirmado no Banco)

| Campo | Valor |
|-------|-------|
| `assigned_user_id` | 2a6c45cd-0cca-49a0-8db4-fb8d6114ed27 |
| `assignee_name` | Maikson |
| `created_at` | 2026-02-06 17:51:58 |
| `assigned_at` | 2026-02-06 17:51:58 (mesmo momento) |
| `distribution_queue` | "venda" |
