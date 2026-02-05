
# Correção: Bug de Lead Voltando à Coluna Anterior no Kanban

## Diagnóstico

O problema é uma **race condition** entre:
1. **Update otimista** do drag-and-drop
2. **Real-time subscription** que escuta mudanças na tabela `leads`
3. **Refetch final** que sincroniza com o banco

### Fluxo Atual (com bug)

```text
1. Usuário arrasta lead A → B
2. Cache atualizado (A → B) ✓
3. Supabase UPDATE enviado
4. Banco atualiza lead
5. Real-time subscription dispara refetch() ← PROBLEMA
6. Refetch retorna dados (pode ser timing ruim)
7. Lead "volta" para A visualmente
```

### Causa Raiz

Na linha 207, a subscription dispara `refetch()` sempre que qualquer mudança acontece em `leads`. Durante o drag-and-drop, isso interfere com o update otimista.

---

## Solução Proposta

Adicionar um **flag de proteção** que bloqueia o refetch da real-time subscription durante o processo de drag-and-drop.

### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Pipelines.tsx` | Adicionar ref `isDragging` para bloquear refetch durante drag |

---

## Implementação Técnica

### 1. Adicionar ref para controlar estado de drag

```typescript
// Após os outros estados (linha ~118)
const isDraggingRef = useRef(false);
```

### 2. Proteger a subscription contra refetch durante drag

```typescript
// Modificar a subscription (linhas 198-230)
.on(
  'postgres_changes',
  {
    event: '*',
    schema: 'public',
    table: 'leads',
    filter: `organization_id=eq.${profile.organization_id}`,
  },
  () => {
    // NÃO refetch durante drag-and-drop ativo
    if (!isDraggingRef.current) {
      refetch();
    }
  }
)
```

### 3. Marcar início/fim do drag no handler

```typescript
const handleDragEnd = useCallback(async (result: DropResult) => {
  // Marcar que estamos em processo de drag
  isDraggingRef.current = true;
  
  const { destination, source, draggableId } = result;
  
  if (!destination) {
    isDraggingRef.current = false;
    return;
  }
  if (destination.droppableId === source.droppableId && destination.index === source.index) {
    isDraggingRef.current = false;
    return;
  }
  
  // ... resto do código ...
  
  try {
    // ... update no banco ...
    
    await refetch();
    
  } catch (error: any) {
    queryClient.setQueryData(queryKey, previousData);
    toast.error('Erro ao mover lead: ' + error.message);
  } finally {
    // Liberar flag após completar (sucesso ou erro)
    isDraggingRef.current = false;
  }
}, [/* deps */]);
```

---

## Por que usar `useRef` ao invés de `useState`

- `useRef` não causa re-render quando muda
- Atualização é síncrona e imediata
- Perfeito para flags de controle que não afetam a UI

---

## Resultado Esperado

### Antes
- Lead move → volta para coluna anterior (bug)

### Depois
- Lead move → permanece na coluna de destino
- Real-time sync continua funcionando para outras atualizações (outros usuários, etc.)

---

## Testes a Realizar

1. Arrastar lead entre colunas → deve permanecer na nova coluna
2. Outro usuário mover um lead → deve atualizar em tempo real
3. Criar novo lead via webhook → deve aparecer automaticamente
4. Mover lead rapidamente entre várias colunas → não deve bugar
