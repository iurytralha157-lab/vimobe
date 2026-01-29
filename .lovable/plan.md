

# Plano: Ajustes no Site Público - Navegação, Filtros e UX

## Resumo dos Problemas Identificados

Baseado no feedback, identifiquei 7 pontos a corrigir:

| # | Problema | Localização |
|---|----------|-------------|
| 1 | Botão "CONTATO" está branco, deve usar cor primária | Header |
| 2 | Adicionar mapa de localização na página de contato | PublicContact |
| 3 | WhatsApp deve abrir popup de formulário antes de redirecionar | Rodapé + Contato |
| 4 | Navegação não atualiza filtros quando já está na página de imóveis | Header filterLinks |
| 5 | Item de menu ativo não destaca corretamente (Aluguel/Apartamentos) | Header |
| 6 | Campo de busca perde foco ao digitar (bug de re-render) | PublicProperties |
| 7 | Badges de filtro ativos estão apagados, precisam de cor destaque | PublicProperties |

---

## Soluções por Arquivo

### 1. `src/pages/public/PublicSiteLayout.tsx`

**Correção do botão CONTATO:**
- Mudar de `bg-white text-gray-800` para usar `primaryColor` como background

**Correção do highlight de menu:**
- Atualizar a função `isActive()` para detectar query params (tipo, finalidade)
- Quando URL tiver `?tipo=Apartamento`, destacar "APARTAMENTOS"
- Quando URL tiver `?finalidade=aluguel`, destacar "ALUGUEL"

**WhatsApp no rodapé com popup:**
- Envolver o link do WhatsApp no rodapé com `ContactFormDialog`

**Código atual do botão:**
```tsx
<Link 
  to={getHref("contato")}
  className="bg-white text-gray-800 px-6 py-2.5 rounded-full..."
>
  CONTATO
</Link>
```

**Novo código:**
```tsx
<Link 
  to={getHref("contato")}
  className="px-6 py-2.5 rounded-full text-sm font-light tracking-wide transition-colors"
  style={{ backgroundColor: primaryColor, color: 'white' }}
>
  CONTATO
</Link>
```

**Nova função isActive para filterLinks:**
```tsx
const isFilterActive = (href: string) => {
  const urlParams = new URLSearchParams(location.search);
  if (href.includes('tipo=Apartamento')) return urlParams.get('tipo') === 'Apartamento';
  if (href.includes('tipo=Casa')) return urlParams.get('tipo') === 'Casa';
  if (href.includes('finalidade=aluguel')) return urlParams.get('finalidade') === 'aluguel';
  return false;
};
```

---

### 2. `src/pages/public/PublicProperties.tsx`

**Correção do bug de digitação:**
- O problema é que os filtros são inicializados apenas uma vez via `useState`
- Quando a URL muda (clique no header), o estado não é atualizado
- Adicionar `useEffect` para sincronizar state com searchParams

**Antes:**
```tsx
const [filters, setFilters] = useState({
  search: searchParams.get('search') || '',
  tipo: searchParams.get('tipo') || '',
  // ...
});
```

**Depois:**
```tsx
const [filters, setFilters] = useState(() => ({
  search: searchParams.get('search') || '',
  tipo: searchParams.get('tipo') || '',
  // ...
}));

// Sincronizar com URL quando searchParams mudar externamente
useEffect(() => {
  setFilters({
    search: searchParams.get('search') || '',
    tipo: searchParams.get('tipo') || '',
    finalidade: searchParams.get('finalidade') || '',
    cidade: searchParams.get('cidade') || '',
    quartos: searchParams.get('quartos') || '',
    minPrice: searchParams.get('min_price') || '',
    maxPrice: searchParams.get('max_price') || '',
    banheiros: searchParams.get('banheiros') || '',
    vagas: searchParams.get('vagas') || '',
    page: parseInt(searchParams.get('page') || '1'),
  });
}, [location.search]); // Reagir a mudanças na URL
```

**Correção das badges de filtro:**
- Adicionar estilo com `primaryColor` ao invés de `variant="secondary"`

```tsx
{filters.finalidade && (
  <Badge 
    className="rounded-full px-3 py-1.5 gap-1 text-white border-0"
    style={{ backgroundColor: primaryColor }}
  >
    {filters.finalidade === 'venda' ? 'Venda' : 'Aluguel'}
    <X className="w-3 h-3 cursor-pointer hover:opacity-70" onClick={() => updateFilter('finalidade', '')} />
  </Badge>
)}
```

**Correção do input de busca (perda de foco):**
- O problema está no useEffect que atualiza URL a cada mudança de filtro
- Usar `useDebouncedValue` para o campo de busca apenas

```tsx
// Debounce apenas para o campo search
const debouncedSearch = useDebouncedValue(filters.search, 300);

// No useEffect, usar debouncedSearch ao invés de filters.search
useEffect(() => {
  const params = new URLSearchParams();
  if (debouncedSearch) params.set('search', debouncedSearch);
  // ... resto dos filtros
}, [debouncedSearch, filters.tipo, filters.finalidade, ...]);
```

---

### 3. `src/pages/public/PublicContact.tsx`

**Adicionar mapa de localização:**
- Usar Leaflet para exibir um mapa estático com a localização do endereço
- Posicionar abaixo do formulário de contato
- Usar geocodificação simples ou coordenadas padrão

```tsx
// Adicionar seção de mapa após o grid de contato
{siteConfig.address && (
  <section className="py-10 bg-white">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Nossa Localização</h3>
      <div className="h-[400px] rounded-2xl overflow-hidden shadow-lg">
        <MapContainer center={[-23.5505, -46.6333]} zoom={15} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[-23.5505, -46.6333]}>
            <Popup>{siteConfig.address}</Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  </section>
)}
```

**WhatsApp com popup:**
- Substituir link direto do WhatsApp por `ContactFormDialog`

---

## Resumo das Alterações

| Arquivo | Mudanças |
|---------|----------|
| `PublicSiteLayout.tsx` | Botão CONTATO laranja, isActive para filtros, WhatsApp footer com popup |
| `PublicProperties.tsx` | Sync URL → state, debounce no search, badges coloridas |
| `PublicContact.tsx` | Mapa de localização, WhatsApp com popup |

---

## Detalhes Técnicos

### Bug do Input de Busca
O problema ocorre porque:
1. Usuário digita no input
2. `updateFilter` atualiza o state
3. `useEffect` dispara e chama `setSearchParams`
4. React re-renderiza o componente
5. O input perde o foco

**Solução:** Usar debounce no campo de busca para atualizar a URL apenas após o usuário parar de digitar.

### Navegação do Header não Atualiza Filtros
O problema ocorre porque:
1. Os filtros são inicializados no `useState` apenas na montagem do componente
2. Quando o usuário clica em "Casas" no header, a URL muda mas o state não
3. O componente já está montado, então `useState` não re-executa

**Solução:** Adicionar `useEffect` que observa `location.search` e sincroniza o state com os searchParams.

### isActive para Links com Filtros
A função atual só verifica o pathname, não os query params. Precisamos:
1. Para links simples (HOME, MAPA): verificar pathname
2. Para filterLinks (APARTAMENTOS, CASAS, ALUGUEL): verificar query params específicos

