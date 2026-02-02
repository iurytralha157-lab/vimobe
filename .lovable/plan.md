

# Plano: Corrigir Inconsistência no Filtro de Data em Contatos

## Problema Identificado

O usuário relatou que um lead aparece na **Pipeline** mas não em **Contatos**. Após investigação, identifiquei duas causas:

### 1. Comportamento diferente entre Pipeline e Contatos

| Página | Filtro Padrão | Tipo de Filtro |
|--------|---------------|----------------|
| **Pipeline** | `last30days` | Client-side (após buscar todos) |
| **Contatos** | `null` (sem filtro) | Server-side (no banco) |

Quando o usuário seleciona um período específico (ex: "Hoje") em Contatos e não há leads nesse período, a lista fica vazia.

### 2. Inconsistência visual no DateFilterPopover

Na página de Contatos:
- O estado `datePreset` começa como `null` (sem filtro = mostra todos)
- Mas o botão exibe "Últimos 30 dias" porque usa `datePreset || 'last30days'`
- Isso confunde o usuário sobre qual filtro está realmente ativo

---

## Solução

Corrigir a página de Contatos para ter comportamento consistente com a Pipeline:

### Mudança 1: Iniciar com `'last30days'` ao invés de `null`

Em `src/pages/Contacts.tsx`, linha 98:

```typescript
// ANTES
const [datePreset, setDatePreset] = useState<DatePreset | null>(null);

// DEPOIS  
const [datePreset, setDatePreset] = useState<DatePreset>('last30days');
```

### Mudança 2: Atualizar tipo e lógica do dateRange

```typescript
// ANTES (linhas 121-129)
const dateRange = useMemo(() => {
  if (customDateRange) return customDateRange;
  if (datePreset) return getDateRangeFromPreset(datePreset);
  return null;
}, [datePreset, customDateRange]);

// DEPOIS
const dateRange = useMemo(() => {
  if (customDateRange) return customDateRange;
  return getDateRangeFromPreset(datePreset);
}, [datePreset, customDateRange]);
```

### Mudança 3: Atualizar o DateFilterPopover

```typescript
// ANTES (linhas 417-425)
<DateFilterPopover
  datePreset={datePreset || 'last30days'}
  ...
/>

// DEPOIS
<DateFilterPopover
  datePreset={datePreset}
  ...
/>
```

---

## Resultado Esperado

Após a correção:

- **Pipeline** e **Contatos** terão o mesmo comportamento inicial (últimos 30 dias)
- O botão de data mostrará corretamente o filtro ativo
- Quando o usuário selecionar "Hoje" e não houver leads, ficará claro que é por causa do filtro
- O usuário pode usar "Limpar filtros" para ver todos os contatos

---

## Resumo das Mudanças

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Contacts.tsx` | Mudar estado inicial de `null` para `'last30days'` e ajustar lógica |

---

## Seção Técnica

### Por que o problema acontece

A página de Contatos foi projetada originalmente para não ter filtro de data por padrão (`datePreset = null`), mostrando todos os contatos. Porém:

1. O `DateFilterPopover` usa `datePreset || 'last30days'` como fallback visual
2. Isso faz o botão mostrar "Últimos 30 dias" mesmo quando não há filtro
3. Quando o usuário clica em um preset (ex: "Hoje"), o filtro é aplicado no servidor
4. Se não há leads nesse período, a lista fica vazia

Na Pipeline, o filtro padrão é `'last30days'` e é aplicado client-side após buscar até 500 leads, criando um comportamento diferente.

### Diferença técnica entre as páginas

```typescript
// Pipeline - filtra CLIENT-SIDE
const leads = await supabase.from('leads').select('*').limit(500);
const filtered = leads.filter(l => isWithinInterval(l.created_at, dateRange));

// Contatos - filtra SERVER-SIDE (RPC)
const contacts = await supabase.rpc('list_contacts_paginated', {
  p_created_from: dateRange.from,
  p_created_to: dateRange.to
});
```

A solução proposta alinha o comportamento inicial das duas páginas.

