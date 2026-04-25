
## 🔍 Diagnóstico — O que está acontecendo

Investiguei os logs reais da `automation-executor` da execução `7a2cea25-...` (o lead "André" do print) e identifiquei **a causa exata** das 4 repetições da mesma mensagem.

### Sequência real do bug (logs do dia 25/04 entre 16:46 e 16:48):
1. **16:46:13** — Delay de 15s inicia (inline wait).
2. **16:46:17** — *Antes do delay terminar*, o executor começa a processar a ação `send_whatsapp` em **paralelo** → envia "Atualmente está em qual regime…" (1ª vez).
3. **16:46:19** — Outra invocação do executor recebe o mesmo `execution_id`, processa de novo a ação `send_whatsapp` → **envia 2ª vez**.
4. **16:46:38** — Mais uma invocação processa novamente → **envia 3ª vez**.
5. **16:47:21** — Mais uma → **envia 4ª vez**.
6. **16:47:45** — Cai num delay de 1 min e tenta uma chamada recursiva que falha com `Node null not found in automation` (16:48:24, 16:48:46) — execução fica **órfã/travada**.

### As 5 causas-raiz confirmadas:

| # | Problema | Onde está | Por que causa duplicação |
|---|---|---|---|
| **1** | **Sem trava de concorrência** | `automation-executor/index.ts` linhas 197-225 | A função aceita várias chamadas simultâneas para o **mesmo `execution_id`** sem nenhum lock. Status `running` não impede reprocessamento — só `completed`/`failed` impedem. |
| **2** | **Delay inline com timeout da Edge Function** | linhas 335-376 | Delays curtos esperam `setTimeout(60000)` *dentro* da edge function. Se ela atingir o limite de execução (~150s) e for reiniciada, o cron `automation-delay-processor` reativa a execução achando que está esperando, mas o `current_node_id` já foi avançado → **executa o mesmo node duas vezes**. |
| **3** | **Cron + chamada recursiva concorrentes** | linhas 428-435 | Após processar um node, a função faz `fetch` recursivo para si mesma (não-bloqueante por timing). Enquanto isso, o cron `automation-delay-processor` (que roda a cada minuto) pode pegar a mesma execução em estado `waiting` → **dois caminhos rodam paralelamente o mesmo nó**. |
| **4** | **Update do `current_node_id` antes do envio** | linhas 339-347 | No delay inline, `current_node_id` é atualizado para o **próximo nó** *antes* da espera terminar. Se outro processo lê durante a janela, ele encontra o próximo nó e processa, enquanto o original também processa → **duplicata**. |
| **5** | **Tipo de nó `wait` não é tratado** | linha 249 (switch) | O frontend cria nós tipo `wait` (com `wait_value`/`wait_type`), mas o executor só trata `delay`. Se a automação tem `wait`, cai no `default` → não processa, deixa a execução travada → cron tenta de novo → **loop infinito**. |

### Por que o preview funciona?
O preview (`FlowSimulator.tsx`) roda inteiramente no navegador, sequencialmente, num único processo, sem cron, sem chamadas paralelas. Por isso jamais reproduz o bug — que é puramente de **concorrência server-side**.

---

## 🛠 Plano de Correção (sem riscos para automações já existentes)

### Etapa 1 — Trava de Idempotência por Step (causa #1, #3, #4)
- Criar uma nova coluna `step_lock_token uuid` e `step_started_at timestamptz` em `automation_executions`.
- Antes de processar qualquer nó, o executor faz um **UPDATE atômico condicional**:
  ```
  UPDATE automation_executions
  SET step_lock_token = <novo_uuid>, step_started_at = now()
  WHERE id = <execution_id>
    AND status = 'running'
    AND (step_lock_token IS NULL OR step_started_at < now() - interval '5 minutes')
  RETURNING step_lock_token;
  ```
- Se o UPDATE não retornar linha (porque outro processo já está executando), o executor **sai imediatamente** sem fazer nada.
- Ao final do nó (ou em erro), o token é liberado (`step_lock_token = NULL`).
- Isso garante: **um nó nunca é processado por dois worker simultaneamente**.

