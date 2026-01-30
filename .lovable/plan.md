
# Plano: Corrigir Persistência de Campos no Formulário de Imóveis

## Diagnóstico Completo

Após análise detalhada do código, banco de dados e network requests, identifiquei os seguintes problemas:

### Problemas Identificados

1. **Cache do React Query causando dados desatualizados**
   - Quando o usuário abre para editar, o `useProperty` pode retornar dados cacheados antigos
   - A query não força um refetch ao editar

2. **Campo Mobília não funciona com string vazia**
   - O Radix Select não aceita `value=""` corretamente
   - Quando `formData.mobilia` é `""`, o Select fica inconsistente

3. **Extras e Proximidades nunca são salvos**
   - Os campos `detalhes_extras` e `proximidades` **não existem** na tabela `properties`
   - O usuário seleciona opções que nunca são persistidas
   - Precisa criar tabelas de junção ou adicionar colunas JSON

---

## Solução Proposta

### 1. Forçar Refetch ao Editar (Cache Bypass)

**Arquivo:** `src/pages/Properties.tsx`

```typescript
// Adicionar refetch manual ao clicar em editar
const { data: fullPropertyData, refetch: refetchProperty } = useProperty(loadingPropertyId);

const openEdit = async (property: Property) => {
  setLoadingPropertyId(property.id);
};

// No useEffect, garantir que sempre busca dados frescos
useEffect(() => {
  if (loadingPropertyId) {
    // Invalidar cache antes de buscar
    queryClient.invalidateQueries({ queryKey: ['property', loadingPropertyId] });
  }
}, [loadingPropertyId]);
```

### 2. Corrigir Select de Mobília

**Arquivo:** `src/components/properties/PropertyFormDialog.tsx`

```typescript
<Select 
  value={formData.mobilia || undefined}  // undefined ao invés de ""
  onValueChange={(v) => setFormData({ ...formData, mobilia: v })}
>
```

### 3. Adicionar Colunas JSON para Extras e Proximidades

**Migração SQL:**

```sql
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS detalhes_extras text[] DEFAULT '{}';

ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS proximidades text[] DEFAULT '{}';
```

**Arquivo:** `src/pages/Properties.tsx` (handleSubmit)

Adicionar os campos ao objeto de salvamento:
```typescript
const propertyData = {
  // ... outros campos
  detalhes_extras: formData.detalhes_extras,
  proximidades: formData.proximidades,
};
```

**Arquivo:** `src/pages/Properties.tsx` (useEffect de carga)

Carregar os dados:
```typescript
detalhes_extras: (fullPropertyData.detalhes_extras as string[]) || [],
proximidades: (fullPropertyData.proximidades as string[]) || [],
```

---

## Resumo das Mudanças

| Arquivo | Mudança |
|---------|---------|
| `Properties.tsx` | Invalidar cache ao editar, incluir campos extras no submit |
| `PropertyFormDialog.tsx` | Corrigir Select de Mobília com `undefined` |
| **Migração SQL** | Adicionar colunas `detalhes_extras` e `proximidades` |

---

## Resultado Esperado

1. Todos os campos (endereço, CEP, complemento, mobília, descrição) persistem corretamente
2. Extras e Proximidades são salvos no banco de dados
3. Ao editar, sempre carrega os dados mais recentes do banco
