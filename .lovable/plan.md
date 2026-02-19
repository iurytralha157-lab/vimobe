
# Correção: Canal em Português no Banner de Primeira Resposta

## Dois problemas confirmados no código

### Problema 1 — Canal exibido em inglês (LeadHistory.tsx)

**Linha 196** (banner amarelo de primeira resposta):
```tsx
{firstResponseEvent.channel === 'whatsapp' ? 'WhatsApp' : firstResponseEvent.channel}
```
Resultado: exibe `"phone"` ou `"email"` em inglês quando o canal não é WhatsApp.

**Linha 283** (badge inline na timeline):
```tsx
{event.channel === 'whatsapp' ? 'WhatsApp' : event.channel}
```
Mesmo problema.

**Fix**: Substituir por um mapa de tradução completo:
```tsx
const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  phone: 'Telefone',
  email: 'E-mail',
  stage_move: 'Movimentação',
};
// Uso:
{CHANNEL_LABELS[firstResponseEvent.channel] || firstResponseEvent.channel}
```

---

### Problema 2 — Canal `null` no evento `first_response` (use-lead-history.ts)

**Linha 285** (mapeamento de eventos de timeline):
```ts
channel: e.channel || null,
```

A edge function `calculate-first-response` salva o canal **dentro do campo `metadata`**, não em uma coluna `channel` separada da tabela `lead_timeline_events`. Portanto `e.channel` é sempre `null` para eventos `first_response`.

O `metadata` do evento contém:
```json
{
  "channel": "phone",
  "response_seconds": 142,
  "start_time": "..."
}
```

**Fix**: Ler `metadata.channel` como fallback:
```ts
channel: e.channel || meta.channel || null,
```

Isso garante que o canal seja lido corretamente tanto de colunas dedicadas quanto do campo metadata.

---

## Arquivos a modificar

### `src/hooks/use-lead-history.ts`
- **Linha 285**: `channel: e.channel || null` → `channel: e.channel || meta.channel || null`

### `src/components/leads/LeadHistory.tsx`
- Adicionar constante `CHANNEL_LABELS` no topo do arquivo
- **Linha 196**: substituir ternário por `CHANNEL_LABELS[...] || channel`
- **Linha 283**: substituir ternário por `CHANNEL_LABELS[...] || channel`

---

## Impacto

| Cenário | Antes | Depois |
|---|---|---|
| Tarefa de Ligação concluída → first_response via `phone` | Badge mostra: `"phone"` | Badge mostra: `"Telefone"` |
| Tarefa de Email concluída → first_response via `email` | Badge mostra: `"email"` | Badge mostra: `"E-mail"` |
| first_response via WhatsApp | Badge mostra: `"WhatsApp"` (OK) | Sem mudança |
| first_response via stage_move | Badge mostra: `"stage_move"` | Badge mostra: `"Movimentação"` |
| Canal null no banner | Canal não aparece (metadata não lido) | Canal aparece corretamente |

Nenhuma migration SQL necessária — correção 100% no frontend.
