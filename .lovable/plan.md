
# Correção do Sistema de Imóvel de Interesse

## Problema Identificado

Os leads chegam do webhook com o imóvel de interesse corretamente vinculado (exibindo R$1.3M no card), porém quando o usuário abre os detalhes do negócio, o campo mostra "Nenhum" e valor "R$ 0".

### Causa Raiz

Existem **duas colunas diferentes** no banco de dados:

| Coluna | Uso | Status |
|--------|-----|--------|
| `interest_property_id` | Nova - usada pelo webhook | Preenchida corretamente |
| `property_id` | Legacy - usada pelo formulário de edição | NULL |

O **LeadCard** lê de `interest_property` (relacionamento com `interest_property_id`) e funciona.
O **LeadDetailDialog** lê de `property_id` (coluna diferente) e não encontra nada.

Além disso, o webhook não está preenchendo o `valor_interesse` automaticamente a partir do preço do imóvel.

## Dados Confirmados no Banco

```text
Lead: Tiago
├── interest_property_id: 4e54dd44-acce-4aeb-b637-c3a01555b9a1 ✅
├── property_id: NULL ❌ (LeadDetailDialog lê daqui)
├── valor_interesse: 0 ❌ (deveria ser R$1.300.000)
└── Imóvel: CA0003 - casa de alto padrão (R$1.300.000)
```

## Correções Necessárias

### 1. Webhook: Preencher `valor_interesse` automaticamente

**Arquivo**: `supabase/functions/generic-webhook/index.ts`

Ao criar o lead com `interest_property_id`, buscar o preço do imóvel e preencher `valor_interesse`:

```typescript
// Buscar preço do imóvel resolvido
let valorInteresse = null;
if (resolvedPropertyId) {
  const { data: prop } = await supabase
    .from('properties')
    .select('preco')
    .eq('id', resolvedPropertyId)
    .maybeSingle();
  valorInteresse = prop?.preco || null;
}
if (resolvedPlanId && !valorInteresse) {
  const { data: plan } = await supabase
    .from('service_plans')
    .select('price')
    .eq('id', resolvedPlanId)
    .maybeSingle();
  valorInteresse = plan?.price || null;
}

// No INSERT, incluir:
valor_interesse: valorInteresse,
```

### 2. LeadDetailDialog: Usar `interest_property_id`

**Arquivo**: `src/components/leads/LeadDetailDialog.tsx`

**Mudança 1** - Atualizar o estado inicial do formulário (linha ~188):
```typescript
// De:
property_id: lead.property_id || '',

// Para:
interest_property_id: lead.interest_property_id || '',
interest_plan_id: lead.interest_plan_id || '',
```

**Mudança 2** - Atualizar o Select de imóvel (linhas ~1244-1274):
```typescript
// De:
<Select value={editForm.property_id || 'none'} onValueChange={...}>

// Para:
<Select value={lead.interest_property_id || 'none'} onValueChange={value => {
  const newValue = value === 'none' ? null : value;
  const selectedProperty = properties.find((p: any) => p.id === value);
  updateLead.mutateAsync({
    id: lead.id,
    interest_property_id: newValue,
    valor_interesse: selectedProperty?.preco || lead.valor_interesse
  }).then(() => refetchStages());
}}>
```

**Mudança 3** - Mesmo ajuste para Telecom (interest_plan_id):
```typescript
<Select value={lead.interest_plan_id || 'none'} onValueChange={value => {
  const newValue = value === 'none' ? null : value;
  const selectedPlan = servicePlans.find((p: any) => p.id === value);
  updateLead.mutateAsync({
    id: lead.id,
    interest_plan_id: newValue,
    valor_interesse: selectedPlan?.price || lead.valor_interesse
  }).then(() => refetchStages());
}}>
```

### 3. Atualizar leads existentes (SQL de correção)

Para corrigir os leads já criados com `valor_interesse = 0`:

```sql
UPDATE leads l
SET valor_interesse = p.preco
FROM properties p
WHERE l.interest_property_id = p.id
  AND (l.valor_interesse IS NULL OR l.valor_interesse = 0)
  AND p.preco > 0;
```

## Arquivos a Modificar

1. `supabase/functions/generic-webhook/index.ts` - Preencher `valor_interesse` ao criar lead
2. `src/components/leads/LeadDetailDialog.tsx` - Usar `interest_property_id` no formulário

## Fluxo Corrigido

```text
Webhook recebe lead
      │
      ▼
Resolve interest_property_id → busca preco
      │
      ▼
Cria lead com:
├── interest_property_id: UUID do imóvel
└── valor_interesse: R$1.300.000 (preço do imóvel)
      │
      ▼
LeadCard exibe: R$1.3M ✅
      │
      ▼
LeadDetailDialog lê interest_property_id
└── Mostra: "CA0003 - casa de alto padrão" ✅
```

## Benefícios

1. **Consistência**: O valor exibido no card será o mesmo nos detalhes
2. **Automação**: `valor_interesse` preenchido automaticamente
3. **UX**: Corretor não precisa reselecionar o imóvel manualmente
