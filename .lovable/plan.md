
# Plano de Melhorias Completas: Módulo de Conversas WhatsApp

## Resumo Executivo

Após análise detalhada do código, identifiquei diversos pontos de melhoria para tornar o módulo de Conversas mais completo e funcional. O plano está dividido em 4 fases para garantir estabilidade.

---

## Fase 1: Melhorias Visuais no Chat

### 1.1 Separadores de Data nas Mensagens (Prioridade Alta)

Implementar separadores visuais entre mensagens de dias diferentes, igual ao WhatsApp oficial (conforme print enviado).

**Arquivos a modificar:**
- `src/pages/Conversations.tsx`
- `src/components/chat/FloatingChat.tsx`

**Implementação:**
- Criar componente `DateSeparator` que exibe a data de forma amigável
- Lógica: Comparar data da mensagem atual com anterior
- Formatos: "Hoje", "Ontem", "Segunda-feira", "29/01/2026"

```text
Antes:
┌─────────────────┐
│ Msg 13:16       │
│ Msg 13:25       │
│ Msg 07:32       │  ← Outro dia, não tem indicação
│ Msg 12:09       │
└─────────────────┘

Depois:
┌─────────────────┐
│ Msg 13:16       │
│ Msg 13:25       │
├─── Sexta-feira ─┤  ← Separador visual
│ Msg 07:32       │
│ Msg 12:09       │
└─────────────────┘
```

### 1.2 Tags no Header da Conversa (Prioridade Alta)

Ao abrir uma conversa, exibir:
- Tags do lead (se existir lead vinculado)
- Nome da pipeline e coluna atual
- Botão "Criar Lead" se não existir lead

**Arquivos a modificar:**
- `src/pages/Conversations.tsx` (header da conversa desktop e mobile)
- `src/components/whatsapp/ConversationHeader.tsx` (extrair lógica se necessário)

**Dados necessários:**
- Já temos `lead.tags` via join na query
- Precisamos adicionar `pipeline` e `stage` ao select do lead

```text
┌──────────────────────────────────────────────────────────┐
│ 👤 João Silva                                            │
│ +55 61 99999-9999                                        │
│ [Facebook] [MCMV]  •  Pipeline Telecom → DOCUMENTOS      │
│                                         [+ Criar Lead]   │
└──────────────────────────────────────────────────────────┘
```

### 1.3 Melhorar Exibição de Tags na Lista de Conversas

Atualmente mostra apenas 1 tag. Melhorar para mostrar até 2 tags com tooltip para as demais.

**Arquivo:** `src/pages/Conversations.tsx` (ConversationItem)

---

## Fase 2: Correção de Bugs e Segurança

### 2.1 Verificar Visibilidade de Sessões para Admin

Análise do código revelou que o hook `useAccessibleSessions` já está correto:
- Busca sessões que o usuário é `owner` OU tem acesso via `whatsapp_session_access`
- Não dá acesso automático para admins

**Problema potencial identificado:**
O hook `useHasWhatsAppAccess` tem uma exceção para `super_admin`, mas não para `admin`. O código está correto.

**Verificação necessária:**
- Confirmar que o admin em questão tem sessões próprias ou acessos concedidos
- Verificar se há sessões órfãs (sem owner) sendo listadas por engano

**Ação:** Adicionar logs detalhados para debug se o problema persistir.

### 2.2 Verificar Salvamento de Áudio/Imagem

Análise do banco mostrou que áudios e imagens **estão sendo salvos corretamente**:
- `media_status: ready`
- URLs válidas no Supabase Storage

**Se ainda houver problemas de visualização:**
- Verificar compatibilidade do navegador com `audio/ogg; codecs=opus`
- MessageBubble já tem fallback com botão de download

---

## Fase 3: Novas Funcionalidades

### 3.1 Atalhos de Arquivos (Mídia Rápida)

Criar sistema para usuários salvarem arquivos/imagens de uso frequente para envio rápido.

**Nova tabela no banco:**
```sql
create table whatsapp_quick_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) not null,
  user_id uuid references auth.users(id),
  name text not null,
  file_url text not null,
  file_type text not null, -- image, document, video
  mime_type text,
  created_at timestamptz default now()
);
```

**Novos arquivos:**
- `src/hooks/use-quick-files.ts` - Hook para CRUD
- `src/components/whatsapp/QuickFilesPanel.tsx` - UI do painel

