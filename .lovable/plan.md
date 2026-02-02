

# Plano: Corrigir Distribuição de Leads via Webhook

## Problema Identificado

A função de distribuição `handle_lead_intake` no banco de dados está falhando silenciosamente porque referencia uma coluna que não existe:

- **Função usa**: `v_queue.current_position`
- **Coluna real na tabela**: `last_assigned_index`

Isso faz com que os leads sejam criados corretamente, mas **não sejam distribuídos** para pipeline/estágio e responsável.

### Evidência nos logs do banco:
```
ERROR: record "v_queue" has no field "current_position"
```

### Leads afetados (exemplos recentes):
| Lead | Status |
|------|--------|
| Luiz Vieira | pipeline_id: null, assigned: null |
| Edney Carlos | pipeline_id: null, assigned: null |
| João Batista | pipeline_id: null, assigned: null |

---

## Solução

Criar uma migration para corrigir a função `handle_lead_intake`, trocando todas as referências de `current_position` para `last_assigned_index`.

### Linhas a corrigir na função:

1. **Linha ~99**: `v_next_index := COALESCE(v_queue.current_position, 0);`
   - Trocar para: `v_next_index := COALESCE(v_queue.last_assigned_index, 0);`

2. **Linha ~118-120**: `UPDATE round_robins SET current_position = ...`
   - Trocar para: `UPDATE round_robins SET last_assigned_index = ...`

---

## Implementação

Criar migration SQL que:

1. Recria a função `handle_lead_intake` com a coluna correta
2. Mantém toda a lógica existente (distribuição, atividades, redistribuição)

### Código da correção:

```sql
-- Fix handle_lead_intake: trocar current_position por last_assigned_index
CREATE OR REPLACE FUNCTION public.handle_lead_intake(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  -- ... declarações mantidas ...
BEGIN
  -- ... lógica mantida ...
  
  -- CORREÇÃO: usar last_assigned_index ao invés de current_position
  v_next_index := COALESCE(v_queue.last_assigned_index, 0);
  
  -- ... mais lógica ...
  
  -- CORREÇÃO: atualizar last_assigned_index ao invés de current_position
  UPDATE round_robins 
  SET last_assigned_index = (v_next_index + 1) % v_member_count
  WHERE id = v_round_robin_id;
  
  -- ... resto da função ...
END;
$function$;
```

---

## Ação Adicional

Após aplicar a correção, podemos redistribuir os leads que ficaram "órfãos" chamando manualmente a função para cada um:

```sql
-- Redistribuir leads sem responsável
SELECT handle_lead_intake(id) 
FROM leads 
WHERE assigned_user_id IS NULL 
  AND created_at > '2026-02-02'
  AND source = 'webhook';
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/migrations/[nova].sql` | Recriar função com coluna correta |

---

## Resultado Esperado

- Leads vindos de webhook serão automaticamente distribuídos
- Pipeline e estágio serão atribuídos conforme configuração da fila
- Responsável será atribuído via round-robin
- Leads órfãos serão redistribuídos

---

## Seção Técnica

### Diferença entre as colunas

| Nome Atual | Nome na Função | Consequência |
|------------|----------------|--------------|
| `last_assigned_index` | `current_position` (errado) | Erro e falha silenciosa |

### Por que a migration anterior não funcionou

A migration `20260131191958` criou a função referenciando `current_position`, mas:
1. A coluna `current_position` nunca foi adicionada à tabela
2. A tabela já tinha `last_assigned_index` de migrations anteriores
3. O erro acontece em runtime, não na criação da função

### Fluxo após correção

```
Webhook recebe lead
    ↓
Insert na tabela leads
    ↓
Trigger trigger_lead_intake dispara
    ↓
Função handle_lead_intake executa
    ↓
pick_round_robin_for_lead encontra fila
    ↓
Pipeline/Stage são atribuídos
    ↓
Próximo membro disponível é selecionado
    ↓
Lead é atribuído ao responsável
    ↓
Atividade é registrada
```

