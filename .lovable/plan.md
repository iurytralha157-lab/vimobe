
# Plano: Corrigir Erro do Formulário e Melhorar Fluxo de Leads do Site

## Problema Atual

1. **Erro na Edge Function**: Usando `notes` e `telefone` que não existem na tabela leads (colunas corretas: `message` e `phone`)
2. **Lógica inflexível**: Sempre exige pipeline/stage, não permite lead "solto" em contatos

---

## Nova Lógica de Leads do Site

```text
Lead chega do site
        │
        ▼
   ┌─────────────────────┐
   │ Tenta distribuição  │
   │ (handle_lead_intake)│
   └─────────────────────┘
        │
        ├── SIM: Fila encontrada
        │   └── Lead vai para pipeline/stage da fila
        │       com responsável definido pela distribuição
        │
        └── NÃO: Sem fila ativa
            └── Lead vai só para CONTATOS:
                • Sem pipeline_id
                • Sem stage_id  
                • Responsável = Administrador da organização
                • Source = "website"
                • Status = "open"
```

---

## Correções Técnicas

**Arquivo:** `supabase/functions/public-site-contact/index.ts`

### 1. Corrigir Nomes das Colunas

| Errado | Correto |
|--------|---------|
| `notes` | `message` |
| `telefone` | `phone` |

### 2. Nova Lógica de Criação

```typescript
// 1. Primeiro buscar o admin da organização
const { data: admin } = await supabase
  .from('users')
  .select('id')
  .eq('organization_id', organization_id)
  .eq('role', 'admin')
  .eq('is_active', true)
  .order('created_at', { ascending: true })
  .limit(1)
  .maybeSingle();

// 2. Criar lead SEM pipeline/stage (vai para Contatos apenas)
const leadData = {
  organization_id: organization_id,
  pipeline_id: null,       // Sem pipeline inicialmente
  stage_id: null,          // Sem estágio inicialmente  
  assigned_user_id: admin?.id || null,  // Admin como responsável padrão
  assigned_at: admin ? new Date().toISOString() : null,
  name: name,
  email: email || null,
  phone: normalizedPhone,  // Correção: era telefone
  message: message || null, // Correção: era notes
  source: 'website',
  deal_status: 'open',
  interest_property_id: property_id || null,
};

// 3. Inserir lead
const { data: newLead } = await supabase
  .from('leads')
  .insert(leadData)
  .select('id')
  .single();

// 4. Tentar distribuição (vai mover para pipeline se houver fila)
const { data: distributionResult } = await supabase
  .rpc('handle_lead_intake', { p_lead_id: newLead.id });

// Se distribuição funcionou, o lead agora está em um pipeline
// Se não funcionou, o lead continua em Contatos com o admin
```

### 3. Remover Dependência de Pipeline/Stage

Antes: A função falhava se não houvesse pipeline
Depois: Pipeline é opcional, lead pode existir só em Contatos

---

## Resultado

| Cenário | Comportamento |
|---------|---------------|
| **Com fila de distribuição para "website"** | Lead vai para pipeline/stage da fila, responsável definido pela distribuição |
| **Sem fila configurada** | Lead aparece em Contatos, responsável = admin, sem pipeline |
| **Lead existente** | Adiciona atividade com nova mensagem |

---

## Campos do Lead (Contatos)

Quando não houver distribuição, o lead terá:

- **Nome**: Do formulário
- **Telefone**: Do formulário
- **E-mail**: Do formulário (opcional)
- **Origem**: "Website"
- **Status**: "Aberto"
- **Responsável**: Administrador da organização
- **Criado em**: Data/hora do envio
- **Pipeline**: Vazio (não aparece no Kanban)

---

## Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/public-site-contact/index.ts` | Corrigir colunas + nova lógica sem dependência de pipeline |
