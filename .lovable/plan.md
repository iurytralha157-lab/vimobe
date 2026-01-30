
# Plano: Corrigir Bug de Fotos Sumindo ao Editar Imóvel

## Problema Identificado

Quando o usuário clica para editar um imóvel, as fotos da galeria não aparecem porque:

1. **Query de listagem é otimizada** - O hook `useProperties` busca apenas campos essenciais para performance:
   ```
   id, code, title, tipo_de_imovel, tipo_de_negocio, 
   status, destaque, bairro, cidade, uf,
   quartos, banheiros, vagas, area_util, preco, 
   imagem_principal, created_at, organization_id
   ```
   
2. **Campo `fotos` não está na listagem** - Só `imagem_principal` é carregado

3. **Edição usa dados incompletos** - A função `openEdit()` usa o objeto da lista que não tem `fotos`

4. **Array vazio sobrescreve fotos** - Ao salvar, `fotos: []` apaga as fotos existentes

## Solução

Modificar o fluxo de edição para buscar os dados completos do imóvel antes de abrir o formulário.

---

## Arquivos a Modificar

### 1. `src/pages/Properties.tsx`

**Mudanças:**
- Adicionar estado para controlar qual imóvel está sendo carregado
- Usar o hook `useProperty(id)` para buscar dados completos ao editar
- Mostrar loading enquanto carrega os dados
- Só abrir o formulário quando os dados completos estiverem disponíveis

**Antes (problema):**
```typescript
const openEdit = (property: Property) => {
  setEditingProperty(property);
  setFormData({
    ...
    fotos: (property.fotos as string[]) || [], // fotos é undefined!
    ...
  });
  setDialogOpen(true);
};
```

**Depois (solução):**
```typescript
const [loadingPropertyId, setLoadingPropertyId] = useState<string | null>(null);

// Buscar dados completos quando houver loadingPropertyId
const { data: fullPropertyData } = useProperty(loadingPropertyId);

useEffect(() => {
  if (fullPropertyData && loadingPropertyId) {
    setEditingProperty(fullPropertyData);
    setFormData({
      ...
      fotos: (fullPropertyData.fotos as string[]) || [],
      ...
    });
    setDialogOpen(true);
    setLoadingPropertyId(null);
  }
}, [fullPropertyData, loadingPropertyId]);

const openEdit = (property: Property) => {
  setLoadingPropertyId(property.id);
};
```

---

## Fluxo Corrigido

```text
1. Usuário clica "Editar" no imóvel
   ↓
2. setLoadingPropertyId(property.id)
   ↓
3. Hook useProperty(id) busca dados completos (incluindo fotos)
   ↓
4. useEffect detecta dados carregados
   ↓
5. setFormData com fotos corretas
   ↓
6. Abre o dialog com todos os dados
```

---

## Benefícios

- **Fotos persistem** - Dados completos sempre carregados ao editar
- **Performance mantida** - Listagem continua otimizada (sem fotos)
- **UX melhorada** - Loading visual enquanto carrega dados
- **Código limpo** - Usa hooks existentes (useProperty)

---

## Arquivos Afetados

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/Properties.tsx` | Adicionar busca de dados completos ao editar |