**Integração:**
- Botão ao lado do anexo no input de mensagem
- Drawer/popover com lista de arquivos salvos
- Opção de adicionar arquivo à lista

```text
┌─────────────────────────────────┐
│ 📁 Meus Arquivos Rápidos        │
├─────────────────────────────────┤
│ 📷 Tabela de preços.pdf         │
│ 📷 Logo empresa.png             │
│ 📷 Catálogo produtos.pdf        │
│                                 │
│ [+ Adicionar arquivo]           │
└─────────────────────────────────┘
```

### 3.2 Opção "Arquivadas" com Toggle Desativado por Padrão

Atualmente já está correto (`showArchived: false` por padrão). 

**Melhoria de UX:** Mudar de checkbox para um botão/toggle mais visível, similar ao Gmail.

---

## Fase 4: Refinamentos Finais

### 4.1 Criar Componente DateSeparator Reutilizável

```typescript
// src/components/whatsapp/DateSeparator.tsx
function DateSeparator({ date }: { date: Date }) {
  const label = formatDateLabel(date); // "Hoje", "Ontem", "Segunda-feira", "29/01/2026"
  
  return (
    <div className="flex items-center justify-center py-2">
      <div className="px-3 py-1 bg-muted/50 rounded-full text-xs text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
```

### 4.2 Adicionar Pipeline/Stage à Query de Conversas

Modificar `useWhatsAppConversations` para incluir dados de pipeline:

```typescript
lead:leads!whatsapp_conversations_lead_id_fkey(
  id, 
  name,
  pipeline:pipelines(id, name),
  stage:stages(id, name, color),
  tags:lead_tags(tag:tags(id, name, color))
)
```

---

## Arquivos a Criar/Modificar

### Novos Arquivos
| Arquivo | Descrição |
|---------|-----------|
| `src/components/whatsapp/DateSeparator.tsx` | Separador de data entre mensagens |
| `src/components/whatsapp/QuickFilesPanel.tsx` | Painel de arquivos rápidos |
| `src/hooks/use-quick-files.ts` | Hook para gerenciar arquivos rápidos |

### Arquivos Modificados
| Arquivo | Alterações |
|---------|------------|
| `src/pages/Conversations.tsx` | Separadores de data, header melhorado, até 2 tags |
| `src/components/chat/FloatingChat.tsx` | Separadores de data |
| `src/hooks/use-whatsapp-conversations.ts` | Adicionar pipeline/stage ao select do lead |

---

## Ordem de Implementação

1. **Separadores de data** - Impacto visual alto, implementação simples
2. **Info no header** (tags, pipeline, criar lead) - UX importante
3. **Melhorar exibição de tags na lista** - Refinamento
4. **Quick Files** - Funcionalidade nova (requer migração de banco)

---

## Estimativa de Complexidade

| Tarefa | Complexidade | Arquivos |
|--------|--------------|----------|
| Separadores de data | Média | 3 |
| Header com pipeline/tags | Média | 3 |
| Tags na lista (2+) | Baixa | 1 |
| Quick Files | Alta | 4 + migração |

---

## Detalhes Técnicos: Separadores de Data

A lógica para agrupar mensagens por data:

```typescript
// Dentro do render de mensagens
let lastDate: string | null = null;

{messages?.map(msg => {
  const msgDate = format(new Date(msg.sent_at), 'yyyy-MM-dd');
  const showSeparator = lastDate !== msgDate;
  lastDate = msgDate;
  
  return (
    <>
      {showSeparator && <DateSeparator date={new Date(msg.sent_at)} />}
      <MessageBubble ... />
    </>
  );
})}
```

Função para formatar label da data:

```typescript
function formatDateLabel(date: Date): string {
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  
  const daysAgo = differenceInDays(new Date(), date);
  if (daysAgo < 7) {
    return format(date, "EEEE", { locale: ptBR }); // "Segunda-feira"
  }
  
  return format(date, "dd/MM/yyyy"); // "29/01/2026"
}
```

---

## Próximos Passos

Após aprovação, implementarei na seguinte ordem:
1. Fase 1.1 - Separadores de data
2. Fase 1.2 - Header com info do lead
3. Fase 1.3 - Tags melhoradas na lista
4. Fase 3.1 - Quick Files (se aprovado banco)

A Fase 2 (verificação de bugs) será feita em paralelo durante a implementação.
