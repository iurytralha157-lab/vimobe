
# Fallback para Admin: Lead nunca fica sem dono

## Problema atual
Quando nenhuma fila de distribuicao (round robin) eh encontrada, ou quando a fila nao tem membros ativos, o lead cai no "Pool" sem responsavel. Isso gera leads perdidos que ninguem acompanha.

## Solucao
Alterar a funcao `handle_lead_intake` para que, nos dois cenarios de fallback, o lead seja atribuido ao **admin da organizacao** em vez de ficar sem dono.

---

## O que muda

Hoje existem **2 pontos** onde o lead cai no Pool:

1. **Nenhuma fila ativa encontrada** (linha 43-57)
2. **Fila encontrada, mas sem membros ativos** (linha 69-84)

Em ambos os casos, vamos:
- Buscar o admin da organizacao (`role = 'admin'`, mais antigo por `created_at`)
- Atribuir o lead a esse admin
- Registrar na timeline que foi um fallback para o admin
- Se por algum motivo nao existir admin (improvavel), ai sim o lead fica sem dono

---

## Detalhes tecnicos

### Alteracao na funcao SQL `handle_lead_intake`

Adicionar uma variavel `v_admin_id uuid` e, nos dois blocos de fallback, substituir o `RETURN` por:

```text
-- Buscar admin da organizacao (mais antigo)
SELECT id INTO v_admin_id
FROM users
WHERE organization_id = v_org_id
  AND role = 'admin'
  AND is_active = true
ORDER BY created_at ASC
LIMIT 1;

-- Se encontrou admin, atribuir
IF v_admin_id IS NOT NULL THEN
  UPDATE leads SET
    assigned_user_id = v_admin_id,
    updated_at = now()
  WHERE id = p_lead_id;
END IF;
```

A timeline registrara `destination = 'admin_fallback'` em vez de `'pool'`, com o motivo especifico (`no_active_queue` ou `no_active_members`).

### Arquivos impactados

| Arquivo | Acao |
|---------|------|
| Nova migracao SQL | Recriar `handle_lead_intake` com fallback para admin |

### Sem impacto em
- Frontend (nenhuma mudanca de interface)
- Edge Functions (pool-checker continua funcionando normalmente)
- Triggers existentes (`notify_lead_first_assignment` dispara normalmente pois o lead tera `assigned_user_id`)

---

## Fluxo apos a mudanca

```text
Lead entra sem responsavel
       |
  pick_round_robin_for_lead()
       |
  +----+----+
  |         |
Achou     Nao achou fila
fila         |
  |      Busca admin org
  |         |
Tem       Atribui ao admin
membros?    (fallback)
  |
+--+--+
|     |
Sim   Nao
|       |
Atribui  Busca admin org
via RR     |
         Atribui ao admin
          (fallback)
```

## Riscos
- Nenhum risco significativo. O admin ja recebe notificacoes de leads e pode redistribuir manualmente.
- Caso a organizacao tenha multiplos admins, sera usado o mais antigo (primeiro cadastrado).
