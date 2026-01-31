
# Plano: Correções Mobile para o Site Público

## Problemas Identificados

Baseado nas screenshots e na análise do código, esses são os 6 problemas a corrigir:

| # | Problema | Arquivo |
|---|----------|---------|
| 1 | Logo no header mobile precisa de controle separado | `PublicSiteLayout.tsx` |
| 2 | Filtros mobile (Sheet) não permite scroll | `PublicProperties.tsx` |
| 3 | Rodapé mobile - conteúdo desalinhado e muito espaçamento | `PublicSiteLayout.tsx` |
| 4 | Características empilhadas verticalmente no mobile | `PropertyFeatures.tsx` |
| 5 | Seção "Nosso Portfólio" com espaçamento excessivo | `PublicHome.tsx` |
| 6 | Seção sanfona (categorias) bugada no mobile | `PublicHome.tsx` |

---

## Soluções Técnicas

### 1. Controle de Logo para Mobile

**Problema**: A logo usa as mesmas dimensões no desktop e mobile, ficando muito grande no header flutuante.

**Solução**: Criar limites específicos para mobile no header e menu lateral.

```tsx
// No header mobile - limitar proporcionalmente
<img 
  src={siteConfig.logo_url} 
  style={{ 
    maxWidth: Math.min(siteConfig.logo_width || 160, 140), // Limite mobile: 140px
    maxHeight: Math.min(siteConfig.logo_height || 50, 40)  // Limite mobile: 40px
  }}
/>
```

---

### 2. Filtros Mobile - Corrigir Scroll

**Problema**: O `SheetContent` atual não permite scroll interno, travando a navegação.

**Solução**: Adicionar classes de overflow corretas no container interno.

```tsx
// De:
<SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
  <div className="mt-6 pb-20 overflow-auto">

// Para:
<SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col">
  <div className="flex-1 mt-6 pb-20 overflow-y-auto overscroll-contain">
```

A chave é usar `overscroll-contain` para evitar que o scroll "escape" para o body.

---

### 3. Rodapé Mobile - Centralizar e Reduzir Espaçamento

**Problema**: Conteúdo alinhado à esquerda com muito espaço entre seções no mobile.

**Solução**: Centralizar texto no mobile e reduzir paddings.

```tsx
// Footer container
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10">
    
    {/* Brand - centralizar no mobile */}
    <div className="text-center md:text-left">
      <div className="flex justify-center md:justify-start">
        <img ... />
      </div>
      ...
    </div>

    {/* Menu e Contato em 2 colunas no mobile */}
    <div className="grid grid-cols-2 md:contents gap-4">
      {/* Menu */}
      <div className="text-center md:text-left">...</div>
      {/* Contato */}
      <div className="text-center md:text-left">...</div>
    </div>

    {/* Redes sociais - centralizar */}
    <div className="text-center md:text-left">
      <div className="flex gap-3 justify-center md:justify-start">...</div>
    </div>
  </div>
</div>
```

---

### 4. Características - Grid Lado a Lado no Mobile

**Problema**: Cada característica ocupa uma linha inteira, ficando vertical.

**Solução**: Usar grid de 2 colunas no mobile.

```tsx
// De:
<div className="flex flex-wrap gap-3">

// Para:
<div className="grid grid-cols-2 md:flex md:flex-wrap gap-3">
  {features.map((feature, index) => (
    <div 
      key={index} 
      className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-xl"
    >
      {/* Ícone menor no mobile */}
      <div 
        className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${primaryColor}15` }}
      >
        <Icon className="w-4 h-4 md:w-5 md:h-5" style={{ color: primaryColor }} />
      </div>
      <span className="text-sm md:text-base text-gray-900">
        <span className="font-bold">{feature.value}</span>{' '}
        <span className="font-normal text-gray-500">{feature.label}</span>
      </span>
    </div>
  ))}
</div>
```

---

### 5. Seção "Nosso Portfólio" - Reduzir Espaçamento

**Problema**: Muito espaço vertical entre o header da seção e os cards.

**Solução**: Reduzir margin-bottom do título no mobile.

```tsx
// De:
<div className="text-center mb-12">

// Para:
<div className="text-center mb-6 md:mb-12">
```

---

### 6. Seção Sanfona (Categorias) - Grid 2x2 no Mobile

**Problema**: As 4 categorias aparecem lado a lado no mobile, ficando muito apertadas.

**Solução**: Trocar para grid 2x2 no mobile.

```tsx
// De:
<div className="h-[400px] md:h-[500px] flex overflow-hidden">
  {categories.map((cat, idx) => (
    <Link className="relative h-full overflow-hidden transition-all flex-1" />
  ))}
</div>

// Para:
<div className="grid grid-cols-2 md:flex md:h-[500px] overflow-hidden">
  {categories.map((cat, idx) => (
    <Link
      className={cn(
        "relative h-[200px] md:h-full overflow-hidden transition-all duration-500",
        // Desktop: comportamento sanfona
        "md:flex-1",
        hoveredCategory !== null && hoveredCategory === idx && "md:flex-[2]",
        hoveredCategory !== null && hoveredCategory !== idx && "md:flex-[0.6]"
      )}
    >
      {/* Imagem */}
      <img ... />
      
      {/* Label - posição diferente no mobile */}
      <div className="absolute inset-x-0 bottom-0 md:inset-auto md:left-0 md:top-1/2 md:-translate-y-1/2">
        <span className="bg-white text-gray-900 px-4 py-2 text-xs md:text-sm font-semibold">
          {cat.name}
        </span>
      </div>
    </Link>
  ))}
</div>
```

No mobile:
- Grid 2x2 (2 colunas, 2 linhas)
- Altura fixa de 200px cada
- Label na parte inferior central
- Sem efeito hover

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `PublicSiteLayout.tsx` | Logo mobile, rodapé centralizado |
| `PublicProperties.tsx` | Scroll nos filtros mobile |
| `PropertyFeatures.tsx` | Grid 2 colunas no mobile |
| `PublicHome.tsx` | Espaçamento portfólio + grid categorias 2x2 |

---

## Resultado Visual Mobile

**Header**: Logo proporcional ao espaço disponível

**Filtros**: Sheet permite arrastar/scroll normalmente

**Características**: 2 colunas lado a lado (ex: "300 m²" | "4 Quartos")

**Portfólio**: Menos espaço entre título e cards

**Categorias**: Grid 2x2 com labels legíveis

**Rodapé**: Conteúdo centralizado, mais compacto
