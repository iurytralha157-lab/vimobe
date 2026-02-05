
# Plano: Corrigir Botão "Ver Lead" no FloatingChat e Navegação para Pipeline

## Problemas Identificados

### Problema 1: Botão "Ver Lead" não aparece
O botão de "Ver Lead" só é renderizado quando `leadId` existe:
```tsx
{leadId && (
  <Tooltip>...</Tooltip>
)}
```

Mas o `leadId` vem de `activeConversation.lead?.id`, que pode ser `null` em dois cenários:
1. A conversa não tem `lead_id` vinculado diretamente
2. O lead foi encontrado via fallback por telefone, mas o objeto `activeConversation` já foi armazenado no contexto antes dessa associação ser feita

### Problema 2: Card do lead não abre na Pipeline
Quando o lead existe e a navegação acontece, o `useEffect` em `Pipelines.tsx` procura o lead nos stages carregados. Porém:
1. Se o lead está paginado (além dos primeiros 100), ele não é encontrado
2. O código não faz nada quando não encontra (apenas não limpa a URL)

## Solução Proposta

### Parte 1: Sincronizar lead com dados atualizados

**Arquivo**: `src/components/chat/FloatingChat.tsx`

Adicionar um efeito que sincroniza o `activeConversation` com os dados mais recentes das conversas. Quando o hook `useWhatsAppConversations` faz o fallback por telefone e encontra um lead, o `activeConversation` será atualizado:

```tsx
// Sync activeConversation with latest data from hook (including phone fallback leads)
useEffect(() => {
  if (activeConversation && conversations) {
    const updatedConv = conversations.find(c => c.id === activeConversation.id);
    if (updatedConv && updatedConv.lead && !activeConversation.lead) {
      // Lead foi encontrado via fallback - atualizar o contexto
      openConversation(updatedConv);
    }
  }
}, [conversations, activeConversation?.id]);
```

### Parte 2: Buscar lead não paginado na Pipeline

**Arquivo**: `src/pages/Pipelines.tsx`

Quando o lead não é encontrado nos stages carregados, fazer uma busca direta no banco:

```tsx
useEffect(() => {
  const params = new URLSearchParams(location.search);
  const leadId = params.get('lead_id') || params.get('lead');
  
  if (leadId && stages.length > 0) {
    // Primeiro, tentar encontrar nos stages carregados
    for (const stage of stages) {
      const lead = stage.leads?.find((l: any) => l.id === leadId);
      if (lead) {
        setSelectedLead(lead);
        navigate('/crm/pipelines', { replace: true });
        return;
      }
    }
    
    // Lead não encontrado localmente - buscar diretamente no banco
    const fetchLead = async () => {
      const { data: lead, error } = await supabase
        .from('leads')
        .select(`
          *,
          assigned_user:profiles!leads_assigned_user_id_fkey(id, name, avatar_url),
          stage:stages(id, name, color),
          tags:lead_tags(tag:tags(id, name, color))
        `)
        .eq('id', leadId)
        .single();
      
      if (!error && lead) {
        setSelectedLead(lead);
        navigate('/crm/pipelines', { replace: true });
      }
    };
    
    fetchLead();
  }
}, [location.search, stages, navigate]);
```

## Arquivos a Modificar
1. `src/components/chat/FloatingChat.tsx` - Sincronizar activeConversation
2. `src/pages/Pipelines.tsx` - Buscar lead não paginado

## Resultado Esperado
1. O botão "Ver Lead" aparecerá mesmo quando o lead foi encontrado via fallback por telefone
2. Ao clicar no botão, o card do lead abrirá corretamente, mesmo se o lead estiver além da paginação inicial

## Detalhes Técnicos
- A sincronização no FloatingChat usa comparação por ID para evitar loops infinitos
- A busca direta no Pipelines inclui todos os relacionamentos necessários para exibir o card corretamente
- Ambas as soluções são não-destrutivas e compatíveis com o código existente
