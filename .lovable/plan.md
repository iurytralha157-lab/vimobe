
# Plano: Corrigir Bug de Perda de Foco no Campo de Busca

## Problema Identificado

O campo de busca perde o foco a cada caractere digitado. A causa raiz é que o componente `FiltersContent` está definido como uma **função inline** dentro do componente `PublicProperties` (linha 166).

Isso significa que:
1. Usuário digita uma letra
2. O estado `localSearch` é atualizado
3. O componente `PublicProperties` re-renderiza
4. A função `FiltersContent` é **recriada** (nova referência)
5. React trata como um componente completamente novo e desmonta/remonta o input
6. O input perde o foco

## Solução

Extrair o `FiltersContent` para um **componente separado fora** do `PublicProperties`, passando as props necessárias. Isso garante que o componente não seja recriado a cada re-render.

## Implementação

### Arquivo: `src/pages/public/PublicProperties.tsx`

1. **Criar componente `FiltersContent` fora do `PublicProperties`** (antes da função principal):
   - Mover a definição de `FiltersContent` para fora do componente
   - Criar interface de props com todos os valores/funções necessários:
     - `localSearch`, `setLocalSearch`, `searchInputRef`
     - `filters`, `updateFilter`
     - `cities`, `propertyTypes`
     - `showMoreFilters`, `setShowMoreFilters`
     - `clearFilters`, `hasActiveFilters`
     - `onClose`

2. **Atualizar as chamadas para usar o novo componente**, passando as props necessárias

3. **Usar `React.memo`** para memoizar o componente e evitar re-renders desnecessários quando as props não mudarem

## Detalhes Técnicos

```text
ANTES (Problema):
+-----------------------------------+
| PublicProperties                  |
|  +-----------------------------+  |
|  | FiltersContent (inline)     |  | <- Recriado a cada re-render
|  |   <input ref={...} />       |  |
|  +-----------------------------+  |
+-----------------------------------+

DEPOIS (Solução):
+-----------------------------------+
| FiltersContent (React.memo)       | <- Componente estável fora
|   <input ref={...} />             |
+-----------------------------------+
| PublicProperties                  |
|   <FiltersContent {...props} />   | <- Apenas recebe props
+-----------------------------------+
```

### Mudanças de Código

O componente `FiltersContent` receberá as seguintes props:

- `localSearch: string`
- `setLocalSearch: (value: string) => void`
- `searchInputRef: React.RefObject<HTMLInputElement>`
- `filters: FilterState`
- `updateFilter: (key: string, value: string) => void`
- `clearFilters: () => void`
- `hasActiveFilters: boolean`
- `cities: string[]`
- `propertyTypes: string[]`
- `showMoreFilters: boolean`
- `setShowMoreFilters: (value: boolean) => void`
- `onClose?: () => void`

Com essa estrutura, o input de busca manterá sua referência estável e não perderá o foco durante a digitação.
