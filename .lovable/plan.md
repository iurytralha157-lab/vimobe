
# Aplicar Cores Dinamicas na Pagina de Detalhe do Imovel e Filtros

## Problema
A pagina de detalhe do imovel (`/imovel/:code`) e os componentes internos (cards de preco, caracteristicas, detalhes, localizacao) estao com cores fixas (`bg-gray-50`, `bg-white`, `text-gray-900`, `text-gray-500`), ignorando completamente as configuracoes de `card_color`, `background_color` e `text_color` do tema. O filtro lateral na pagina de listagem tambem tem labels com cores fixas.

## Arquivos a Modificar

### 1. `src/pages/public/PublicPropertyDetail.tsx`
- Substituir `bg-gray-50` do container principal por `siteConfig.background_color` dinamico (com fallback baseado no tema)
- Passar `cardColor` e `textColor` para todos os sub-componentes (PropertyPricing, PropertyFeatures, PropertyDetails, PropertyLocation)
- Ajustar cores de texto dos headings e paragrafos dentro dos cards para usar `textColor`

### 2. `src/components/public/property-detail/PropertyPricing.tsx`
- Adicionar props `cardColor` e `textColor`
- Aplicar `cardColor` como background do Card
- Substituir `text-gray-900`, `text-gray-500`, `text-gray-600` por `textColor` com opacidades dinamicas

### 3. `src/components/public/property-detail/PropertyFeatures.tsx`
- Adicionar props `cardColor` e `textColor`
- Substituir `bg-gray-50` dos feature chips por uma variacao sutil do `cardColor`
- Substituir `text-gray-900` e `text-gray-500` por `textColor`

### 4. `src/components/public/property-detail/PropertyDetails.tsx`
- Adicionar props `cardColor` e `textColor`
- Substituir `bg-white` dos containers por `cardColor`
- Substituir `text-gray-900`, `text-gray-600`, `text-gray-700` por `textColor`
- Substituir `bg-gray-50` e `bg-gray-100` dos chips por variacao do `cardColor`

### 5. `src/components/public/property-detail/PropertyLocation.tsx`
- Adicionar props `cardColor` e `textColor`
- Substituir `bg-white` do container do mapa por `cardColor`
- Substituir `text-gray-900` do titulo por `textColor`

### 6. `src/components/public/PropertyFiltersContent.tsx`
- Adicionar prop `textColor` opcional
- Substituir `text-gray-700` das labels por `textColor` dinamico

### 7. `src/pages/public/PublicProperties.tsx`
- Passar `textColor` para o `PropertyFiltersContent`

## Detalhes Tecnicos

Para manter consistencia visual dentro dos cards (que podem ter fundo claro ou escuro), a estrategia sera:
- Textos principais: `style={{ color: textColor }}`
- Textos secundarios: `style={{ color: textColor, opacity: 0.6 }}`
- Backgrounds de chips/badges internos: usar `${primaryColor}10` ou opacidade sobre o textColor
- Bordas: `style={{ borderColor: ${textColor}15 }}` para adaptar ao tema

Total: **7 arquivos** modificados, sem alteracoes no banco de dados.
