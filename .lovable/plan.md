
# Plano: Clonar Design do Site Eduardo Ferreira Broker

## O que você quer

Copiar exatamente o design do seu site WordPress **eduardoferreirabroker.com.br** para o sistema de sites integrado do VIMOB, incluindo:

- Cabeçalho com efeito vidro escuro (idêntico)
- Hero fullscreen com imagem configurável
- Mapa interativo com todos os imóveis
- Abas de tipo de imóvel (Apartamento, Casa, etc.)
- Filtros avançados na página de imóveis
- Footer idêntico com layout de 4 colunas

---

## Análise do Site de Referência

O site **eduardoferreirabroker.com.br** possui:

| Elemento | Descrição |
|----------|-----------|
| **Header** | Fundo preto com transparência/blur (glassmorphism), logo à esquerda, menu central, botão Contato com borda dourada |
| **Hero** | Imagem fullscreen (100vh), título centralizado, barra de busca com campos: pesquisa, tipo, finalidade |
| **Menu** | HOME, BUSCAR MAPA, IMÓVEIS, APARTAMENTO, CASA, ícone favoritos, CONTATO |
| **Cards** | Badge "Venda/Aluguel" dourado, ícone de favorito, informações: endereço, quartos, vagas, m², preço |
| **Mapa** | OpenStreetMap com markers dos imóveis por endereço |
| **Filtros** | Lateral esquerda: Quartos, Vagas, Finalidade, Tipo, Cidade, Bairro, Pets, Banheiros, Suítes, Mobília, M², Preço |
| **Footer** | Fundo preto, 4 colunas: Logo+descrição, Menu, Contatos, Social |

---

## O que precisa ser adicionado no Banco de Dados

Novos campos na tabela `organization_sites`:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `hero_image_url` | TEXT | Imagem do banner principal (Home) |
| `hero_title` | TEXT | Título do hero (ex: "Transformando seus sonhos em realidade!") |
| `hero_subtitle` | TEXT | Subtítulo do hero |
| `page_banner_url` | TEXT | Imagem de fundo do cabeçalho das páginas internas |

---

## Arquivos a serem modificados

### 1. Migração SQL (novo arquivo)
Adicionar os novos campos para imagens configuráveis.

### 2. PublicSiteLayout.tsx
- Header com glassmorphism escuro (bg-black/80 backdrop-blur-lg)
- Menu idêntico: HOME, BUSCAR MAPA, IMÓVEIS, abas por tipo, favoritos, CONTATO
- Posição fixa no topo
- Logo à esquerda, navegação central, CTA à direita

### 3. PublicHome.tsx
- Hero 100vh com imagem de fundo configurável
- Título/subtítulo configuráveis
- Barra de busca com 3 campos + botão dourado
- Seção "Descubra Imóveis que Definem o Conceito de Luxo"
- Grid de imóveis com cards iguais ao original
- Seção "Imóveis em destaque" (carrossel)
- Seção de categorias (Casas, Apartamentos, Coberturas, Studio)

### 4. PublicProperties.tsx
- Header com imagem de fundo + título do tipo selecionado
- Layout split: Filtros (esquerda) + Grid de imóveis + Mapa (direita)
- Filtros avançados conforme original
- Cards de imóvel com badge Venda/Aluguel dourado

### 5. Nova Página: PublicMap.tsx
- Mapa fullscreen com todos os imóveis
- Markers por endereço usando geocodificação
- Popup com preview do imóvel ao clicar

### 6. PublicContact.tsx
- Layout split: Informações + Formulário
- Mapa do escritório abaixo
- Seletor de assunto

### 7. SiteSettings.tsx
- Adicionar campos para upload das imagens do hero e banner
- Campos para título e subtítulo do hero

### 8. use-organization-site.ts
- Adicionar novos campos ao tipo OrganizationSite

---

## Seção Técnica Detalhada

### Migração SQL

```sql
ALTER TABLE public.organization_sites
ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
ADD COLUMN IF NOT EXISTS hero_title TEXT,
ADD COLUMN IF NOT EXISTS hero_subtitle TEXT,
ADD COLUMN IF NOT EXISTS page_banner_url TEXT;
```

### Novo Header (PublicSiteLayout)

