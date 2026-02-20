
## Marcar redistribuição no histórico do lead

### Problema atual

Quando um lead é redistribuído pelo pool-checker, o fluxo gera dois eventos genéricos separados no histórico:
1. `assignee_changed` → "Responsável removido" (quando `assigned_user_id = NULL`)
2. `assignee_changed` → "Atribuído para Usuário2" (quando o novo usuário é atribuído)

O usuário quer ver **um único evento claro**: `"🔄 Redistribuído de Usuário1 → Usuário2"`.

---

### Solução

A função `redistribute_lead_from_pool` (SQL) já sabe quem é o `from_user` e quem é o `to_user`. Basta inserir o evento de redistribuição diretamente lá, **antes** de limpar o `assigned_user_id`, capturando ambos os nomes. Também inserir em `lead_timeline_events` para aparecer na timeline do histórico.

---

### O que será mudado

#### 1. Migration SQL (novo arquivo)

Atualizar a função `redistribute_lead_from_pool` para:

**a)** Buscar o nome do usuário antigo **antes** de limpar a atribuição:
```sql
SELECT name INTO v_old_user_name FROM users WHERE id = v_old_user_id;
```

**b)** Inserir imediatamente em `activities` com tipo `lead_reentry` (já mapeado no frontend como evento especial) — **não**, melhor usar um tipo novo `pool_redistribution` para ser 100% explícito. Na verdade, o tipo mais adequado já disponível no frontend é `assignee_changed` com um metadata especial `is_redistribution: true`. Isso garante compatibilidade com o hook `use-lead-full-history.ts` que já trata `assignee_changed`.

**c)** Inserir em `lead_timeline_events` com `event_type = 'lead_assigned'` e metadata contendo `is_redistribution: true`, `from_user_name` e `to_user_name`:
```sql
INSERT INTO lead_timeline_events (
  organization_id, lead_id, event_type, title, channel, metadata, event_at
) VALUES (
  v_lead.organization_id,
  p_lead_id,
  'lead_assigned',
  '🔄 Lead redistribuído por inatividade',
  'system',
  jsonb_build_object(
    'is_redistribution', true,
    'from_user_id', v_old_user_id,
    'from_user_name', v_old_user_name,
    'reason', p_reason
  ),
  NOW()
);
```

> O `to_user_name` é preenchido **após** o `handle_lead_intake` retornar, via UPDATE no `lead_timeline_events`.

**d)** Inserir em `activities` com `is_redistribution: true` no metadata, para aparecer no histórico de atividades:
```sql
INSERT INTO activities (lead_id, user_id, type, content, metadata)
VALUES (
  p_lead_id,
  v_old_user_id,
  'assignee_changed',
  '🔄 Redistribuído por inatividade',
  jsonb_build_object(
    'is_redistribution', true,
    'from_user_id', v_old_user_id,
    'from_user_name', v_old_user_name,
    'reason', p_reason
  )
);
```

> Após o `handle_lead_intake` retornar o novo usuário, o trigger `log_lead_activity` já vai registrar o novo `assignee_changed`. Para evitar duplicidade, **não** inserimos um segundo evento manualmente — apenas atualizamos o evento de redistribuição com o nome do destino.

**Revisando**: O trigger `log_lead_activity` vai disparar quando `assigned_user_id` mudar de NULL para o novo usuário, gerando um `assignee_changed` genérico. Isso vai duplicar o evento. A melhor abordagem é:

1. Inserir o evento de redistribuição **antes** de chamar `handle_lead_intake`
2. Suprimir o trigger genérico para esse caso específico usando uma variável de sessão (`SET LOCAL app.is_redistribution = 'true'`) que o trigger verifica — mas isso é complexo.

**Abordagem mais simples e segura**: Inserir a marcação de redistribuição em `lead_timeline_events` (que não tem trigger de deduplicação) e aceitar que em `activities` aparecerão os dois eventos do trigger (remoção + atribuição). O frontend (`use-lead-full-history.ts`) vai mostrar ambos, mas o evento na `lead_timeline_events` vai aparecer com o label correto de redistribuição.

**Abordagem definitiva adotada**: Modificar a função SQL para:
1. Salvar nomes de origem antes de limpar
2. Inserir 1 evento em `lead_timeline_events` com `event_type = 'lead_assigned'`, `is_redistribution: true`, capturando from/to após o intake
3. O trigger `log_lead_activity` vai gerar o `assignee_changed` normal — mas no frontend vamos filtrar eventos de `assignee_changed` que ocorram dentro de 10 segundos de um evento de redistribuição para não mostrar duplicados (usando fingerprint já existente)

Na verdade a solução mais limpa é usar um `event_type` customizado `lead_redistributed` na timeline:
- `lead_timeline_events` recebe `event_type = 'lead_redistributed'`
- `activities` recebe `type = 'lead_redistributed'` (novo tipo)
- Frontend recebe label e ícone específico

