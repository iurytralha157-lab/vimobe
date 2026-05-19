
# Auditoria — Arena Imobiliária

## Diagnóstico (raiz dos problemas)

**1. Duas fontes de verdade competindo**
- `gamification_activity_logs` (142 linhas) é alimentada pelos triggers atuais e por `award_gamification_points`.
- `gamification_events` (71 linhas) é uma tabela paralela; **o `GamificationStatsWidget` (XP/Nível) lê dela**, mas quase ninguém escreve nela → barra de XP nunca sobe.
- `user_gamification_stats` recebe `total_points` em alguns triggers, mas `xp` e `current_level` só são atualizados em `sync_user_level_and_xp` (chamado apenas pelo trigger de `prospecting_reports`). Resultado: nível não evolui.

**2. Três funções de gamificação rivais e inconsistentes**
`handle_activity_gamification`, `handle_gamification_event`, `handle_call_gamification`, `handle_lead_gamification`, `handle_prospecting_report_gamification`, `handle_prospecting_report_points`, `handle_schedule_gamification`. Cada uma escreve em locais diferentes, com `action_type` divergente (`call_made` vs `call`, `visit_made` vs `visit_confirmed`, `meeting_held` vs `meeting_made`).

**3. Triggers reais ativos hoje**
Apenas: `tr_lead_gamification` (leads), `tr_call_gamification` (telephony_calls), `tr_prospecting_report_points` (prospecting_reports). **Não há trigger em `activities` nem em `schedule_events`** — por isso ligações/visitas registradas pelo CRM não geram XP de forma consistente.

**4. Missões mortas**
`user_mission_progress` tem **0 linhas**. Nenhuma função/trigger incrementa progresso de missão. O widget só lê — nunca há escrita.

**5. Sem motor central**
Não existe `processGamificationEvent`. Lógica espalhada em SQL, frontend e RPCs avulsas.

**6. UX/Frontend**
- Cores hardcoded (`text-orange-600`, `bg-orange-50`, `text-emerald-600`) quebram em dark mode.
- `RecentActivitiesTable` mostra ação genérica, sem metadata (quantidade, lead, valor).
- Sem filtros de data globais; sem realtime nas missões/ranking; sem toasts de level-up.

---

## Plano de execução

### Fase 1 — Consolidação de schema (1 migration)
1. **Eliminar `gamification_events`** (ou tornar VIEW sobre `gamification_activity_logs` para compatibilidade).
2. **Padronizar enum `app_gamification_event`**: `CALL`, `MESSAGE`, `VISIT_SCHEDULED`, `VISIT_DONE`, `MEETING_SCHEDULED`, `MEETING_DONE`, `LEAD_CREATED`, `PROPOSAL`, `SALE`, `PROPERTY_CAPTURED`, `MISSION_BONUS`, `STREAK_BONUS`, `LEVEL_UP`.
3. Acrescentar em `gamification_activity_logs`: `quantity int default 1`, garantir `metadata jsonb` (já existe), `xp_awarded int`.
4. Acrescentar em `user_gamification_stats`: `xp_total`, `xp_current_level`, `xp_next_level`, `rank_tier text`. Computar via função `gamification_level_for_xp(xp)` com a tabela de níveis solicitada (1→0, 2→100, 3→250, 4→500, 5→900, …, crescimento quadrático).
5. Migrar dados existentes de `gamification_events` + `users.xp/points` → `user_gamification_stats`.
6. Garantir `gamification_streaks` com tipos `daily_login`, `daily_activity`.

### Fase 2 — Motor central `process_gamification_event` (RPC)
Uma única função SECURITY DEFINER:
```
process_gamification_event(
  p_user_id, p_org_id, p_event_type, p_quantity, p_reference_id, p_metadata
)
```
Responsabilidades (atômicas, transação única):
1. Resolver pontos via `gamification_rules` (fallback no enum padrão).
2. Inserir em `gamification_activity_logs` com `quantity`, `xp_awarded`, `metadata`.
3. Atualizar `user_gamification_stats` (xp, xp_total, xp_current_level, xp_next_level, current_level, last_activity_at).
4. Detectar **level-up** e empilhar evento `LEVEL_UP` + notificação.
5. Atualizar `gamification_streaks` (incrementa se atividade no dia, quebra após 36h).
6. Recalcular `current_rank`/tier (Bronze I/II/III, Prata, Ouro…).
7. Atualizar `user_mission_progress` para toda missão ativa com `action_type = p_event_type` (ou compatível) no período correto (`daily`/`weekly`); ao bater target, marcar `is_completed`, gerar `MISSION_BONUS` e notificação.
8. Inserir notificação realtime em `notifications` para level-up / missão / streak.

