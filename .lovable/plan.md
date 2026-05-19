# Auditoria do Sistema Financeiro

Verifiquei o banco e o código. O módulo está **quase 100% funcional**, mas faltam 2 SQLs e 1 correção pontual.

## Status atual (banco real)

| Fase | Item | Status |
|---|---|---|
| 2 | `generate_commissions_for_contract` + trigger | ✅ instalado |
| 2 | `release_commissions_on_payment` + trigger | ✅ instalado |
| 3 | Bucket `contract-documents` | ✅ criado |
| 3 | `mark_overdue_financial_entries` + cron | ✅ ativo |
| 4 | Tabela `commission_history` + trigger de auditoria | ✅ instalado |
| 5 | Categorias DRE em 20 de 21 orgs | ⚠️ 1 org sem categorias (Cristiano Fernando) |
| 5 | Função `initialize_organization_financial_categories` | ❌ **NÃO instalada** |
| 6 | `notify_commission_pending` + trigger | ❌ **NÃO instalada** |
| 6 | `notify_financial_overdue` + trigger | ❌ **NÃO instalada** |

Dados atuais: 14 comissões (7 forecast, 2 paid, 0 pending), 47 lançamentos, 2 contratos, 0 vencidos.

## O que falta executar

### SQL #1 — Fase 5 (`migrations/phase5_dre_initialization.sql`)
Cria a função que inicializa categorias padrão DRE para novas organizações + faz backfill da única org que está sem (Cristiano Fernando).

### SQL #2 — Fase 6 (`migrations/phase6_ux_and_notifications.sql`)
Cria os 2 triggers de notificação automática:
- Quando comissão vai para `pending` → notifica admins ("Comissão Liberada")
- Quando lançamento vira `overdue` → notifica admins ("Lançamento Vencido")

**Observação de bug na Fase 6:** o `WHERE ur.role = 'admin'` em `notify_commission_pending` e `notify_financial_overdue` não filtra por organização — qualquer admin de qualquer org receberia notificação de qualquer outra. Vou corrigir para filtrar pelos admins da própria org (`AND ur.organization_id = NEW.organization_id`) antes de aplicar.

## Plano de execução

1. Corrigir o filtro de organização nos triggers da Fase 6 no arquivo `migrations/phase6_ux_and_notifications.sql`.
2. Aplicar os 2 SQLs como migrations (Fase 5 e Fase 6 corrigida) — você aprova no painel.
3. Rodar testes funcionais no banco:
   - Confirmar que Cristiano Fernando recebeu as 3 categorias padrão.
   - Promover uma comissão `forecast` → `pending` e verificar se gerou notificação para os admins corretos.
   - Marcar um lançamento como `overdue` manualmente e verificar notificação.
4. Validar UI rapidamente em `/financeiro/contas`, `/comissoes` e `/financeiro/dre` (apenas leitura — confirmar que nada quebrou).
5. Reportar resultados ou corrigir qualquer erro que aparecer.

## Não preciso mexer em código frontend

Nenhum hook ou página chama as funções pendentes diretamente — todas rodam server-side via triggers. O sistema já roda hoje, só falta ligar as automações restantes.

Posso prosseguir?
