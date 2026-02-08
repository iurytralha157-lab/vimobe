
# Correção: Imóvel de Interesse e Valor Automático no Meta Webhook

## Problemas Identificados

### 1. Campo Errado para Imóvel
| Situação Atual | Esperado |
|----------------|----------|
| `property_id: 3bdc4ceb...` | `interest_property_id: 3bdc4ceb...` |
| `interest_property_id: null` | ← Deveria ter o imóvel aqui |

O lead do Andre está com o imóvel no campo `property_id` (campo legado), mas o CRM usa `interest_property_id` para exibir o imóvel de interesse.

### 2. Valor de Interesse Não Preenchido
| Campo | Valor Atual | Esperado |
|-------|-------------|----------|
| `valor_interesse` | 0 | R$ 2.250.000 |

O imóvel configurado (Casa alto padrão) tem `preco = 2.250.000`, mas o webhook não busca esse valor.

---

## Solução

**Arquivo:** `supabase/functions/meta-webhook/index.ts`

### Mudança 1: Usar `interest_property_id` em vez de `property_id`

```typescript
// ANTES (linha 223):
property_id: propertyId,

// DEPOIS:
interest_property_id: propertyId,
```

### Mudança 2: Buscar preço do imóvel automaticamente

Adicionar antes do INSERT do lead:

```typescript
// Se tem imóvel configurado, buscar o preço
let valorInteresse: number | null = null;
if (propertyId) {
  const { data: property } = await supabase
    .from("properties")
    .select("preco")
    .eq("id", propertyId)
    .single();
  
  if (property?.preco) {
    valorInteresse = property.preco;
    console.log(`Property price fetched: R$ ${valorInteresse}`);
  }
}
```

### Mudança 3: Incluir `valor_interesse` no INSERT

```typescript
const { data: newLead, error: leadError } = await supabase
  .from("leads")
  .insert({
    organization_id: integration.organization_id,
    name,
    email,
    phone,
    message: message || `Lead gerado via Facebook Lead Ads`,
    source: "meta",
    pipeline_id: null,
    stage_id: null,
    interest_property_id: propertyId,  // ← CORRIGIDO
    valor_interesse: valorInteresse,   // ← NOVO
    assigned_user_id: null,
    meta_lead_id: leadgenId,
    meta_form_id: formId,
  })
```

---

## Resultado Esperado

Após a correção, leads do Meta virão com:

| Campo | Valor |
|-------|-------|
| `interest_property_id` | ID do imóvel configurado no formulário |
| `valor_interesse` | Preço do imóvel buscado automaticamente |
| `property_id` | `null` (não usado) |

O painel de rastreamento exibirá corretamente o imóvel de interesse com seu valor.

---

## Sobre a Distribuição Automática

O lead foi distribuído porque existe um **fallback** na função `handle_lead_intake`:

```sql
-- Linha 39-52 do trigger
SELECT id INTO v_queue_id
FROM distribution_queues
WHERE organization_id = NEW.organization_id
  AND is_active = true
ORDER BY created_at ASC  -- Pega a fila mais antiga
LIMIT 1;
```

Como não existe regra específica para `source = 'meta'`, o sistema usou a fila **"Webhooks"** (mais antiga ativa) como fallback.

**Opção:** Se quiser que leads do Meta aguardem no pool sem distribuição automática, posso criar uma regra específica ou desativar o fallback.
