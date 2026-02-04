

# Plano: Permissão "Travar Pipeline" + Notificação de Movimentação (Telecom)

## Resumo

Duas funcionalidades serão implementadas:

1. **Nova permissão `pipeline_lock`**: Impede que usuários movam leads entre colunas/estágios no Kanban
2. **Notificação de movimentação (apenas Telecom)**: Quando um lead é movido, notifica as partes interessadas

---

## Funcionalidade 1: Permissão "Travar Pipeline"

### O que faz
- Usuários com essa permissão **NÃO podem** arrastar leads entre colunas no Kanban
- Eles **podem** ver a pipeline normalmente
- Eles **podem** criar novos leads
- O drag-and-drop fica desabilitado visualmente

### Comportamento
- Se o usuário tem a permissão `pipeline_lock` ativada na sua função, o Kanban aparece sem capacidade de arrastar
- Administradores e Super Admins nunca são afetados (sempre podem mover)

---

## Funcionalidade 2: Notificação de Movimentação (Telecom Only)

### O que faz
- Quando um lead é movido de uma coluna para outra, uma notificação é enviada
- **Apenas para organizações do segmento Telecom**

### Quem recebe a notificação
Seguindo a mesma lógica de `notifyLeadCreated`:
1. **Vendedor atribuído** ao lead
2. **Líderes das equipes** vinculadas à pipeline
3. **Administradores** da organização

### Mensagem da notificação
- **Título**: "Lead movido"
- **Conteúdo**: "{Nome do lead} foi movido de '{Estágio anterior}' para '{Novo estágio}'"

---

## Alterações Técnicas

### 1. Banco de Dados

Inserir nova permissão na tabela `available_permissions`:

```sql
INSERT INTO available_permissions (key, name, description, category)
VALUES (
  'pipeline_lock',
  'Travar movimentação no pipeline',
  'Impede que o usuário arraste leads entre estágios no Kanban',
  'leads'
);
```

### 2. Frontend - RolesTab.tsx

Adicionar a nova permissão ao grupo `lead_actions`:

```typescript
// Alterar linha 81
lead_actions: { 
  label: 'Ações em Leads', 
  keys: ['lead_edit', 'lead_delete', 'lead_assign', 'lead_transfer', 'pipeline_lock'] 
},
```

### 3. Frontend - Pipelines.tsx

**a) Verificar permissão:**
```typescript
const { data: hasPipelineLock = false } = useHasPermission('pipeline_lock');
```

**b) Desabilitar drag-and-drop:**
- Se `hasPipelineLock === true` E usuário não é admin, desabilitar o `DragDropContext`
- Mostrar cursor padrão em vez de "grab" nos cards

**c) Adicionar notificação para Telecom:**
- Após o update bem-sucedido em `handleDragEnd`, se `isTelecom === true`, chamar `notifyLeadMoved`

### 4. Nova função - use-lead-notifications.ts

Criar função `notifyLeadMoved`:

```typescript
interface NotifyLeadMovedParams {
  leadId: string;
  leadName: string;
  organizationId: string;
  pipelineId: string;
  fromStage: string;
  toStage: string;
  assignedUserId?: string | null;
}

export async function notifyLeadMoved({
  leadId,
  leadName,
  organizationId,
  pipelineId,
  fromStage,
  toStage,
  assignedUserId,
}: NotifyLeadMovedParams): Promise<void> {
  // Mesma lógica de notifyLeadCreated
  // 1. Notificar vendedor atribuído
  // 2. Notificar líderes das equipes da pipeline
  // 3. Notificar administradores
}
```

---

## Fluxo Visual

### Permissão Travar Pipeline

```text
┌─────────────────────────────────────────────────────────┐
│                    Configurações                        │
│                  Aba: Funções                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [✓] Editar leads                                       │
│  [✓] Excluir leads                                      │
│  [✓] Atribuir leads                                     │
│  [✓] Transferir leads                                   │
│  [ ] Travar movimentação no pipeline  ← NOVA OPÇÃO      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Comportamento no Kanban

**Usuário COM permissão `pipeline_lock`:**
- Cards aparecem normalmente
- Cursor permanece normal (sem ícone de "mão")
- Tentar arrastar não faz nada

**Usuário SEM permissão `pipeline_lock` (ou admin):**
- Comportamento normal, pode arrastar

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/migrations/xxx_add_pipeline_lock.sql` | Inserir nova permissão |
| `src/components/settings/RolesTab.tsx` | Adicionar key ao grupo de ações |
| `src/pages/Pipelines.tsx` | Verificar permissão e bloquear drag; chamar notifyLeadMoved para Telecom |
| `src/hooks/use-lead-notifications.ts` | Criar função `notifyLeadMoved` |

---

## Considerações

1. **Admins nunca são bloqueados**: A verificação de `hasPipelineLock` só se aplica a usuários não-admin
2. **Notificação é assíncrona**: Não bloqueia a UI, roda em background após o move
3. **Apenas Telecom**: A notificação de movimentação só é disparada se `organization.segment === 'telecom'`
4. **Evita duplicatas**: Usa Set de IDs como na função existente `notifyLeadCreated`

