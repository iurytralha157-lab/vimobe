

# Corrigir distribuição: remover usuário órfão e redistribuir leads

## Problema identificado
Usuário Maikson (ID `2a6c45cd`) tem `organization_id = NULL` mas está na fila round-robin "venda" e na equipe "Vendas". A RLS impede que a Nexo veja esse usuário, então leads aparecem como "Sem responsável". Ele recebe leads especialmente à noite (quando outros corretores estão fora da escala).

## Ações

### 1. Limpeza de dados (SQL direto)
- Remover o membro órfão (`2a6c45cd`) da tabela `round_robin_members` (ID: `3300f1a2`)
- Remover da `team_members` (ID: `14526716`)
- Zerar `assigned_user_id` dos 22 leads atribuídos ao órfão
- Chamar `handle_lead_intake` para cada um desses leads, redistribuindo via round-robin entre os corretores válidos

### 2. Migração: proteção futura no `handle_lead_intake`
Adicionar validação de organização na query de seleção do próximo membro:

```sql
SELECT rrm.user_id INTO v_next_user_id
FROM round_robin_members rrm
JOIN users u ON u.id = rrm.user_id
WHERE rrm.round_robin_id = v_queue.id
  AND u.is_active = true
  AND u.organization_id = v_org_id  -- NOVA LINHA: garante mesma org
  AND public.is_member_available(rrm.user_id)
ORDER BY rrm.leads_count ASC NULLS FIRST, rrm.position ASC
LIMIT 1;
```

Essa única linha impede que qualquer usuário sem organização ou de outra organização receba leads.

### 3. Impacto
- Os 22 leads serão redistribuídos entre os 8 corretores válidos da fila
- Leads futuros nunca serão atribuídos a usuários sem organização
- Nenhuma alteração no frontend — o problema é puramente de dados + lógica SQL

