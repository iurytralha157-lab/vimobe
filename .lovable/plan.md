
# Correcao de 8 Problemas no Pipeline/Kanban

## 1. [BUG] Deletar pipeline com leads existentes

**Problema**: `useDeletePipeline` deleta stages diretamente, mas leads possuem FK `stage_id` referenciando `stages.id` sem `ON DELETE CASCADE`. O delete falha silenciosamente.

**Solucao**: Reescrever `useDeletePipeline` para:
- Contar leads nas stages da pipeline antes de qualquer acao
- Se houver leads, exibir erro com contagem e impedir a delecao
- Somente deletar a pipeline se todas as stages estiverem vazias
- Adicionar migracao SQL com `ON DELETE CASCADE` em `stages.pipeline_id -> pipelines.id` (stages sao deletadas com a pipeline), mas manter a FK de `leads.stage_id -> stages.id` SEM cascade (leads nao devem ser deletados automaticamente)

**Arquivos**: `src/hooks/use-stages.ts` (reescrever `useDeletePipeline`), migracao SQL

---

## 2. [FEATURE QUEBRADA] tasks_count nunca carregado no LeadCard

**Problema**: `LEAD_PIPELINE_FIELDS` nao inclui `tasks_count`, entao `lead.tasks_count?.pending` e sempre `0`.

**Solucao**: Adicionar uma subquery ao enriquecimento dos leads em `useStagesWithLeads` que busca contagem de tarefas por lead da tabela `lead_tasks`, agrupando por `is_done`. Injetar como `tasks_count: { pending, completed }` em cada lead enriquecido.

**Arquivos**: `src/hooks/use-stages.ts` (dentro de `useStagesWithLeads` e `useLoadMoreLeads`)

---

## 3. [PERFORMANCE] Query whatsapp_conversations sem filtro

**Problema**: `supabase.from('whatsapp_conversations').select(...)` sem filtro traz TODAS as conversas da org para fazer match por telefone client-side.

**Solucao**: Coletar os telefones normalizados dos leads carregados e usar `.in('contact_phone', phoneNumbers)` para filtrar server-side. Isso reduz drasticamente o volume de dados transferidos.

**Arquivos**: `src/hooks/use-stages.ts` (blocos de busca WhatsApp em `useStagesWithLeads` e `useLoadMoreLeads`)

---

## 4. [UX] Automacao consultada ANTES do optimistic update

**Problema**: No `handleDragEnd`, a query `supabase.from('stage_automations')` e `await`ed ANTES do `queryClient.setQueryData`. O usuario solta o card e espera a resposta do banco antes de ver o card se mover.

**Solucao**: 
1. Aplicar o update otimista IMEDIATAMENTE (mover o card visualmente)
2. Buscar automacoes em paralelo 
3. Se houver automacao de `deal_status`, aplicar um SEGUNDO update otimista no cache com o status correto
4. O toast de status aparece apos a confirmacao

**Arquivos**: `src/pages/Pipelines.tsx` (funcao `handleDragEnd`)

---

## 5. [DADOS ENGANOSOS] Filtros client-side com paginacao incompleta

**Problema**: Filtros de data/tag/status sao aplicados apenas nos 100 leads carregados por stage. Leads que atendem ao filtro mas estao alem dos 100 nao aparecem.

**Solucao**: Quando qualquer filtro esta ativo e o stage tem `has_more = true`, exibir um aviso visual no rodape da coluna: "Filtro ativo - alguns resultados podem nao estar visiveis. Carregue mais para ver todos." Isso alerta o usuario sem necessidade de refatorar para server-side.

**Arquivos**: `src/pages/Pipelines.tsx` (renderizacao do footer de cada coluna do kanban)

---

## 6. [EDGE CASE] isRecentlyCreated com janela de 3 segundos

**Problema**: O badge "Atribuindo..." desaparece apos 3s, mas o round-robin pode demorar mais, levando o usuario a ver "Sem responsavel" e clicar em atribuir manualmente (dupla atribuicao).

**Solucao**: Aumentar a janela para 10 segundos e adicionar um estado local `recentlyCreatedLeadIds` no componente pai que rastreia leads criados via `createLead.mutate()`. Esse estado so e limpo apos o refetch trazer o lead com `assigned_user_id` preenchido, garantindo que o badge persista ate a atribuicao real acontecer.

**Arquivos**: `src/components/leads/LeadCard.tsx`, `src/pages/Pipelines.tsx`

---

## 7. [PERFORMANCE] Subscription lead_tags sem filtro

**Problema**: Qualquer mudanca em `lead_tags` (qualquer lead da org) dispara refetch completo da pipeline.

**Solucao**: Remover a subscription de `lead_tags` do realtime. Em vez disso, invalidar o cache de `stages-with-leads` manualmente quando tags sao adicionadas/removidas via UI (ja acontece nas mutations de tags). Isso elimina refetches desnecessarios causados por automacoes de tags.

**Arquivos**: `src/pages/Pipelines.tsx` (remover bloco `.on('postgres_changes', { table: 'lead_tags' })`)

---

## 8. [EFICIENCIA] N queries separadas no reorder de stages

**Problema**: `StagesEditorDialog` faz N requests paralelos para atualizar posicao de N stages.

**Solucao**: Criar uma funcao RPC `reorder_stages(p_stages jsonb)` que recebe um array de `{id, position, name, color}` e faz o update em um unico round-trip no banco. O frontend chamara `supabase.rpc('reorder_stages', { p_stages: [...] })`.

**Arquivos**: Migracao SQL (nova funcao RPC), `src/components/pipelines/StagesEditorDialog.tsx`

---

## Detalhes Tecnicos

### Migracao SQL necessaria

```sql
-- 1. CASCADE em stages -> pipelines
ALTER TABLE stages DROP CONSTRAINT IF EXISTS stages_pipeline_id_fkey;
ALTER TABLE stages ADD CONSTRAINT stages_pipeline_id_fkey 
  FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE;

-- 2. Funcao RPC para reorder em batch
CREATE OR REPLACE FUNCTION reorder_stages(p_stages jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  stage_item jsonb;
BEGIN
  FOR stage_item IN SELECT * FROM jsonb_array_elements(p_stages)
  LOOP
    UPDATE stages SET 
      position = (stage_item->>'position')::int,
      name = stage_item->>'name',
      color = stage_item->>'color'
    WHERE id = (stage_item->>'id')::uuid;
  END LOOP;
END;
$$;
```

### Ordem de implementacao

1. Migracao SQL (CASCADE + RPC reorder_stages)
2. `use-stages.ts` - corrigir deleteP pipeline, tasks_count, filtro WhatsApp
3. `Pipelines.tsx` - optimistic update imediato, remover subscription lead_tags, aviso de filtro
4. `StagesEditorDialog.tsx` - usar RPC reorder_stages
5. `LeadCard.tsx` / `Pipelines.tsx` - melhorar isRecentlyCreated