---

### Arquivos modificados

#### 1. Nova migration SQL

Atualizar `redistribute_lead_from_pool` para inserir o evento de redistribuição **com ambos os nomes** (from e to):

```sql
CREATE OR REPLACE FUNCTION public.redistribute_lead_from_pool(...)
AS $function$
DECLARE
  v_lead leads%ROWTYPE;
  v_old_user_id uuid;
  v_old_user_name text;       -- NOVO
  v_new_user_id uuid;          -- NOVO  
  v_new_user_name text;        -- NOVO
  v_result jsonb;
  v_history_id uuid;
  v_timeline_id uuid;          -- NOVO
BEGIN
  ...
  -- Capturar nome do usuário antigo ANTES de limpar
  SELECT name INTO v_old_user_name FROM users WHERE id = v_old_user_id;
  
  -- Inserir evento de redistribuição na timeline (sem to_user ainda)
  INSERT INTO lead_timeline_events (
    organization_id, lead_id, event_type, title, channel, metadata, event_at
  ) VALUES (
    v_lead.organization_id, p_lead_id, 'lead_redistributed',
    'Lead redistribuído por inatividade', 'system',
    jsonb_build_object(
      'from_user_id', v_old_user_id,
      'from_user_name', v_old_user_name,
      'reason', p_reason
    ),
    NOW()
  ) RETURNING id INTO v_timeline_id;
  
  -- Inserir em activities também
  INSERT INTO activities (lead_id, user_id, type, content, metadata)
  VALUES (
    p_lead_id, v_old_user_id, 'lead_redistributed',
    'Redistribuído de ' || COALESCE(v_old_user_name, '?'),
    jsonb_build_object(
      'from_user_id', v_old_user_id,
      'from_user_name', v_old_user_name,
      'reason', p_reason
    )
  );
  
  -- ... limpa assigned_user_id, chama handle_lead_intake ...
  
  -- Após intake retornar o novo user, buscar nome e atualizar ambos os registros
  v_new_user_id := (v_result->>'assigned_user_id')::uuid;
  SELECT name INTO v_new_user_name FROM users WHERE id = v_new_user_id;
  
  -- Atualizar timeline com to_user
  UPDATE lead_timeline_events 
  SET metadata = metadata || jsonb_build_object(
    'to_user_id', v_new_user_id,
    'to_user_name', v_new_user_name,
    'assigned_user_name', v_new_user_name
  ),
  title = 'Redistribuído de ' || COALESCE(v_old_user_name, '?') || ' para ' || COALESCE(v_new_user_name, '?')
  WHERE id = v_timeline_id;
  
  -- Atualizar activities com to_user
  UPDATE activities 
  SET content = 'Redistribuído de "' || COALESCE(v_old_user_name, '?') || '" para "' || COALESCE(v_new_user_name, '?') || '"',
  metadata = metadata || jsonb_build_object(
    'to_user_id', v_new_user_id,
    'to_user_name', v_new_user_name
  )
  WHERE lead_id = p_lead_id AND type = 'lead_redistributed'
  ORDER BY created_at DESC LIMIT 1;
  
  ...
END;
```

#### 2. `src/hooks/use-lead-full-history.ts`

Adicionar mapeamento para o novo tipo `lead_redistributed` nos dois dicionários de labels:

```ts
// timelineEventLabels
lead_redistributed: 'Redistribuído',

// activityLabels  
lead_redistributed: 'Redistribuído',
```

Adicionar case no `getTimelineEventLabel()`:
```ts
case 'lead_redistributed': {
  const from = metadata.from_user_name;
  const to = metadata.to_user_name;
  if (from && to) return `🔄 Redistribuído de "${from}" → "${to}"`;
  if (from) return `🔄 Redistribuído de "${from}"`;
  return '🔄 Redistribuído por inatividade';
}
```

Adicionar case no `getActivityLabel()`:
```ts
case 'lead_redistributed': {
  const from = meta.from_user_name;
  const to = meta.to_user_name;
  if (from && to) return `🔄 Redistribuído de "${from}" → "${to}"`;
  if (from) return `🔄 Redistribuído de "${from}"`;
  return '🔄 Redistribuído por inatividade';
}
```

---

### Layout no histórico do lead

```
┌─────────────────────────────────────────────────────┐
│  🔄  Redistribuído de "Carlos Silva" → "Ana Lima"   │
│      Hoje, 14:35 · por inatividade                  │
└─────────────────────────────────────────────────────┘
```

---

### Resumo das mudanças

| Arquivo | Mudança |
|---|---|
| Nova migration SQL | Atualiza `redistribute_lead_from_pool` para inserir em `lead_timeline_events` e `activities` com tipo `lead_redistributed` |
| `src/hooks/use-lead-full-history.ts` | Adiciona labels e getters para o tipo `lead_redistributed` |