```typescript
// Header com glassmorphism escuro
<header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/10">
  <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
    {/* Logo */}
    <Link to="/" className="flex items-center">
      {logo_url ? <img src={logo_url} className="h-10" /> : <span className="text-white font-serif text-xl">{site_title}</span>}
    </Link>
    
    {/* Navigation */}
    <nav className="hidden lg:flex items-center gap-6">
      <Link className="text-white/80 hover:text-white text-sm tracking-wide">HOME</Link>
      <Link className="text-white/80 hover:text-white text-sm tracking-wide">BUSCAR MAPA</Link>
      <Link className="text-white/80 hover:text-white text-sm tracking-wide">IMÓVEIS</Link>
      {propertyTypes.map(type => (
        <Link key={type} className="text-white/80 hover:text-[#C4A052] text-sm tracking-wide uppercase">{type}</Link>
      ))}
    </nav>
    
    {/* CTA */}
    <div className="flex items-center gap-4">
      <button className="text-white/80 hover:text-white"><Heart /></button>
      <Link className="border border-[#C4A052] text-[#C4A052] px-4 py-2 rounded text-sm tracking-widest hover:bg-[#C4A052] hover:text-white transition-all">
        CONTATO
      </Link>
    </div>
  </div>
</header>
```

### Novo Hero (PublicHome)

```typescript
// Hero Fullscreen
<section className="relative h-screen">
  <div 
    className="absolute inset-0 bg-cover bg-center"
    style={{ backgroundImage: `url(${siteConfig.hero_image_url || '/default-hero.jpg'})` }}
  >
    <div className="absolute inset-0 bg-black/40" />
  </div>
  
  <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-4">
    <h1 className="text-4xl md:text-5xl font-light mb-8">
      {siteConfig.hero_title || 'Transformando seus sonhos em realidade!'}
    </h1>
    
    {/* Search Bar */}
    <div className="bg-black/50 backdrop-blur-sm rounded-lg p-2 flex flex-wrap gap-2 max-w-4xl w-full">
      <Input placeholder="Digite condomínio, região, bairro ou cidade" className="flex-1 min-w-[200px] bg-white/10 border-white/20 text-white" />
      <Select><SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">Tipo de Imóvel</SelectTrigger></Select>
      <Select><SelectTrigger className="w-32 bg-white/10 border-white/20 text-white">Finalidade...</SelectTrigger></Select>
      <Button className="bg-[#C4A052] hover:bg-[#B39042] text-white">
        <Search className="w-4 h-4 mr-2" /> Buscar Imóveis
      </Button>
    </div>
  </div>
</section>
```

### Mapa com Leaflet (nova dependência)

```typescript
// Usar react-leaflet para mapa OpenStreetMap
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

<MapContainer center={[-23.5505, -46.6333]} zoom={12} className="h-full w-full">
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  {properties.map(property => (
    <Marker key={property.id} position={[property.lat, property.lng]}>
      <Popup>
        <PropertyCard property={property} compact />
      </Popup>
    </Marker>
  ))}
</MapContainer>
```

### Paleta de Cores do Site Original

| Elemento | Cor |
|----------|-----|
| Fundo header/footer | `#0D0D0D` (preto) |
| Cor de destaque | `#C4A052` (dourado) |
| Texto principal | `#FFFFFF` (branco) |
| Texto secundário | `rgba(255,255,255,0.7)` |
| Badge Venda/Aluguel | `#C4A052` com transparência |

---

## Nova Dependência Necessária

```bash
npm install react-leaflet leaflet
npm install -D @types/leaflet
```

---

## Resumo das Mudanças

| Arquivo | Ação |
|---------|------|
| Nova migração SQL | Adicionar campos hero_image_url, hero_title, hero_subtitle, page_banner_url |
| `src/integrations/supabase/types.ts` | Regenerar tipos |
| `src/hooks/use-organization-site.ts` | Atualizar interface OrganizationSite |
| `src/hooks/use-public-site.ts` | Atualizar interface PublicSiteConfig |
| `src/pages/public/PublicSiteLayout.tsx` | Refazer header com glassmorphism escuro |
| `src/pages/public/PublicHome.tsx` | Hero fullscreen + novo layout de cards |
| `src/pages/public/PublicProperties.tsx` | Split layout com mapa lateral |
| `src/pages/public/PublicMap.tsx` | Nova página de busca por mapa |
| `src/pages/public/PublicContact.tsx` | Novo layout com mapa |
| `src/pages/SiteSettings.tsx` | Adicionar uploads de imagens hero/banner |
| `package.json` | Adicionar react-leaflet, leaflet |

---

## Resultado Final

Após a implementação:

1. Você poderá configurar as imagens do hero e banner em **Configurações do Site**
2. O site terá o visual idêntico ao eduardoferreirabroker.com.br
3. Os imóveis aparecerão no mapa baseado nos endereços cadastrados
4. Filtros avançados funcionarão como no original
5. Menu com abas por tipo de imóvel funcionará dinamicamente
