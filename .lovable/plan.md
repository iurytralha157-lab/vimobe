
# Auto-preencher dados do imovel quando lead vem do site

## Problema
Quando um lead entra pelo site publico com interesse em um imovel especifico, o campo `interest_property_id` e salvo corretamente no banco. Porem, o `valor_interesse` e `commission_percentage` nao sao preenchidos automaticamente a partir dos dados do imovel. O usuario precisa manualmente selecionar o imovel de novo na aba "Negocio" para que esses valores sejam populados.

## Solucao
Atualizar a Edge Function `public-site-contact` para buscar os dados do imovel (preco e comissao) quando `property_id` for informado, e ja salvar esses valores no lead na criacao.

## Detalhes Tecnicos

### 1. Edge Function `supabase/functions/public-site-contact/index.ts`

Apos validar o `property_id`, buscar os dados do imovel antes de criar o lead:

```typescript
// Buscar dados do imovel se property_id informado
let propertyPrice = null;
let propertyCommission = null;

if (property_id) {
  const { data: property } = await supabase
    .from('properties')
    .select('preco, commission_percentage')
    .eq('id', property_id)
    .eq('organization_id', organization_id)
    .maybeSingle();

  if (property) {
    propertyPrice = property.preco;
    propertyCommission = property.commission_percentage;
  }
}
```

E incluir no `leadData` ao criar o lead:

```typescript
const leadData = {
  // ... campos existentes ...
  interest_property_id: property_id || null,
  valor_interesse: propertyPrice,          // NOVO
  commission_percentage: propertyCommission, // NOVO
};
```

### 2. Verificacao na atualizacao de lead existente

Quando o lead ja existe (deduplicacao por telefone), tambem atualizar o `interest_property_id`, `valor_interesse` e `commission_percentage` caso o contato venha de um imovel diferente:

```typescript
if (existingLead && property_id) {
  await supabase
    .from('leads')
    .update({
      interest_property_id: property_id,
      valor_interesse: propertyPrice,
      commission_percentage: propertyCommission,
    })
    .eq('id', existingLead.id);
}
```

### Resultado esperado
- Lead entra pelo site com interesse em imovel -> abre o card no CRM -> aba "Negocio" ja mostra o imovel selecionado, valor preenchido e comissao configurada
- Nenhuma alteracao no frontend necessaria, pois o `LeadDetailDialog` ja le esses campos do lead
