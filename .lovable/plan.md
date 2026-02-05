
# Plano: Melhorias no Follow-up Builder

## 1. Mais Variáveis Disponíveis

### Problema
Atualmente só mostra 3 variáveis básicas (`{{lead.name}}`, `{{lead.phone}}`, `{{organization.name}}`), mas existem muitos outros campos disponíveis no lead e tabelas relacionadas.

### Solução
Expandir a lista de variáveis disponíveis para incluir todos os campos relevantes do lead e dados relacionados:

**Campos do Lead (tabela `leads`):**
- `{{lead.name}}` - Nome
- `{{lead.phone}}` - Telefone
- `{{lead.email}}` - E-mail
- `{{lead.source}}` - Origem
- `{{lead.message}}` - Mensagem original
- `{{lead.valor_interesse}}` - Valor de interesse

**Campos de Telecom (tabela `telecom_customers`):**
- `{{customer.address}}` - Endereço
- `{{customer.city}}` - Cidade
- `{{customer.neighborhood}}` - Bairro
- `{{customer.cep}}` - CEP
- `{{customer.cpf_cnpj}}` - CPF/CNPJ
- `{{customer.contracted_plan}}` - Plano contratado
- `{{customer.plan_value}}` - Valor do plano

**Dados de Contexto:**
- `{{date}}` - Data atual
- `{{time}}` - Hora atual
- `{{organization.name}}` - Nome da organização

---

## 2. Parar Follow-up Quando Lead Responder

### Problema
Se o lead responde ao WhatsApp, o follow-up deveria parar automaticamente e opcionalmente mover o lead para outra etapa (para receber atendimento humano).

### Solução
Adicionar na configuração da automação:
1. **Checkbox**: "Parar follow-up se lead responder"
2. **Seletor opcional**: "Ao responder, mover para etapa:" (para indicar atendimento)

```text
┌──────────────────────────────────────────────────────┐
│ ☑️ Parar follow-up se lead responder                │
│                                                      │
│ AO RESPONDER, MOVER PARA (opcional)                 │
│ ┌──────────────────────────────────────────────────┐│
│ │ Em atendimento                             ▼    ││
│ └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

**Implementação técnica:**
- Salvar `stop_on_reply: true` e `on_reply_move_to_stage_id` no `trigger_config`
- Quando `evolution-webhook` receber mensagem, verificar se há execuções "waiting" para aquele lead
- Se `stop_on_reply` ativo, marcar execução como "cancelled" e opcionalmente mover lead

---

## 3. Filtrar por Usuário Específico

### Problema
Se um supervisor cria automação para uma pipeline, ela dispara para TODOS os leads que entram, incluindo leads de outros corretores. Cada usuário deveria poder criar automações apenas para SEUS leads.

### Solução
Adicionar seletor opcional de usuário:

```text
┌──────────────────────────────────────────────────────┐
│ FILTRAR POR USUÁRIO (opcional)                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ Todos os usuários                          ▼    ││
│ │  • Todos os usuários                            ││
│ │  • Apenas meus leads                            ││
│ │  • João Silva                                   ││
│ │  • Maria Santos                                 ││
│ └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

**Implementação técnica:**
- Adicionar estado `filterUserId` no frontend
- Salvar `filter_user_id` no `trigger_config`
- No `automation-trigger`, validar se `lead.assigned_user_id === filter_user_id` (se configurado)

---

## Alterações Técnicas

### Frontend: `src/components/automations/FollowUpBuilder.tsx`

1. **Expandir lista de variáveis** (seção "Variáveis disponíveis")

2. **Adicionar estados:**
```typescript
const [stopOnReply, setStopOnReply] = useState(true);
const [onReplyStageId, setOnReplyStageId] = useState<string>('');
const [filterUserId, setFilterUserId] = useState<string>('');
const { data: users } = useUsers();
```

3. **Adicionar seletores no painel esquerdo:**
```typescript
{/* Filtro por usuário */}
<div className="space-y-2">
  <Label>Filtrar por usuário</Label>
  <Select value={filterUserId} onValueChange={setFilterUserId}>
    <SelectItem value="">Todos os usuários</SelectItem>
    <SelectItem value="__me__">Apenas meus leads</SelectItem>
    {users?.map(user => (
      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
    ))}
  </Select>
</div>

{/* Parar ao responder */}
<div className="space-y-3">
  <div className="flex items-center gap-2">
    <Checkbox checked={stopOnReply} onCheckedChange={setStopOnReply} />
    <Label>Parar follow-up se lead responder</Label>
  </div>
  {stopOnReply && pipelineId && (
    <Select value={onReplyStageId} onValueChange={setOnReplyStageId}>
      <SelectItem value="">Não mover (apenas parar)</SelectItem>
      {stages?.map(stage => (
        <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
      ))}
    </Select>
  )}
</div>
```

4. **Atualizar trigger_config no save:**
```typescript
trigger_config: {
  ...existing,
  filter_user_id: filterUserId || null,
  stop_on_reply: stopOnReply,
  on_reply_move_to_stage_id: onReplyStageId || null,
}
```