### Etapa 2 — Idempotência de Mensagem WhatsApp (causa #1, #2)
- Adicionar uma constraint única em `whatsapp_messages`: `UNIQUE(conversation_id, sender_name, content_hash, time_bucket_minute)` para mensagens de automação. (`content_hash` = MD5 dos primeiros 200 chars; `time_bucket_minute` = minuto truncado do envio).
- Antes de chamar a Evolution API, fazer um `INSERT` "guarda-chuva" com `ON CONFLICT DO NOTHING` numa tabela leve `automation_message_dispatches(execution_id, node_id, attempt_key)`. Se já existe → **não envia de novo**.
- Resultado: mesmo se 5 invocações ocorrerem por bug, só **uma** vai enviar à Evolution API.

### Etapa 3 — Eliminar Delay Inline (causa #2, #3)
- Remover o branch "short delay ≤ 2 min" que faz `setTimeout` dentro da edge function.
- **Todos os delays** (inclusive 1s, 15s, 1 min) passam a usar o cron `automation-delay-processor` com `next_execution_at`.
- Trade-off: granularidade mínima passa a ser ~30s (intervalo do cron). Para o caso de uso (automações de WhatsApp), isso é **aceitável e mais confiável**.
- Reduzir o cron para rodar **a cada 30s** (ao invés de 1 min) para manter boa precisão.

### Etapa 4 — Suporte ao Node Type `wait` (causa #5)
- No `switch` do executor, adicionar `case "wait":` que reaproveita a lógica de `delay`, lendo `wait_value`/`wait_type` em vez de `delay_value`/`delay_type`.
- Manter ambos os tipos funcionando (compatibilidade com automações antigas).

### Etapa 5 — Ordem Segura de Atualização (causa #4)
- Reordenar a lógica do executor para:
  1. Adquirir lock (Etapa 1)
  2. Processar o nó atual (envio etc.)
  3. **Só depois** atualizar `current_node_id` para o próximo nó
  4. Liberar lock
  5. Chamar próximo nó (via cron, **sem mais chamada recursiva**)
- A chamada recursiva `fetch` para `automation-executor` será removida. O cron processa o próximo nó na próxima rodada.
- Para nós que devem encadear sem espera (ex.: `add_tag` → `move_stage`), o executor processa **vários nós em sequência dentro da mesma invocação** num loop `while`, mas sempre com novo lock por nó.

### Etapa 6 — Auto-Recuperação de Execuções Travadas
- Adicionar ao cron uma rotina que detecta execuções com `step_started_at > 5 minutos atrás` e marca como `failed` automaticamente, com mensagem clara `"Execução travada — recuperação automática"`.
- Isso evita que execuções "zumbis" como a `7a2cea25-...` fiquem reaparecendo eternamente.

### Etapa 7 — Painel de Diagnóstico (opcional mas recomendado)
- Na página de detalhes da automação (Logs de Execução), adicionar uma coluna mostrando **quantas mensagens foram efetivamente enviadas** (contagem de `automation_message_dispatches`) e botão "Forçar parada" para qualquer execução visivelmente em loop.

---

## 📋 Arquivos que serão modificados

1. `supabase/migrations/<nova>.sql` — colunas `step_lock_token`, `step_started_at`, tabela `automation_message_dispatches`, constraint única.
2. `supabase/functions/automation-executor/index.ts` — lock atômico, suporte a `wait`, remoção de delay inline, remoção de chamada recursiva, idempotência de envio.
3. `supabase/functions/automation-delay-processor/index.ts` — recuperação de execuções travadas, frequência maior.
4. (cron job no banco) — ajustar frequência de `automation-delay-processor` para 30s.
5. `src/components/automations/ExecutionLogs.tsx` (ou similar) — exibir contador de mensagens enviadas + botão de força-parada.

---

## ✅ Resultado esperado após a correção

- **Zero mensagens duplicadas** — mesmo sob falhas e re-tentativas.
- **Execuções travadas se auto-recuperam** em até 5 min (não ficam reenviando para sempre).
- **Tipos `wait` e `delay` funcionam igualmente** — sem diferença entre o preview e a produção.
- **Logs claros** mostrando quando uma duplicata foi *prevenida* (visíveis no painel).
- **Concorrência sob controle** — nunca dois workers tocam o mesmo nó.

Aguardo sua aprovação para executar.
