
# Correção: Round Robin sem coluna `source_type`

## Problema Identificado

A função `handle_lead_intake` está tentando filtrar Round Robins por `rr.source_type`, mas essa coluna **não existe** na tabela `round_robins`.

**Erro atual:**
```
column rr.source_type does not exist
```

## Estrutura Real do Sistema

O sistema usa a tabela `round_robin_rules` para definir critérios de distribuição:

| match_type | Descrição | Exemplo de match |
|------------|-----------|------------------|
| `source` | Origem do lead | `{"source": ["meta"]}` |
| `meta_form_id` | Formulário específico | `{"meta_form_id": ["123"]}` |
| `webhook` | Webhook específico | `{"webhook_id": ["uuid"]}` |
| `interest_property` | Imóvel de interesse | `{"interest_property_id": "uuid"}` |

## Solução

Reescrever a lógica de distribuição para:

1. **Buscar Round Robins ativos** da organização
2. **Para cada Round Robin**, verificar se há regras que fazem match com o lead
3. **Priorizar** Round Robins com regras mais específicas
4. **Fallback** para Round Robin sem regras (catch-all)

## Nova Lógica (Simplificada)

```text
┌─────────────────────────────────────────────────────────┐
│  1. Buscar todos Round Robins ativos da organização     │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  2. Para cada RR, buscar regras ativas                  │
│     - Se match_type = 'meta_form_id' e lead tem         │
│       meta_form_id → verificar se está no array         │
│     - Se match_type = 'source' → verificar source       │
│     - Se match_type = 'interest_property' → verificar   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  3. Usar primeiro RR que fizer match                    │
│     OU RR sem regras (catch-all) como fallback          │
└─────────────────────────────────────────────────────────┘
```

## Correção SQL

A migração vai:

1. Remover referências a `source_type` (coluna inexistente)
2. Implementar busca por regras usando `round_robin_rules`
3. Adicionar lógica de fallback para Round Robin sem regras

## Mudanças Técnicas

| Antes | Depois |
|-------|--------|
| `WHERE rr.source_type = v_lead.source` | Busca em `round_robin_rules` com match JSONB |
| Fallback: `rr.source_type IS NULL` | Fallback: Round Robin sem regras cadastradas |

## Arquivo Afetado

- Nova migração SQL para recriar `handle_lead_intake`

## Resultado

Leads do Meta (e outras fontes) serão corretamente distribuídos baseados nas regras configuradas na Gestão CRM.
