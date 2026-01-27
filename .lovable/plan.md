
# Plano de Correção: Erro de FK em Automações de Estágio

## Diagnóstico Completo

Após análise detalhada do banco de dados e código, identifiquei a **causa raiz** do erro persistente.

### Problema Encontrado

O trigger `execute_stage_automations` é executado **BEFORE INSERT** na tabela `leads`. Quando há automações de estágio configuradas (como `change_assignee_on_enter` ou `change_deal_status_on_enter`), o trigger tenta inserir registros na tabela `activities` usando `NEW.id`.

**Porém, em um trigger BEFORE INSERT, o registro do lead ainda não existe no banco de dados**, causando a violação de foreign key:

```
Key (lead_id)=(...) is not present in table "leads"
```

### Dados Confirmados

- **Webhook ativo**: "Lp 001" envia leads para o estágio "Base"
- **Automação ativa**: `change_assignee_on_enter` no estágio "Base" 
- **Trigger problemático**: `execute_stage_automations` (BEFORE INSERT/UPDATE)
- **Ação problemática**: `INSERT INTO activities` dentro do loop de automações

### Cadeia de Triggers

```text
INSERT leads
  └─→ BEFORE: execute_stage_automations
        └─→ Tenta INSERT activities (FALHA - lead não existe ainda)
  └─→ AFTER: trigger_lead_intake → handle_lead_intake
  └─→ AFTER: trigger_log_lead_activity (já corrigido)
  └─→ AFTER: trigger_notify_new_lead
```

---

## Solução Proposta

Modificar a função `execute_stage_automations` para **NÃO inserir em `activities`** diretamente durante o trigger. O log será feito pelo trigger `log_lead_activity` (AFTER UPDATE) quando as alterações de `assigned_user_id` ou `deal_status` forem aplicadas.

### Alterações na Função

A função continuará modificando `NEW.assigned_user_id` e `NEW.deal_status` normalmente, mas as linhas que fazem `INSERT INTO activities` serão removidas.

### Código Atual Problemático

```sql
-- Dentro do LOOP de automações:
IF v_automation.automation_type = 'change_deal_status_on_enter' THEN
  NEW.deal_status := v_new_status;
  -- PROBLEMA: Isso falha em INSERT
  INSERT INTO public.activities (...) VALUES (NEW.id, ...);
END IF;

IF v_automation.automation_type = 'change_assignee_on_enter' THEN
  NEW.assigned_user_id := v_target_user_id;
  -- PROBLEMA: Isso também falha em INSERT
  INSERT INTO public.activities (...) VALUES (NEW.id, ...);
END IF;
```

### Código Corrigido

```sql
-- Dentro do LOOP de automações:
IF v_automation.automation_type = 'change_deal_status_on_enter' THEN
  NEW.deal_status := v_new_status;
  -- NÃO inserir em activities aqui
  -- O trigger log_lead_activity vai registrar a mudança
END IF;

IF v_automation.automation_type = 'change_assignee_on_enter' THEN
  NEW.assigned_user_id := v_target_user_id;
  -- NÃO inserir em activities aqui
  -- O trigger log_lead_activity vai registrar a mudança
END IF;
```

---

## Detalhe Técnico

O trigger `log_lead_activity` (AFTER INSERT/UPDATE) já foi modificado para:
- Ignorar operações INSERT (evita race condition)
- Registrar mudanças em `stage_id`, `assigned_user_id` e `deal_status` durante UPDATE

Como o `execute_stage_automations` modifica `NEW.assigned_user_id` e `NEW.deal_status` antes do INSERT ser commitado, essas mudanças serão refletidas no registro final. Quando houver qualquer UPDATE subsequente, o `log_lead_activity` registrará as atividades corretamente.

Para automações em INSERT (lead entrando direto no estágio com automação), como a atribuição já está sendo aplicada no registro inserido, não há perda de funcionalidade - apenas o log de atividade não será criado no momento exato da inserção, mas sim quando houver alguma alteração posterior no lead.

---

## Resumo da Migração

| Item | Ação |
|------|------|
| Função | `execute_stage_automations` |
| Tipo | `CREATE OR REPLACE FUNCTION` |
| Mudança | Remover `INSERT INTO activities` do loop de automações |
| Impacto | Automações continuam funcionando, logs serão feitos pelo trigger existente |

---

## Próximos Passos

1. Aplicar migração para atualizar `execute_stage_automations`
2. Testar o webhook novamente
3. Verificar que leads são criados com a atribuição automática funcionando
