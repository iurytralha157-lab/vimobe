

# Plano: Correções de UI Mobile no Dashboard

## Problemas Identificados

Analisando as imagens e o código, identifiquei 4 problemas:

| Problema | Local | Causa |
|----------|-------|-------|
| 1. Filtros mal distribuídos | Dashboard mobile | Layout `flex-wrap` sem organização no mobile |
| 2. Header "andando" | Todas as páginas | Header não tem `sticky`, rola com a página |
| 3. Logo bugada no menu lateral | MobileSidebar | Botão X do Sheet sobrepõe a logo (position absolute) |
| 4. Evolução de Negócios sumiu | Dashboard mobile | Gráfico está nas Tabs mas não está sendo renderizado corretamente |

---

## Solução Detalhada

### 1. Filtros do Dashboard Mobile

**Problema:** Os filtros ficam "jogados" no mobile, sem organização visual.

**Solução:** Criar um botão "Filtros" que abre um Sheet/Popover com todos os filtros organizados verticalmente.

**Antes:**
```text
[Últimos 30 dias] [Todas equipes ▼]
      [Todos ▼] [Todas origens ▼]
```

**Depois:**
```text
Desktop: [Últimos 30 dias] [Todas equipes ▼] [Todos ▼] [Todas origens ▼]

Mobile: [Últimos 30 dias] [⚙️ Filtros]
                              ↓ (abre popover)
                    ┌─────────────────────┐
                    │ Equipe: [Todas ▼]   │
                    │ Corretor: [Todos ▼] │
                    │ Origem: [Todas ▼]   │
                    │ [Limpar filtros]    │
                    └─────────────────────┘
```

### 2. Header Fixo

**Problema:** O header rola junto com a página, causando sensação de "página se mexendo".

**Solução:** Adicionar `sticky top-0 z-40 bg-background` no header.

**Arquivo:** `src/components/layout/AppHeader.tsx`

**Mudança:**
```typescript
// De:
<header className="h-12 flex items-center px-2 lg:px-6 mx-3 mt-3">

// Para:
<header className="sticky top-0 z-40 h-12 flex items-center px-2 lg:px-6 mx-3 pt-3 bg-background">
```

### 3. Logo do Menu Lateral

**Problema:** O botão X (fechar) do Sheet está em `absolute right-4 top-4`, sobrepondo a área da logo.

**Solução:** Ajustar o padding-top do header da logo no MobileSidebar e posicionar o X de forma que não sobreponha.

**Arquivo:** `src/components/layout/MobileSidebar.tsx`

**Mudança:** Adicionar padding-right na área da logo para evitar conflito com o X.

### 4. Gráfico de Evolução no Mobile

**Problema:** O gráfico "Evolução de Negócios" não aparece no mobile mesmo quando a tab "Evolução" está selecionada.

**Análise do código:** O Dashboard tem tabs para mobile:
- Tab "Funil" → `{funnelComponent}`  
- Tab "Evolução" → `{DealsEvolutionChart}`

Olhando a imagem IMG_4372.png, vejo que a tab "Evolução" está selecionada mas mostra "Evolução de Negócios" com espaço vazio abaixo. Isso indica que o gráfico está renderizando mas sem dados visíveis (ou com altura insuficiente).

**Solução:** Garantir altura mínima fixa no gráfico para mobile.

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/dashboard/DashboardFilters.tsx` | Adicionar versão colapsada para mobile |
| `src/components/layout/AppHeader.tsx` | Tornar header sticky |
| `src/components/layout/MobileSidebar.tsx` | Ajustar padding para evitar sobreposição do X |
| `src/components/dashboard/DealsEvolutionChart.tsx` | Garantir altura mínima no mobile |

---

## Detalhes Técnicos

### DashboardFilters - Nova Estrutura Mobile

```typescript
// Detectar mobile
const isMobile = useIsMobile();

// Mobile: botão que abre popover
// Desktop: filtros inline como hoje

{isMobile ? (
  <div className="flex items-center gap-2">
    <DateFilterPopover ... />
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
          Filtros
          {hasActiveFilters && <Badge className="ml-1">•</Badge>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4">
        {/* Filtros empilhados verticalmente */}
        <div className="space-y-3">
          {/* Team */}
          {/* User */}
          {/* Source */}
          {/* Clear button */}
        </div>
      </PopoverContent>
    </Popover>
  </div>
) : (
  // Desktop - layout atual
)}
```

### AppHeader - Sticky

```typescript
<header className="sticky top-0 z-40 h-12 flex items-center px-2 lg:px-6 mx-3 pt-3 bg-background">
```

### MobileSidebar - Ajuste da Logo

```typescript
// Adicionar pr-8 (padding-right) no container da logo para evitar conflito com o X
<div className="p-4 pr-10 border-b border-border">
```

### DealsEvolutionChart - Altura Mobile

```typescript
// Garantir altura mínima no container do gráfico
<div className="flex-1 min-h-[200px] h-[200px] sm:h-auto">
```

---

## Resultado Esperado

1. **Filtros organizados:** No mobile, apenas o filtro de data aparece junto com um botão "Filtros" que abre os demais
2. **Header fixo:** O cabeçalho fica sempre visível no topo durante o scroll
3. **Menu lateral limpo:** A logo não é mais sobreposta pelo botão X
4. **Gráfico visível:** O gráfico de evolução aparece com altura adequada no mobile

