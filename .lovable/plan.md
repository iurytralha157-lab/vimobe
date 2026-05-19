## Problema confirmado

Inspecionando a tabela `notifications` (últimas 24h), o usuário responsável pelo lead está recebendo **3 notificações** a cada entrada de lead:

1. `🆕 Novo lead no CRM!` (broadcast geral)
2. `Lead atribuído a você` (duplicada — chega 2x)
3. `🆕 Novo lead recebido!` (primeira atribuição)

## Causa raiz

Existem múltiplos triggers sobrepostos na tabela `public.leads`:

| Trigger | Função | Resultado |
|---|---|---|
| `trigger_notify_new_lead` (AFTER INSERT) | `notify_new_lead()` | "Novo lead no CRM!" — manda inclusive para o responsável |
| `trg_notify_lead_assigned` (AFTER UPDATE OF assigned_user_id) | `notify_lead_assigned()` | "Lead atribuído a você" |
| `trigger_notify_lead_assigned` (AFTER UPDATE) | `notify_lead_assigned()` | **DUPLICATA** do anterior — mesma função, dispara 2x |
| `trigger_notify_lead_first_assignment` (AFTER UPDATE) | `notify_lead_first_assignment()` | "Novo lead recebido!" — sobrepõe com "Lead atribuído a você" |

Resultado: o responsável recebe 1 broadcast + 2 atribuições + 1 "novo recebido" = 3 a 4 notificações.

## Correção

Migration SQL única que:

1. **Remove o trigger duplicado** `trg_notify_lead_assigned` (mantém apenas `trigger_notify_lead_assigned`).
2. **Remove `trigger_notify_lead_first_assignment`** — seu papel já é coberto por `notify_lead_assigned` (que cria "Lead atribuído a você" + dispara WhatsApp). Eliminamos a sobreposição "Novo lead recebido!" duplicada.
3. **Ajusta `notify_new_lead()`** para excluir o `assigned_user_id` do broadcast — assim o broadcast "🆕 Novo lead no CRM!" vai apenas para admins/gestores que **não** são o próprio responsável.

## Resultado esperado por lead novo

- **Responsável (assignee):** 1 notificação — "Lead atribuído a você" (+ WhatsApp se configurado)
- **Demais admins/gestores:** 1 notificação — "🆕 Novo lead no CRM!"

## Detalhes técnicos

```sql
-- 1. Remover trigger duplicado
DROP TRIGGER IF EXISTS trg_notify_lead_assigned ON public.leads;

-- 2. Remover trigger redundante de "first assignment"
DROP TRIGGER IF EXISTS trigger_notify_lead_first_assignment ON public.leads;
-- (a função notify_lead_first_assignment pode ficar, sem trigger ela é inerte)

-- 3. Ajustar notify_new_lead para pular o assignee
-- (adicionar WHERE u.id <> COALESCE(NEW.assigned_user_id, '00000000-...'::uuid)
-- no SELECT que monta a lista de destinatários do broadcast)
```

Sem alterações no frontend — toda a correção é em triggers/funções do banco.
