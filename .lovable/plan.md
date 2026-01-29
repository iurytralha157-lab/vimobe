
# Ajustes no Site Público - Cabeçalho, Hero e Categorias

## Resumo do que você pediu

1. **Cabeçalho** - Largura fixa (~1400-1500px), não full-width, efeito vidro mais claro, sem borda, botão "Contato" preenchido com bordas arredondadas
2. **Barra de busca** - Efeito vidro mais claro (igual ao header), espaçamento entre título e campo
3. **Imóveis** - Puxar os imóveis cadastrados (já funciona via `status: 'ativo'`), mostrar seção "Descubra os imóveis" e "Imóveis em destaque"
4. **Categorias com efeito sanfona** - Cards de categorias (Casas, Apartamentos, etc.) com efeito hover que expande a imagem

---

## O que já está funcionando

- A edge function `public-site-data` já filtra imóveis com `status: 'ativo'`
- O campo `destaque: true` já marca imóveis em destaque
- A função `useFeaturedProperties` já busca imóveis em destaque

---

## Mudanças necessárias

### 1. PublicSiteLayout.tsx - Novo Header

**Antes:**
```tsx
<header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/10">
  <div className="max-w-7xl mx-auto px-4 ...">
```

**Depois:**
```tsx
<header className="fixed top-0 left-0 right-0 z-50">
  {/* Container centralizado com largura máxima */}
  <div className="max-w-[1400px] mx-auto px-4 mt-4">
    <div className="bg-white/20 backdrop-blur-xl rounded-2xl px-6">
      <div className="flex justify-between items-center h-16">
        {/* Logo */}
        ...
        {/* Navigation */}
        ...
        {/* CTA - Botão Contato preenchido */}
        <Link className="bg-white text-gray-800 px-6 py-2.5 rounded-full text-sm font-medium">
          CONTATO
        </Link>
      </div>
    </div>
  </div>
</header>
```

**Características:**
- Container com `max-w-[1400px]` centralizado
- Fundo mais claro: `bg-white/20` (em vez de `bg-black/80`)
- Blur mais intenso: `backdrop-blur-xl`
- Sem borda: removido `border-b border-white/10`
- Bordas arredondadas: `rounded-2xl`
- Margem do topo: `mt-4` para flutuar
- Botão Contato: `bg-white text-gray-800 rounded-full`

---

### 2. PublicHome.tsx - Barra de Busca Mais Clara

**Antes:**
```tsx
<form className="bg-black/60 backdrop-blur-md rounded-lg p-3 ...">
```

**Depois:**
```tsx
<form className="bg-white/20 backdrop-blur-xl rounded-2xl p-4 ...">
```

**Características:**
- Mesmo estilo do header: `bg-white/20 backdrop-blur-xl`
- Bordas mais arredondadas: `rounded-2xl`
- Espaçamento maior entre título e barra: `mb-16` (em vez de `mb-12`)

---

### 3. PublicHome.tsx - Mostrar Imóveis Cadastrados

A seção de imóveis em destaque já existe no código, mas só aparece se `featuredProperties.length > 0`. O problema pode ser:

1. Nenhum imóvel está marcado como `destaque: true`
2. Nenhum imóvel está com `status: 'ativo'`

**Solução:**
- Criar uma nova seção que mostra TODOS os imóveis ativos (não apenas destaque)
- Manter a seção de destaque separadamente

```tsx
{/* Imóveis em Destaque */}
{featuredProperties.length > 0 && (
  <section className="py-20 bg-[#0D0D0D]">
    <h2>Imóveis em Destaque</h2>
    {/* Grid de destaque */}
  </section>
)}

{/* Todos os Imóveis - Nova seção */}
<section className="py-20 bg-white">
  <h2>Descubra Imóveis que Definem o Conceito de Luxo</h2>
  {/* Grid de todos os imóveis ativos */}
</section>
```

Vamos usar um novo hook para buscar todos os imóveis ativos:
```tsx
const { data: allProperties = [] } = usePublicProperties(organizationId, { limit: 6 });
```

---

### 4. PublicHome.tsx - Seção de Categorias com Efeito Sanfona

Esta é a parte mais interessante. Baseado na imagem que você enviou:

