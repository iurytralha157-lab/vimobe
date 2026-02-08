
# Correção: Registrar `lead_created` Antes de Retornar

## Problema Identificado

A migração recente que removeu o fallback de distribuição também removeu o registro do evento `lead_created`. A função `handle_lead_intake` retorna cedo quando não há regra:

```sql
-- Linha 47-53 da migração atual
IF v_round_robin_id IS NULL THEN
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'No matching distribution rule - lead will remain in pool'
  );
  -- ❌ NÃO registra lead_created antes de sair!
END IF;
```

Na versão anterior, o evento era registrado **após** toda a lógica de distribuição (linhas 439-464), então sempre era executado. Agora que retornamos cedo, o evento nunca é criado para leads sem regra.

---

## Solução

Registrar o evento `lead_created` **antes** de verificar se há regra de distribuição. Isso garante que todo lead que entra no sistema tenha seu histórico de origem registrado, independente de ser distribuído ou não.

---

## Migração SQL

Atualizar `handle_lead_intake` para:

1. **Mover a lógica de registro `lead_created` para o início** da função (logo após buscar os dados do lead)
2. **Incluir informações da origem** no metadata (source, meta_form_id, etc.)
3. **Criar atividade com label dinâmico** ("Lead criado via Meta Ads", "Lead criado via Webhook", etc.)

---

## Mudanças no Frontend

Atualizar `src/hooks/use-lead-full-history.ts`:

1. **Melhorar label de `lead_created`** para usar o source do metadata
2. **Consolidar eventos duplicados** - filtrar eventos de "assignee_changed" intermediários que acontecem no mesmo segundo

---

## Resultado Esperado

Histórico do lead mostrará:

| Evento | Descrição |
|--------|-----------|
| 🎯 Lead criado via Meta Ads | Primeiro evento, mostra origem |
| 📋 Iniciado no estágio Base | (se foi para pipeline) |
| 👤 Distribuído por "Fila X" → Fulano | (se houve distribuição) |

Para leads no pool (sem distribuição):

| Evento | Descrição |
|--------|-----------|
| 🎯 Lead criado via Meta Ads | Primeiro evento, mostra origem |

---

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| Migração SQL | Atualizar `handle_lead_intake` para registrar `lead_created` no início |
| `src/hooks/use-lead-full-history.ts` | Melhorar label de eventos `lead_created` baseado no source |
