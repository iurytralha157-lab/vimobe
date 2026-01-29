
# Plano: Ajustes Visuais das Páginas Internas do Site Público

## Problema Identificado
1. As páginas internas (Imóveis, Apartamentos, Casas, Aluguel, Mapa, Contato) não estão usando o banner configurável (`page_banner_url`)
2. Os títulos não estão centralizados
3. Texto "0 imóveis encontrados" aparece desnecessariamente
4. Títulos devem ser dinâmicos baseados no filtro ativo
5. Página de Contato tem elementos desnecessários (badge "Contato" e subtexto)
6. Página do Mapa está em branco - problema com o CSS do Leaflet não carregando

---

## Alterações por Arquivo

### 1. `src/pages/public/PublicProperties.tsx`
**Mudanças:**
- Adicionar banner de imagem do `siteConfig.page_banner_url` como background
- Centralizar o título
- Remover a contagem de imóveis do header ("X imóveis encontrados")
- Título dinâmico baseado nos filtros:
  - Se `tipo=Apartamento` → "Apartamentos"
  - Se `tipo=Casa` → "Casas"
  - Se `finalidade=aluguel` → "Aluguel"
  - Padrão → "Imóveis Disponíveis"

**Antes:**
```tsx
<h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3">Imóveis Disponíveis</h1>
<p className="text-white/70 text-lg">
  {isLoading ? 'Carregando...' : `${data?.total || 0} imóveis encontrados`}
</p>
```

**Depois:**
```tsx
<div 
  className="py-16 md:py-20 relative overflow-hidden"
  style={{
    backgroundImage: siteConfig.page_banner_url 
      ? `url(${siteConfig.page_banner_url})` 
      : undefined,
    backgroundColor: !siteConfig.page_banner_url ? secondaryColor : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }}
>
  <div className="absolute inset-0 bg-black/60" />
  <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white pt-16 text-center">
    <h1 className="text-3xl md:text-4xl lg:text-5xl font-light">
      {getPageTitle()}
    </h1>
  </div>
</div>
```

Função para título dinâmico:
```tsx
const getPageTitle = () => {
  if (filters.tipo === 'Apartamento') return 'Apartamentos';
  if (filters.tipo === 'Casa') return 'Casas';
  if (filters.finalidade === 'aluguel') return 'Aluguel';
  return 'Imóveis Disponíveis';
};
```

---

### 2. `src/pages/public/PublicContact.tsx`
**Mudanças:**
- Adicionar banner de imagem do `siteConfig.page_banner_url`
- Remover badge "Contato" em laranja
- Remover subtexto descritivo
- Centralizar título "Entre em Contato"
- Usar fonte leve (font-light) para consistência

**Antes:**
```tsx
<span className="inline-block px-4 py-1.5 rounded-full...">Contato</span>
<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">Entre em Contato</h1>
<p className="text-white/70...">Estamos prontos para ajudá-lo...</p>
```

**Depois:**
```tsx
<div 
  className="py-16 md:py-20 relative overflow-hidden"
  style={{
    backgroundImage: siteConfig.page_banner_url 
      ? `url(${siteConfig.page_banner_url})` 
      : undefined,
    backgroundColor: !siteConfig.page_banner_url ? siteConfig.secondary_color : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }}
>
  <div className="absolute inset-0 bg-black/60" />
  <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white pt-16 text-center">
    <h1 className="text-3xl md:text-4xl lg:text-5xl font-light">Entre em Contato</h1>
  </div>
</div>
```

---

### 3. `src/pages/public/PublicMap.tsx`
**Mudanças:**
- Corrigir problema de tela branca - importar CSS do Leaflet de forma mais confiável
- Adicionar fallback se o mapa não carregar
- Remover subtexto e centralizar título
- Usar fonte consistente (font-light)

**Correção do CSS:**
O problema pode estar relacionado ao import do CSS do Leaflet. Vamos garantir que o CSS seja carregado adicionando um fallback e verificando se o container tem altura definida antes de renderizar.

```tsx
// Importar CSS inline como fallback
useEffect(() => {
  // Ensure Leaflet CSS is loaded
  const linkId = 'leaflet-css';
  if (!document.getElementById(linkId)) {
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }
}, []);
```

---

### 4. `src/pages/public/PublicAbout.tsx`
**Mudanças:**
- Verificar se já usa o banner e centralização
- Garantir consistência visual

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `PublicProperties.tsx` | Banner + título dinâmico + centralizado |
| `PublicContact.tsx` | Banner + remover badge/subtexto + centralizado |
| `PublicMap.tsx` | Corrigir CSS do Leaflet + título centralizado |
| `PublicAbout.tsx` | Verificar consistência |

---

## Padrão Visual Unificado para Páginas Internas

Todas as páginas internas terão este header consistente:

```tsx
<div 
  className="py-16 md:py-20 relative overflow-hidden"
  style={{
    backgroundImage: siteConfig.page_banner_url 
      ? `url(${siteConfig.page_banner_url})` 
      : undefined,
    backgroundColor: !siteConfig.page_banner_url ? secondaryColor : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }}
>
  <div className="absolute inset-0 bg-black/60" />
  <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white pt-16 text-center">
    <h1 className="text-3xl md:text-4xl font-light">{titulo}</h1>
  </div>
</div>
```

---

## Detalhes Técnicos

### Página do Mapa - Problema de Tela Branca
O componente `MapContainer` do react-leaflet requer:
1. CSS do Leaflet carregado
2. Container com altura definida
3. Contexto válido com `siteConfig`

A correção inclui:
- Carregar CSS via link dinâmico no head
- Adicionar estado de loading enquanto CSS carrega
- Verificar se `data?.properties` existe antes de renderizar markers