```text
┌──────────────────────────────────────────────────────────────┐
│  ┌────────┐┌──────────────────────┐┌────────┐┌────────┐     │
│  │ CASAS  ││    APARTAMENTOS      ││COBERTURAS││STUDIOS │    │
│  │        ││   (expandido hover)  ││        ││        │     │
│  │  25%   ││        40%           ││  17.5% ││  17.5% │     │
│  └────────┘└──────────────────────┘└────────┘└────────┘     │
└──────────────────────────────────────────────────────────────┘
```

**Implementação:**
```tsx
const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);

const categories = [
  { name: 'CASAS', image: '/images/category-casa.jpg' },
  { name: 'APARTAMENTOS', image: '/images/category-apartamento.jpg' },
  { name: 'COBERTURAS', image: '/images/category-cobertura.jpg' },
  { name: 'STUDIOS', image: '/images/category-studio.jpg' },
];

<section className="py-20 bg-[#0D0D0D]">
  <div className="h-[500px] flex">
    {categories.map((cat, idx) => (
      <div
        key={cat.name}
        onMouseEnter={() => setHoveredCategory(idx)}
        onMouseLeave={() => setHoveredCategory(null)}
        className={cn(
          "relative h-full overflow-hidden transition-all duration-500 ease-out",
          hoveredCategory === idx ? "flex-[2]" : "flex-1"
        )}
      >
        <img
          src={cat.image}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500"
          style={{ transform: hoveredCategory === idx ? 'scale(1.1)' : 'scale(1)' }}
        />
        <div className="absolute inset-0 bg-black/40" />
        <span className="absolute left-4 top-1/2 bg-white text-gray-900 px-4 py-2 text-sm font-medium">
          {cat.name}
        </span>
      </div>
    ))}
  </div>
</section>
```

**Comportamento:**
- Por padrão: todos os 4 cards têm tamanho igual (`flex-1`)
- Ao hover: o card expandido fica maior (`flex-[2]`)
- A imagem dentro faz zoom (`scale(1.1)`)
- Transição suave: `transition-all duration-500`

---

## Arquivos a serem modificados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/public/PublicSiteLayout.tsx` | Header com largura fixa, vidro claro, botão preenchido |
| `src/pages/public/PublicHome.tsx` | Barra de busca clara, seção de todos os imóveis, efeito sanfona nas categorias |

---

## Seção Técnica

### CSS do Header Glassmorphism Claro

```tsx
// Container externo (apenas posicionamento)
<header className="fixed top-0 left-0 right-0 z-50">
  {/* Container com largura fixa e margem do topo */}
  <div className="max-w-[1400px] mx-auto px-4 pt-4">
    {/* Barra com efeito vidro claro */}
    <div className="bg-white/20 backdrop-blur-xl rounded-2xl px-6 shadow-lg">
```

### Botão Contato Preenchido

```tsx
<Link 
  to={getHref("contato")}
  className="bg-white text-gray-800 px-6 py-2.5 rounded-full text-sm font-medium tracking-wide hover:bg-white/90 transition-colors"
>
  CONTATO
</Link>
```

### Efeito Sanfona com Flexbox

```tsx
// Estado para controlar qual card está expandido
const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);

// Classes dinâmicas
className={cn(
  "relative h-full overflow-hidden transition-all duration-500 ease-out cursor-pointer",
  hoveredCategory === null 
    ? "flex-1"  // Todos iguais quando nenhum hover
    : hoveredCategory === idx 
      ? "flex-[2]"  // Expandido
      : "flex-[0.8]"  // Encolhido
)}
```

### Buscar Todos os Imóveis

```tsx
// No PublicHome.tsx
import { usePublicProperties, useFeaturedProperties } from "@/hooks/use-public-site";

const { data: featuredProperties = [] } = useFeaturedProperties(organizationId);
const { data: allPropertiesData } = usePublicProperties(organizationId, { limit: 6 });
const allProperties = allPropertiesData?.properties || [];
```

---

## Resultado Visual Esperado

**Header:**
- Flutua sobre o hero com fundo vidro claro/acinzentado
- Largura fixa de ~1400px
- Bordas arredondadas
- Sem linha de borda inferior
- Botão Contato branco com texto escuro e bordas arredondadas

**Barra de Busca:**
- Mesmo efeito vidro claro do header
- Espaçamento maior do título

**Seção de Imóveis:**
- Mostra todos os imóveis ativos cadastrados
- Seção separada para destaque (se houver)

**Categorias:**
- 4 cards lado a lado com imagens de fundo
- Hover expande o card e dá zoom na imagem
- Transição suave tipo sanfona
