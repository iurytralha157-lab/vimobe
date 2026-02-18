
# Corrigir Distribuicao Round Robin - Leads indo so para Jessica

## Problema Identificado

**Causa raiz**: Dois problemas graves na funcao `handle_lead_intake`:

1. **Contador `leads_count` nao incrementa**: Jessica recebeu 6 leads consecutivos, mas seu `leads_count` permanece em `6`. O incremento na linha `UPDATE round_robin_members SET leads_count = leads_count + 1` nao esta persistindo, provavelmente porque a funcao e chamada via trigger BEFORE INSERT e as alteracoes em outras tabelas dentro da mesma transacao sofrem conflito.

2. **Algoritmo nao e round-robin verdadeiro**: `ORDER BY leads_count ASC` faz com que TODOS os leads futuros sejam atribuidos ao membro com menor contagem ate ele empatar com o proximo. Jessica (6) vai receber ~19 leads seguidos ate empatar com Fernando Matos (25). Isso nao e uma distribuicao justa -- o correto e alternar entre membros sequencialmente.

## Solucao

Reescrever a selecao do proximo usuario para usar um **round-robin sequencial verdadeiro** baseado no `last_assigned_index` + `position`, e corrigir o contador.

### Mudancas na funcao `handle_lead_intake`

**Substituir** o bloco de selecao de usuario (linhas 106-112) de:

```sql
SELECT rrm.user_id INTO v_next_user_id
FROM round_robin_members rrm
JOIN users u ON u.id = rrm.user_id
WHERE rrm.round_robin_id = v_queue.id
  AND u.is_active = true
ORDER BY rrm.leads_count ASC NULLS FIRST, rrm.position ASC
LIMIT 1;
```

**Para um algoritmo round-robin sequencial:**

```sql
-- Contar total de membros ativos
SELECT COUNT(*) INTO v_total_members
FROM round_robin_members rrm
JOIN users u ON u.id = rrm.user_id
WHERE rrm.round_robin_id = v_queue.id
  AND u.is_active = true;

-- Calcular proxima posicao: (last_assigned_index + 1) % total
v_next_position := (COALESCE(v_queue.last_assigned_index, -1) + 1) % v_total_members;

-- Selecionar membro nessa posicao (usando row_number para posicao relativa entre ativos)
SELECT user_id INTO v_next_user_id
FROM (
  SELECT rrm.user_id, ROW_NUMBER() OVER (ORDER BY rrm.position) - 1 as rn
  FROM round_robin_members rrm
  JOIN users u ON u.id = rrm.user_id
  WHERE rrm.round_robin_id = v_queue.id
    AND u.is_active = true
) sub
WHERE sub.rn = v_next_position;
```

### Atualizar `last_assigned_index` apos atribuicao

Adicionar apos a atribuicao do lead:

```sql
UPDATE round_robins
SET last_assigned_index = v_next_position
WHERE id = v_queue.id;
```

### Manter o incremento de `leads_count` para historico

O `UPDATE round_robin_members SET leads_count = leads_count + 1` sera mantido, mas agora nao sera usado para decisao de roteamento -- apenas para estatisticas.

### Correcao imediata dos dados

Sincronizar o `leads_count` de Jessica com a contagem real do `assignments_log`:

```sql
UPDATE round_robin_members rrm
SET leads_count = sub.real_count
FROM (
  SELECT assigned_user_id, COUNT(*) as real_count
  FROM assignments_log
  WHERE round_robin_id = '44532c92-1b84-41d5-b17b-c30ad7f0822e'
  GROUP BY assigned_user_id
) sub
WHERE rrm.round_robin_id = '44532c92-1b84-41d5-b17b-c30ad7f0822e'
  AND rrm.user_id = sub.assigned_user_id;
```

## Detalhes Tecnicos

### Variaveis novas necessarias na funcao

```sql
v_total_members integer;
v_next_position integer;
```

### Logica completa do novo bloco

A funcao `handle_lead_intake` sera alterada via migracao SQL para:

1. Contar membros ativos da fila
2. Calcular proxima posicao usando modulo (`%`) sobre `last_assigned_index`
3. Selecionar o usuario na posicao calculada (usando `ROW_NUMBER` para lidar com gaps de posicao quando membros inativos existem)
4. Atribuir o lead
5. Atualizar `last_assigned_index` na tabela `round_robins`
6. Incrementar `leads_count` para estatisticas
7. Registrar no `assignments_log`

### Impacto

- Nenhuma mudanca na interface (frontend)
- Apenas a funcao SQL `handle_lead_intake` sera atualizada
- Dados existentes serao corrigidos via UPDATE
- Funciona para qualquer organizacao que configure round-robin no futuro
