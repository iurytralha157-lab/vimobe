

# Plano: Corrigir Filtro de Data (Timezone) na Página de Contatos

## Problema Identificado

Os leads do Meta **existem** no banco de dados e estão na Pipeline corretamente, mas **não aparecem** na página de Contatos devido a um problema de **timezone** no filtro de data.

### O que está acontecendo:

```text
Horário atual no Brasil: 2026-02-08 23:01 (UTC-3)
Horário atual no servidor: 2026-02-09 02:01 (UTC)

Filtro enviado: p_created_to = "2026-02-08T23:59:59" (sem timezone)
Lead criado em: 2026-02-09T01:55:40+00:00 (UTC)

O servidor interpreta "2026-02-08T23:59:59" como UTC
Como 01:55 UTC > 23:59 UTC → lead NÃO aparece
```

### Por que isso acontece:

1. O navegador calcula `endOfDay(new Date())` usando o fuso local (Brasil)
2. Retorna `2026-02-08T23:59:59` (fim do dia 08 no Brasil)
3. Formata **sem timezone**: `yyyy-MM-dd'T'HH:mm:ss`
4. Envia para o servidor que interpreta como UTC
5. Leads criados depois de 23:59 UTC do dia 08 ficam de fora

---

## Solução

Modificar a formatação das datas para incluir **offset de timezone** ou usar **ISO 8601 com Z**.

### Opção escolhida: Formatar com timezone

Alterar de:
```javascript
format(dateRange.to, "yyyy-MM-dd'T'HH:mm:ss")
```

Para:
```javascript
dateRange.to.toISOString()
```

Isso garante que `2026-02-08T23:59:59` no Brasil seja enviado como `2026-02-09T02:59:59.999Z` (UTC correto).

---

## Arquivos a Modificar

### 1. `src/pages/Contacts.tsx`

**Linhas 141-142** - Alterar formatação das datas:

```typescript
// ANTES
createdFrom: dateRange ? format(dateRange.from, "yyyy-MM-dd'T'HH:mm:ss") : undefined,
createdTo: dateRange ? format(dateRange.to, "yyyy-MM-dd'T'HH:mm:ss") : undefined,

// DEPOIS
createdFrom: dateRange ? dateRange.from.toISOString() : undefined,
createdTo: dateRange ? dateRange.to.toISOString() : undefined,
```

### 2. `src/lib/export-contacts.ts` (se existir a mesma lógica)

Verificar e aplicar a mesma correção para a exportação.

---

## Resultado Esperado

Após a correção:

| Antes | Depois |
|-------|--------|
| `p_created_to = "2026-02-08T23:59:59"` | `p_created_to = "2026-02-09T02:59:59.999Z"` |
| Leads de 09/02 UTC não aparecem | Leads de 09/02 UTC aparecem ✅ |

Os 2 leads do Meta ("vetter company" e "test lead") passarão a aparecer na página de Contatos.

---

## Seção Técnica

### Mudança no código:

**Arquivo**: `src/pages/Contacts.tsx`

```typescript
// Linha 141-142 - Mudar de:
createdFrom: dateRange ? format(dateRange.from, "yyyy-MM-dd'T'HH:mm:ss") : undefined,
createdTo: dateRange ? format(dateRange.to, "yyyy-MM-dd'T'HH:mm:ss") : undefined,

// Para:
createdFrom: dateRange ? dateRange.from.toISOString() : undefined,
createdTo: dateRange ? dateRange.to.toISOString() : undefined,
```

### Por que `toISOString()`:

- Sempre retorna UTC com sufixo `Z`
- Exemplo: `2026-02-09T02:59:59.999Z`
- O PostgreSQL interpreta corretamente como UTC
- Compara corretamente com `timestamptz` do banco

### Verificação necessária:

A função RPC `list_contacts_paginated` já faz:
```sql
l.created_at <= p_created_to::timestamptz
```

Isso funciona corretamente com ISO 8601/UTC.