### Backend: `supabase/functions/automation-trigger/index.ts`

Adicionar validação de usuário:
```typescript
// Validar filtro por usuário
if (config.filter_user_id) {
  // Buscar lead para verificar assigned_user_id
  const { data: lead } = await supabase
    .from("leads")
    .select("assigned_user_id")
    .eq("id", data.lead_id)
    .single();
  
  if (config.filter_user_id === "__me__") {
    // Comparar com creator da automação
    if (lead?.assigned_user_id !== automation.created_by) {
      return false;
    }
  } else if (lead?.assigned_user_id !== config.filter_user_id) {
    return false;
  }
}
```

### Backend: `supabase/functions/evolution-webhook/index.ts`

Adicionar lógica para parar execuções quando lead responde:
```typescript
// Ao receber mensagem do cliente
if (messageFromClient && conversationId) {
  // Buscar execuções "waiting" para este lead
  const { data: executions } = await supabase
    .from("automation_executions")
    .select("*, automation:automations(*)")
    .eq("conversation_id", conversationId)
    .eq("status", "waiting");
  
  for (const exec of executions || []) {
    const config = exec.automation?.trigger_config || {};
    if (config.stop_on_reply) {
      // Cancelar execução
      await supabase
        .from("automation_executions")
        .update({ status: "cancelled", completed_at: new Date().toISOString() })
        .eq("id", exec.id);
      
      // Mover lead se configurado
      if (config.on_reply_move_to_stage_id && exec.lead_id) {
        await supabase
          .from("leads")
          .update({ stage_id: config.on_reply_move_to_stage_id })
          .eq("id", exec.lead_id);
      }
    }
  }
}
```

### Backend: `supabase/functions/automation-executor/index.ts`

Expandir função `replaceVariables` para buscar dados completos do lead:
```typescript
async function replaceVariables(supabase, template, execution) {
  let result = template;
  
  if (execution.lead_id) {
    const { data: lead } = await supabase
      .from("leads")
      .select("*, organization:organizations(name)")
      .eq("id", execution.lead_id)
      .single();
    
    if (lead) {
      result = result.replace(/\{\{lead\.name\}\}/g, lead.name || "");
      result = result.replace(/\{\{lead\.phone\}\}/g, lead.phone || "");
      result = result.replace(/\{\{lead\.email\}\}/g, lead.email || "");
      result = result.replace(/\{\{lead\.source\}\}/g, lead.source || "");
      result = result.replace(/\{\{lead\.message\}\}/g, lead.message || "");
      result = result.replace(/\{\{organization\.name\}\}/g, lead.organization?.name || "");
    }
    
    // Buscar dados telecom se existir
    const { data: customer } = await supabase
      .from("telecom_customers")
      .select("*")
      .eq("lead_id", execution.lead_id)
      .maybeSingle();
    
    if (customer) {
      result = result.replace(/\{\{customer\.address\}\}/g, customer.address || "");
      result = result.replace(/\{\{customer\.city\}\}/g, customer.city || "");
      // ...demais campos
    }
  }
  
  result = result.replace(/\{\{date\}\}/g, new Date().toLocaleDateString("pt-BR"));
  result = result.replace(/\{\{time\}\}/g, new Date().toLocaleTimeString("pt-BR"));
  
  return result;
}
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/automations/FollowUpBuilder.tsx` | Expandir variáveis, adicionar filtro usuário, checkbox stop-on-reply |
| `supabase/functions/automation-trigger/index.ts` | Validar filter_user_id |
| `supabase/functions/automation-executor/index.ts` | Expandir replaceVariables com mais campos |
| `supabase/functions/evolution-webhook/index.ts` | Cancelar execuções e mover lead ao responder |

---

## Resultado Final

```text
┌─────────────────────────────────────────────────────────────────┐
│ SESSÃO WHATSAPP                                                │
│ [WhatsApp Principal ▼]                                         │
│                                                                 │
│ DISPARAR QUANDO                                                │
│ [Mudou de etapa ▼]                                             │
│                                                                 │
│ PIPELINE                                                        │
│ [Vendas ▼]                                                     │
│                                                                 │
│ ETAPA ESPECÍFICA                                               │
│ [Não Responde ▼]                                               │
│                                                                 │
│ FILTRAR POR USUÁRIO                                            │
│ [Apenas meus leads ▼]  ← NOVO                                  │
│                                                                 │
│ ☑️ Parar follow-up se lead responder  ← NOVO                   │
│   └─ Ao responder, mover para: [Em atendimento ▼]              │
│                                                                 │
│ ─────────────────────────────────────────────────────────────  │
│                                                                 │
│ VARIÁVEIS DISPONÍVEIS  ← EXPANDIDO                             │
│ {{lead.name}}                                                   │
│ {{lead.phone}}                                                  │
│ {{lead.email}}                                                  │
│ {{lead.source}}                                                 │
│ {{customer.address}}                                            │
│ {{customer.city}}                                               │
│ {{organization.name}}                                           │
│ {{date}}                                                        │
│ {{time}}                                                        │
└─────────────────────────────────────────────────────────────────┘
```
