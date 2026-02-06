

## Plano de Correção: Problemas Críticos e Melhorias de Segurança

### Resumo dos Problemas Identificados

| Prioridade | Problema | Impacto | Tipo |
|------------|----------|---------|------|
| 🔴 Crítico | Validação do webhook Evolution desabilitada | Payloads maliciosos podem criar dados falsos | Segurança |
| 🔴 Crítico | Validação do webhook Meta comentada | Ataques de spoofing possíveis | Segurança |
| 🔴 Crítico | Secret `EVOLUTION_WEBHOOK_SECRET` não configurada | Webhook inseguro | Configuração |
| 🔴 Crítico | Secrets Meta não configuradas | OAuth e webhook Meta inseguros | Configuração |
| 🟠 Alto | Política RLS `media_jobs` muito permissiva | Vazamento de dados entre organizações | Segurança |
| 🟡 Médio | Arquivo Pipelines.tsx com 1147 linhas | Manutenibilidade baixa | Código |

---

## Fase 1: Correções Críticas de Segurança

### 1.1 Configurar Secrets Ausentes

Secrets que precisam ser configuradas no Supabase:

| Secret | Descrição | Onde obter |
|--------|-----------|------------|
| `EVOLUTION_WEBHOOK_SECRET` | Token para validar webhooks da Evolution API | Gerar string aleatória segura |
| `META_APP_ID` | ID do App do Facebook | [Facebook Developers Console](https://developers.facebook.com) |
| `META_APP_SECRET` | Secret do App do Facebook | Facebook Developers Console |
| `META_WEBHOOK_VERIFY_TOKEN` | Token para verificação de webhooks | Gerar string aleatória segura |

### 1.2 Reativar Validação do Evolution Webhook

**Arquivo:** `supabase/functions/evolution-webhook/index.ts`

Alteração nas linhas 47-64 - remover comentário e reativar validação:

```typescript
// ANTES (comentado):
/*
if (EVOLUTION_WEBHOOK_SECRET) {
  const incomingSecret = req.headers.get("x-webhook-secret") || ...
  if (incomingSecret !== EVOLUTION_WEBHOOK_SECRET) {
    return new Response(...401...);
  }
}
*/

// DEPOIS (ativo):
if (EVOLUTION_WEBHOOK_SECRET) {
  const incomingSecret = req.headers.get("x-webhook-secret") || 
                         req.headers.get("apikey") ||
                         req.headers.get("authorization")?.replace("Bearer ", "");
  
  if (incomingSecret !== EVOLUTION_WEBHOOK_SECRET) {
    console.error("Webhook secret mismatch - rejecting request");
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  console.log("✅ Webhook secret validated");
} else {
  console.warn("⚠️ EVOLUTION_WEBHOOK_SECRET not configured - webhook security disabled");
}
```

### 1.3 Corrigir Validação do Meta Webhook

**Arquivo:** `supabase/functions/meta-webhook/index.ts`

Alteração nas linhas 59-64 - retornar 403 em produção quando assinatura inválida:

```typescript
// ANTES:
if (META_APP_SECRET && !verifySignature(rawBody, signature)) {
  console.error("Invalid webhook signature");
  // In development, we might skip verification
  // return new Response("Invalid signature", { status: 403 });
}

// DEPOIS:
if (META_APP_SECRET) {
  if (!verifySignature(rawBody, signature)) {
    console.error("Invalid webhook signature - rejecting request");
    return new Response(
      JSON.stringify({ error: "Invalid signature" }),
      { status: 403, headers: corsHeaders }
    );
  }
  console.log("✅ Meta webhook signature validated");
} else {
  console.warn("⚠️ META_APP_SECRET not configured - signature validation disabled");
}
```

---

## Fase 2: Correção de RLS

### 2.1 Corrigir Política da Tabela `media_jobs`

**Problema:** A política `Service role can manage all media_jobs` usa `USING (true)` para ALL, permitindo que qualquer usuário autenticado acesse jobs de qualquer organização.

**Migração SQL:**

```sql
-- Remover política permissiva demais
DROP POLICY IF EXISTS "Service role can manage all media_jobs" ON public.media_jobs;

-- Criar política restritiva por organização
CREATE POLICY "Users can manage own org media_jobs"
ON public.media_jobs
FOR ALL
TO authenticated
USING (organization_id = public.get_user_organization_id())
WITH CHECK (organization_id = public.get_user_organization_id());

-- Adicionar política específica para INSERT (caso não exista org_id no momento)
CREATE POLICY "Users can insert media_jobs in own org"
ON public.media_jobs
FOR INSERT
TO authenticated
WITH CHECK (organization_id = public.get_user_organization_id());
```

---

## Fase 3: Refatoração de Código (Opcional - Manutenibilidade)

### 3.1 Dividir `Pipelines.tsx` em Componentes Menores

O arquivo atual tem 1147 linhas. Proposta de divisão:

```text
src/pages/Pipelines.tsx (orquestrador ~200 linhas)
├── src/components/pipelines/PipelineBoard.tsx (~300 linhas)
│   ├── Kanban board com drag-and-drop
│   └── Lógica de colunas/estágios
├── src/components/pipelines/PipelineFilters.tsx (~150 linhas)
│   ├── Filtros de busca
│   ├── Filtros de data
│   └── Filtros de tags
├── src/components/pipelines/PipelineSelector.tsx (~100 linhas)
│   └── Dropdown de seleção de pipeline
├── src/components/pipelines/PipelineActions.tsx (~100 linhas)
│   └── Botões de ação (novo lead, configurações, etc.)
└── src/components/pipelines/hooks/
    ├── usePipelineFilters.ts
    ├── usePipelineDragDrop.ts
    └── usePipelineLeads.ts
```

**Benefícios:**
- Arquivos menores e mais fáceis de manter
- Melhor separação de responsabilidades
- Facilita testes unitários
- Reduz conflitos em merge

---

## Ordem de Execução Recomendada

1. **Configurar Secrets** → Pré-requisito para próximas etapas
2. **Corrigir Evolution Webhook** → Segurança crítica
3. **Corrigir Meta Webhook** → Segurança crítica
4. **Corrigir RLS media_jobs** → Segurança de dados
5. **Refatorar Pipelines.tsx** → Manutenibilidade (opcional, pode ser feito depois)

---

## Detalhes Técnicos Adicionais

### Políticas RLS Atuais com `USING (true)` (Revisão)

| Tabela | Política | Justificativa |
|--------|----------|---------------|
| `available_permissions` | Leitura pública | ✅ OK - Dados não sensíveis |
| `invitations` | Leitura por token | ✅ OK - Necessário para fluxo de convite |
| `permissions` | Leitura pública | ✅ OK - Dados não sensíveis |
| `system_settings` | Leitura pública | ✅ OK - Acabamos de adicionar para logo |
| `media_jobs` | ALL com true | ❌ PROBLEMA - Precisa restringir por org |

### Funções Security Definer Revisadas

As funções `get_user_organization_id`, `get_user_role`, `is_super_admin`, `is_organization_admin` e `handle_lead_intake` foram verificadas e estão corretamente implementadas com:
- `SECURITY DEFINER` para bypass de RLS
- `SET search_path = 'public'` para prevenir ataques de path
- Lógica correta de verificação

