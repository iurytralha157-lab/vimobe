
# Aplicar Cores Dinamicas na Pagina de Detalhe do Imovel e Filtros

## Problema
A pagina de detalhe do imovel e os componentes internos (cards de preco, caracteristicas, detalhes, localizacao) estao com cores fixas (`bg-gray-50`, `bg-white`, `text-gray-900`, `text-gray-500`), ignorando as configuracoes de `card_color`, `background_color` e `text_color` do tema. O filtro lateral na pagina de listagem tambem tem labels com cores fixas.

## Arquivos a Modificar

### 1. `src/pages/public/PublicPropertyDetail.tsx`
- Substituir `bg-gray-50` do container principal (linhas 69, 80, 99) por `backgroundColor` dinamico do `siteConfig`
- Substituir `text-gray-900` e `text-gray-500` dos headings/textos por `textColor` dinamico
- Passar `cardColor` e `textColor` como props para PropertyFeatures, PropertyDetails, PropertyLocation e PropertyPricing
- Atualizar badges internas (codigo, tipo negocio) para usar cores dinamicas

### 2. `src/components/public/property-detail/PropertyPricing.tsx`
- Adicionar props `cardColor` e `textColor`
- Aplicar `cardColor` como background do Card (substituir branco padrao)
- Substituir `text-gray-900`, `text-gray-500`, `text-gray-600`, `text-gray-400` por `textColor` com opacidades variadas
- Substituir `border-gray-100` por borda dinamica

### 3. `src/components/public/property-detail/PropertyFeatures.tsx`
- Adicionar props `cardColor` e `textColor`
- Substituir `bg-gray-50` dos feature chips por variacao sutil usando `primaryColor`
- Substituir `text-gray-900` e `text-gray-500` por `textColor` com opacidades

### 4. `src/components/public/property-detail/PropertyDetails.tsx`
- Adicionar props `cardColor` e `textColor`
- Substituir `bg-white` dos containers por `cardColor`
- Substituir `text-gray-900`, `text-gray-600`, `text-gray-700` por `textColor`
- Substituir `bg-gray-50`, `bg-gray-100` dos chips e tabs por variacoes dinamicas

### 5. `src/components/public/property-detail/PropertyLocation.tsx`
- Adicionar props `cardColor` e `textColor`
- Substituir `bg-white` do container do mapa por `cardColor`
- Substituir `text-gray-900` do titulo e `text-gray-600` do endereco por `textColor`

### 6. `src/components/public/PropertyFiltersContent.tsx`
- Adicionar prop `textColor` opcional
- Substituir `text-gray-700` das labels por `textColor` dinamico (via style)

### 7. `src/pages/public/PublicProperties.tsx`
- Passar `textColor` do `siteConfig` para o `PropertyFiltersContent`

## Detalhes Tecnicos

Estrategia de cores para manter consistencia visual:
- Textos principais: `style={{ color: textColor }}`
- Textos secundarios: `style={{ color: textColor, opacity: 0.6 }}`
- Backgrounds de chips internos: usar `${primaryColor}10` ou `${primaryColor}15`
- Bordas: `style={{ borderColor: textColor + '15' }}`

Total: 7 arquivos modificados, sem alteracoes no banco de dados.
