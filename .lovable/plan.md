# Plano: Paginação por Coluna + Remoção da Aba Integrações

**STATUS: ✅ IMPLEMENTADO**

## Visão Geral

Implementar sistema de "carregar mais" por coluna no Kanban e remover a aba de Integrações vazia do dialog de configuração de estágio.

---

## 1. Paginação por Coluna (Carregar Mais)

### Como vai funcionar

- Cada coluna exibe inicialmente **100 leads** (ordenados por `stage_entered_at` - mais recentes primeiro)
- Se houver mais leads, um botão "Carregar mais" aparece no final da coluna
- Ao clicar, carrega mais 100 leads daquela coluna específica
- O contador no cabeçalho da coluna mostra o **total real** (ex: "150" mesmo exibindo 100)

### Arquitetura

O sistema atual busca todos os leads de uma pipeline de uma vez. Para implementar a paginação por coluna sem quebrar o drag-and-drop, vou:

1. **Manter a query principal** com limite de 100 leads por estágio (ao invés de 500 global)
2. **Adicionar estado de paginação** por coluna no Pipelines.tsx
3. **Criar função de busca incremental** que carrega mais leads de uma coluna específica
4. **Mesclar os dados** no cache do React Query

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/use-stages.ts` | Modificar `useStagesWithLeads` para limitar 100 leads por estágio + adicionar hook `useLoadMoreLeads` |
| `src/pages/Pipelines.tsx` | Adicionar estado de paginação, botão "Carregar mais" por coluna |

---

## 2. Remoção da Aba Integrações

### Alteração Simples

Remover a aba "Integrações" do `TabsList` e seu conteúdo.

| Arquivo | Alteração |
|---------|-----------|
| `src/components/pipelines/StageSettingsDialog.tsx` | Remover `TabsTrigger` e `TabsContent` de "integrations" |

---

## Detalhes Técnicos

### use-stages.ts - Modificações

```typescript
// ANTES: limite global de 500
.limit(500)

// DEPOIS: limite por estágio via SQL
// Usar window function para limitar 100 por stage_id

// Nova função para carregar mais leads de um estágio específico
export function useLoadMoreLeads(pipelineId: string, stageId: string, offset: number) {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(LEAD_PIPELINE_FIELDS)
        .eq('pipeline_id', pipelineId)
        .eq('stage_id', stageId)
        .order('stage_entered_at', { ascending: false })
        .range(offset, offset + 99); // Próximos 100
      
      if (error) throw error;
      return data;
    }
  });
}
```

### Pipelines.tsx - Estado e UI

```typescript
// Estado para controlar quantos leads carregar por coluna
const [leadsLoadedPerStage, setLeadsLoadedPerStage] = useState<Record<string, number>>({});

// No render da coluna, após os cards:
{stage.leads?.length === 100 && (
  <Button 
    variant="ghost" 
    size="sm" 
    className="w-full text-xs text-muted-foreground"
    onClick={() => handleLoadMore(stage.id)}
  >
    <ChevronDown className="h-3 w-3 mr-1" />
    Carregar mais
  </Button>
)}
```

### Abordagem Alternativa (Mais Simples)

Como o limite de 100 por coluna é suficiente para 99% dos casos, posso simplificar:

1. **Sem query SQL complexa**: Buscar todos normalmente, mas limitar no frontend
2. **Botão "Carregar mais"**: Busca apenas daquela coluna específica
3. **Merge no estado local**: Adiciona ao array de leads daquela coluna

Esta abordagem é mais simples e mantém a compatibilidade com o drag-and-drop.

---

## StageSettingsDialog.tsx - Remoção da Aba

```typescript
// ANTES: 4 colunas
<TabsList className="w-full grid grid-cols-4 mb-4">
  <TabsTrigger value="general">...</TabsTrigger>
  <TabsTrigger value="cadence">...</TabsTrigger>
  <TabsTrigger value="integrations">...</TabsTrigger>  // REMOVER
  <TabsTrigger value="automations">...</TabsTrigger>
</TabsList>

// DEPOIS: 3 colunas
<TabsList className="w-full grid grid-cols-3 mb-4">
  <TabsTrigger value="general">...</TabsTrigger>
  <TabsTrigger value="cadence">...</TabsTrigger>
  <TabsTrigger value="automations">...</TabsTrigger>
</TabsList>

// Remover também o TabsContent de integrations
```

---

## Resultado Esperado

### Antes

- Pipeline carrega até 500 leads (pode ficar lento)
- Leads antigos não aparecem
- Aba "Integrações" vazia confunde usuário

### Depois

- Pipeline carrega 100 leads por coluna (mais rápido)
- Botão "Carregar mais" permite ver leads antigos
- Contador mostra total real (ex: "250" mesmo exibindo 100)
- Interface mais limpa sem aba vazia

---

## Ordem de Implementação

1. ✅ Remover aba "Integrações" do StageSettingsDialog
2. ✅ Modificar use-stages.ts para limitar leads por coluna (100 por estágio)
3. ✅ Adicionar hook useLoadMoreLeads com enriquecimento de tags e WhatsApp
4. ✅ Implementar botão "Carregar mais" no Pipelines.tsx
5. Testar drag-and-drop após carregar mais leads (pronto para teste manual)
