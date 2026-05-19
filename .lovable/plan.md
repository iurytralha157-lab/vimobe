## Problema

O widget de Nível/XP demora a refletir os pontos porque as tabelas de gamificação **não estão na publicação `supabase_realtime`**. A consulta confirmou que nenhuma das tabelas (`user_gamification_stats`, `gamification_activity_logs`, `gamification_user_missions`) está publicada — por isso a UI só atualiza quando a query é refeita manualmente (troca de aba, navegação, etc.), enquanto missões/atividades atualizam em outro momento e parecem mais rápidas.

## Correção

### 1. Migração SQL — habilitar realtime nas tabelas da Arena
```sql
ALTER TABLE public.user_gamification_stats REPLICA IDENTITY FULL;
ALTER TABLE public.gamification_activity_logs REPLICA IDENTITY FULL;
ALTER TABLE public.gamification_user_missions REPLICA IDENTITY FULL;
ALTER TABLE public.gamification_rankings REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_gamification_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gamification_activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gamification_user_missions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gamification_rankings;
```
(Com guard `IF NOT EXISTS` equivalente via `DO $$ ... EXCEPTION WHEN duplicate_object` para ser idempotente.)

### 2. Frontend — `GamificationStatsWidget.tsx`
- Adicionar `refetchOnWindowFocus: true` e `staleTime: 0` na query de stats.
- Adicionar fallback de `refetchInterval: 15000` (15s) caso o canal realtime caia.
- Animar transição do XP (contador animado de 300ms) para feedback visual instantâneo.
- Garantir que o canal de realtime invalide também `['gamification-ranking']` para subir no ranking junto.

### 3. Verificação
- Executar uma ação no CRM (ligação/atividade) e confirmar que o card de Nível atualiza em <2s sem reload.
- Conferir que o toast `+X XP` continua aparecendo.

Nada na lógica de pontuação/temporada/missões é alterado — apenas a propagação realtime e a UX do contador.