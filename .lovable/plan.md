

# Correcao: Plano de interesse nao salva no Lead (versao mobile)

## Problema Identificado

O dialogo de detalhes do lead (`LeadDetailDialog.tsx`) possui **duas versoes do layout** - uma para desktop e outra para mobile. A versao **mobile** do seletor de plano telecom esta usando o campo errado (`property_id` ao inves de `interest_plan_id`), fazendo com que:

1. O plano selecionado pelo vendedor seja salvo no campo `property_id` (imovel) ao inves de `interest_plan_id` (plano)
2. O plano nunca apareca como selecionado ao reabrir o lead (le do campo errado)
3. O valor de interesse pode nao ser atualizado corretamente

A versao desktop funciona corretamente.

## Alteracoes Necessarias

### Arquivo: `src/components/leads/LeadDetailDialog.tsx`

**Linhas 1940-1956** - Corrigir o seletor de plano na versao mobile:

- Trocar `editForm.property_id` por `lead.interest_plan_id` no `value` do Select (consistente com versao desktop)
- Trocar `property_id: newValue` por `interest_plan_id: newValue` no `setEditForm` (embora editForm nao tenha esse campo, o que importa e o update)
- Trocar `property_id: newValue || null` por `interest_plan_id: newValue || null` no `updateLead.mutateAsync`
- Manter o comportamento identico a versao desktop (linhas 1209-1221)

### Detalhes Tecnicos

Antes (com bug - linhas 1940-1956):
```text
Select value={editForm.property_id || 'none'}
  -> setEditForm({ property_id: newValue })
  -> updateLead({ id: lead.id, property_id: newValue || null })
```

Depois (corrigido):
```text
Select value={lead.interest_plan_id || 'none'}
  -> setEditForm({ valor_interesse: planPrice... })
  -> updateLead({ id: lead.id, interest_plan_id: newValue, valor_interesse: planPrice || lead.valor_interesse })
```

## Impacto

- Corrige o salvamento de plano para vendedores que usam o sistema no celular
- Leads que tiveram plano selecionado via mobile podem ter valores incorretos no campo `property_id` - isso pode ser verificado no banco se necessario
- Nenhuma alteracao de banco de dados necessaria, apenas correcao no frontend