### Fase 3 — Substituir triggers antigos por wrappers finos
Reescrever `handle_lead_gamification`, `handle_call_gamification`, `handle_prospecting_report_points`, `handle_schedule_gamification` para apenas mapear a linha → `process_gamification_event(...)`. Remover `handle_gamification_event`, `handle_activity_gamification` duplicadas. Criar **novos triggers** que faltam:
- `tr_activity_gamification` em `activities` (chama o motor).
- `tr_schedule_gamification` em `schedule_events` (INSERT + UPDATE→completed).
- `tr_contract_sale_gamification` em `contracts` quando status vira ativo (SALE).

### Fase 4 — Wrapper no frontend
`src/services/gamification.ts`:
```ts
export async function trackGamificationEvent(input) {
  return supabase.rpc('process_gamification_event', { ... });
}
```
Substituir chamadas diretas dispersas (ProspectingReportModal, ManualEntryForm) por este wrapper. Manter triggers DB como fonte primária; o wrapper só é usado para ações que não têm linha persistida (ex.: micro-interações).

### Fase 5 — Frontend Arena
1. **`GamificationStatsWidget`**: passar a ler `user_gamification_stats` (não mais `gamification_events`), mostrar `xp_current_level / xp_next_level`, tier (Bronze II etc.), animação de barra com `motion`.
2. **`MissionsWidget`**: realtime subscribe em `user_mission_progress`; remover cores hardcoded → tokens semânticos (`text-primary`, `bg-primary/10`, `text-emerald-foreground`).
3. **`RecentActivitiesTable` → Feed inteligente**: ler `gamification_activity_logs` com `quantity`/`metadata`; formatar:
   - `📞 10 ligações realizadas (+50 XP)`
   - `🏠 Visita agendada — Villa Toscana (+10 XP)`
   - `💰 Venda — R$ 850.000 (+500 XP)`
4. **Filtro global de data** (`Hoje | 7d | 30d | 90d | custom`) em contexto compartilhado, aplicado a Ranking, Performance, Histórico, Feed.
5. **Gráficos** (`GamificationPerformance`): trocar cores hardcoded por `hsl(var(--primary))`, `hsl(var(--muted-foreground))`; testar dark/light.
6. **UX**: toast animado em level-up / missão concluída, realtime via canal Supabase `user-gamification-${user.id}`.

### Fase 6 — Notificações & recompensas
Triggers em `user_gamification_stats` (UPDATE de `current_level`) e `user_mission_progress` (UPDATE `is_completed=true`) inserindo em `notifications` com tipo `gamification` + payload (novo nível, missão, bônus).

### Fase 7 — Backfill & validação
1. Recalcular `user_gamification_stats` a partir de `gamification_activity_logs` (soma + nível).
2. Script de teste: inserir activity de tipo `call` para usuário de teste, verificar log + stats + missão atualizando.
3. Linter Supabase + verificar duplicidade de triggers.

---

## Tabela de níveis (XP acumulado)
| Nível | XP necessário (total) |
|-------|----------------------|
| 1 | 0 |
| 2 | 100 |
| 3 | 250 |
| 4 | 500 |
| 5 | 900 |
| N≥6 | `100 * (N-1)^2` |

## Tiers de rank
Bronze I (Nv 1-3) · Bronze II (4-6) · Prata I (7-10) · Prata II (11-15) · Ouro I (16-20) · Ouro II (21+).

---

## Entregáveis
- 1 migration de schema + funções (Fases 1-3, 6).
- `src/services/gamification.ts` (wrapper).
- Refator de `GamificationStatsWidget`, `MissionsWidget`, `RecentActivitiesTable`, `GamificationPerformance`, `GamificationRanking`, `GamificationDashboard` (filtros + tema + realtime + animações).
- Script SQL de backfill.

## Riscos
- Pontuações históricas podem variar após backfill (informar usuário).
- Remoção de `gamification_events`: manter view de compatibilidade por 1 release.
- Triggers em `activities` podem gerar dupla contagem com triggers de `leads`/`telephony_calls` — mitigado por `action_type` distinto + `idempotency_key`.

Pronto para implementar?
