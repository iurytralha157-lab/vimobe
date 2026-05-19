## Diagnóstico confirmado

- O relatório de prospecção foi inserido às `05:44`, mas o último registro em `gamification_activity_logs` é `05:26`; ou seja, a ação entra no banco, mas não vira XP/pontos.
- Não existe nenhum trigger ativo nas tabelas que deveriam alimentar a Arena: `leads`, `telephony_calls`, `prospecting_reports`, `activities` e `schedule_events` retornaram vazio em `information_schema.triggers`.
- A função `process_gamification_event` existe, mas precisa de correção estrutural: ela usa `v_inserted boolean` para `ROW_COUNT`, deveria ser inteiro, e precisa parar imediatamente quando o evento for duplicado para não arriscar somar XP errado.
- O botão de ligação no card do pipeline registra atividade (`activities`); portanto ele depende do trigger de `activities`. Como o trigger está ausente, a ligação não pontua.
- O sistema já tem tabela `gamification_seasons`, mas ela não está integrada ao cálculo, ranking, histórico ou reset de nível.

## Plano de correção

### 1. SQL de emergência para voltar a pontuar
Criar uma migration SQL que:

- Recria os triggers ausentes:
  - `tr_lead_gamification` em `leads`
  - `tr_call_gamification` em `telephony_calls`
  - `tr_prospecting_report_points` em `prospecting_reports`
  - `tr_activity_gamification` em `activities`
  - `tr_schedule_gamification` em `schedule_events`
- Corrige `process_gamification_event`:
  - troca `v_inserted boolean` por `v_inserted int`
  - usa `GET DIAGNOSTICS v_inserted = ROW_COUNT`
  - se `v_inserted = 0`, dá `RETURN` para evitar duplicidade
  - grava metadata rica: quantidade, pontos unitários, origem e temporada
- Recalcula `user_gamification_stats` com base nos logs atuais para deixar dashboard, ranking e nível sincronizados.

### 2. Temporadas e reset de níveis sem apagar histórico
Usar a tabela existente `gamification_seasons` e adicionar somente o que falta:

- `started_at timestamptz`
- `ended_at timestamptz`
- `created_by uuid`
- `reset_reason text`
- `season_id uuid` em `gamification_activity_logs`
- `season_id uuid` em `user_gamification_stats`

Criar RPC segura:

```sql
public.reset_gamification_season(
  p_organization_id uuid,
  p_season_name text
)
```

Essa função vai:

- Encerrar a temporada ativa anterior.
- Criar a nova temporada ativa.
- Zerar somente os acumuladores atuais:
  - `total_points = 0`
  - `xp = 0`
  - `xp_total = 0`
  - `current_level = 1`
  - `rank_tier = 'Bronze I'`
  - `current_rank = 'Bronze I'`
- Resetar progresso de missões atuais.
- Manter todo o histórico em `gamification_activity_logs` intacto.
- Enviar notificação para todos os usuários ativos da imobiliária avisando que a nova temporada iniciou.

### 3. Amarrar eventos novos à temporada ativa
Atualizar `process_gamification_event` para buscar a temporada ativa da organização e gravar `season_id` no log e no stats atual.

Se não existir temporada ativa, a função cria uma temporada padrão automaticamente para aquela organização, evitando Arena quebrada por falta de configuração.

### 4. Corrigir ligações vindas do CRM/pipeline
Manter a pontuação por `activities` para o clique de ligação no card do pipeline, porque é isso que esse fluxo cria hoje.

No detalhe do lead, onde também existe criação de `telephony_calls`, evitar pontuação duplicada usando metadata de controle quando a ligação já foi registrada por atividade visual.

### 5. Corrigir frontend da Arena
Atualizar telas para refletir a temporada atual:

- `GamificationStatsWidget`: mostrar nível da temporada atual.
- `GamificationRanking`: ranking padrão passa a ser da temporada ativa, não do mês inteiro antigo.
- `GamificationPerformance`: métricas filtradas pela temporada ativa.
- `RecentActivitiesTable` e histórico: mostrar quantidade e pontos corretamente, por exemplo `120 ligações × 5 XP = 600 XP`.
- `MissionsWidget`: refetch realtime quando novos logs/missões forem atualizados.

### 6. Botão administrativo para reiniciar temporada
Adicionar na área administrativa da gamificação uma aba/área `Temporadas` com:

- Campo `Nome da temporada`.
- Botão `Iniciar nova temporada`.
- Confirmação antes de resetar.
- Toast de sucesso.
- Invalidação/refetch de stats, missões, ranking, performance e histórico.

### 7. Testes controlados depois da migration
Validar etapa por etapa:

1. Conferir se os triggers existem.
2. Inserir/usar um lançamento de prospecção com ligações.
3. Confirmar novo registro em `gamification_activity_logs`.
4. Confirmar `user_gamification_stats.xp` aumentando.
5. Confirmar ranking atualizando.
6. Confirmar missão de ligação avançando.
7. Iniciar temporada nova.
8. Confirmar nível zerado para 1, histórico preservado e notificação criada.

## SQL principal que será gerado

A migration vai conter, em essência:

```sql
ALTER TABLE public.gamification_seasons
  ADD COLUMN IF NOT EXISTS started_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS reset_reason text;

ALTER TABLE public.gamification_activity_logs
  ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES public.gamification_seasons(id);

ALTER TABLE public.user_gamification_stats
  ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES public.gamification_seasons(id);

CREATE OR REPLACE FUNCTION public.process_gamification_event(...)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- função corrigida: idempotência, temporada ativa, XP, missões e notificações
$$;

CREATE OR REPLACE FUNCTION public.reset_gamification_season(
  p_organization_id uuid,
  p_season_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- fecha temporada anterior, cria nova, zera stats atuais, reseta missões e notifica usuários
$$;

DROP TRIGGER IF EXISTS tr_lead_gamification ON public.leads;
DROP TRIGGER IF EXISTS tr_call_gamification ON public.telephony_calls;
DROP TRIGGER IF EXISTS tr_prospecting_report_points ON public.prospecting_reports;
DROP TRIGGER IF EXISTS tr_activity_gamification ON public.activities;
DROP TRIGGER IF EXISTS tr_schedule_gamification ON public.schedule_events;

CREATE TRIGGER tr_lead_gamification
AFTER INSERT OR UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.handle_lead_gamification();

CREATE TRIGGER tr_call_gamification
AFTER INSERT ON public.telephony_calls
FOR EACH ROW EXECUTE FUNCTION public.handle_call_gamification();

CREATE TRIGGER tr_prospecting_report_points
AFTER INSERT ON public.prospecting_reports
FOR EACH ROW EXECUTE FUNCTION public.handle_prospecting_report_points();

CREATE TRIGGER tr_activity_gamification
AFTER INSERT ON public.activities
FOR EACH ROW EXECUTE FUNCTION public.handle_activity_gamification();

CREATE TRIGGER tr_schedule_gamification
AFTER INSERT OR UPDATE ON public.schedule_events
FOR EACH ROW EXECUTE FUNCTION public.handle_schedule_gamification();
```

Após aprovação, eu implemento a migration, os ajustes de frontend e executo as consultas de validação.