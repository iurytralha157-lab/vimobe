
# Plano: Página de Detalhes do Imóvel (Estilo Portal Imobiliário)

## Objetivo
Criar uma página de detalhes de imóvel profissional e completa, inspirada nos portais Nexo Imóveis e ImovelWeb, com URL amigável para SEO usando o código do imóvel.

---

## Estrutura de URLs

### Novo Formato de Rota
- **Padrão:** `/imovel/[CODIGO]` 
- **Exemplos:**
  - `/imovel/AP0001` (apartamento)
  - `/imovel/CA0023` (casa)
  - `/imovel/CB0005` (cobertura)

### Rotas em Preview
- `/site/preview/imovel/AP0001?org=ID_ORGANIZACAO`

A rota `/imoveis/:code` existente será mantida como redirect para a nova `/imovel/:code` para compatibilidade.

---

## Layout da Nova Página

### Seção 1: Galeria de Fotos (Hero)
- **Carrossel principal** ocupando largura total (inspirado no Nexo Imóveis)
- Grid de miniaturas clicáveis abaixo
- Contador de fotos ("1 / 12")
- Botão "Ver todas as fotos" que abre lightbox fullscreen
- Navegação por setas e teclado
- Suporte a vídeo do imóvel (se disponível)

### Seção 2: Informações Principais
Layout em 2 colunas (desktop) / 1 coluna (mobile):

**Coluna Principal (2/3):**
- **Header:**
  - Tags: Tipo de imóvel + Código
  - Título do imóvel
  - Endereço completo com ícone de mapa
  
- **Características em Grid (ícones grandes):**
  - Área total/útil (m²)
  - Quartos
  - Suítes  
  - Banheiros
  - Vagas de garagem
  - Andar (se apartamento)
  
- **Descrição completa** (texto expansível)

- **Detalhes do Imóvel** (tabs ou accordion):
  - Características internas (detalhes_extras)
  - Proximidades (proximidades)
  - Informações adicionais (ano construção, mobília, pet allowed)

- **Mapa de Localização** (se latitude/longitude disponíveis)
  - Mapa Leaflet com marcador do imóvel
  - Endereço abaixo do mapa

### Seção 3: Sidebar Fixa (1/3)
Card sticky com:
- **Preços:**
  - Valor de venda (destaque principal)
  - Valor de aluguel (se aplicável)
  - Custos extras: Condomínio, IPTU, Seguro incêndio, Taxa de serviço
  
- **Botões de Ação:**
  - "Chamar no WhatsApp" (verde, destaque)
  - "Ligar" (outline)
  
- **Formulário de Contato Rápido:**
  - Usando ContactFormDialog existente
  - "Tenho interesse neste imóvel"

### Seção 4: Imóveis Relacionados
- Grid de 3-4 cards de imóveis semelhantes
- Filtrados por: mesmo tipo ou mesma região

---

## Componentes a Criar/Modificar

### Novos Componentes
1. **`PropertyGallery.tsx`** - Galeria de fotos estilo portal
2. **`PropertyFeatures.tsx`** - Grid de características com ícones
3. **`PropertyDetails.tsx`** - Tabs com detalhes extras
4. **`PropertyLocation.tsx`** - Mapa de localização
5. **`PropertyPricing.tsx`** - Card de preços e custos
6. **`RelatedProperties.tsx`** - Imóveis relacionados

### Arquivos a Modificar
1. **`PublicPropertyDetail.tsx`** - Reescrever completamente
2. **`PreviewSiteWrapper.tsx`** - Adicionar nova rota `/imovel/:code`
3. **`PublicSiteLayout.tsx`** - Links para detalhes usarem nova rota
4. **`public-site-data/index.ts`** - Endpoint para imóveis relacionados

---

## Detalhes Técnicos

### Estrutura de Dados do Imóvel
Campos disponíveis na tabela `properties`:
```
- code, title, descricao
- tipo_de_imovel, tipo_de_negocio, status
- preco, condominio, iptu, seguro_incendio, taxa_de_servico
- quartos, suites, banheiros, vagas, andar
- area_util, area_total, ano_construcao
- mobilia, regra_pet
- endereco, numero, complemento, bairro, cidade, uf, cep
- latitude, longitude
- imagem_principal, fotos, video_imovel
- detalhes_extras (JSON array - características internas)
- proximidades (JSON array - pontos de interesse)
```

### Mapeamento para Interface Pública
```typescript
interface PublicPropertyFull {
  // Identificação
  code: string;
  title: string;
  tipo_de_imovel: string;
  tipo_de_negocio: string; // "Venda", "Aluguel", "Venda e Aluguel"
  
  // Valores
  preco: number | null;
  condominio: number | null;
  iptu: number | null;
  seguro_incendio: number | null;
  taxa_de_servico: number | null;
  
  // Características
  quartos: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  andar: number | null;
  area_util: number | null;
  area_total: number | null;
  ano_construcao: number | null;
  mobilia: string | null;
  regra_pet: boolean | null;
  
  // Localização
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  latitude: number | null;
  longitude: number | null;
  
  // Mídia
  imagem_principal: string | null;
  fotos: string[];
  video_imovel: string | null;
  
  // Extras (JSON arrays)
  detalhes_extras: string[];
  proximidades: string[];
  
  descricao: string | null;
}
```

### Hook Atualizado
O `usePublicProperty` será atualizado para retornar todos os campos necessários do imóvel (já faz SELECT * na edge function).

### Endpoint Imóveis Relacionados
Novo endpoint na edge function `public-site-data`:
- **`endpoint: 'related'`**
- Parâmetros: `property_code`, `limit`
- Retorna imóveis do mesmo tipo ou bairro (excluindo o atual)

---

## Fluxo de Implementação

1. Criar componentes de UI modulares (Gallery, Features, etc.)
2. Atualizar `PublicPropertyDetail.tsx` com novo layout
3. Adicionar rota `/imovel/:code` no PreviewSiteWrapper
4. Atualizar links no PublicProperties e outros lugares
5. Adicionar endpoint de imóveis relacionados na edge function
6. Testar responsividade mobile/desktop

---

## Design Visual

### Cores e Estilo
- Seguir padrão do site (glassmorphism, cores do siteConfig)
- Fundo cinza claro (gray-50) para conteúdo
- Cards brancos com bordas arredondadas (rounded-2xl)
- Sombras suaves (shadow-sm)

### Tipografia
- Título: text-2xl md:text-3xl font-bold
- Preço: text-3xl md:text-4xl font-bold (cor primária)
- Labels: text-sm text-gray-500

### Responsividade
- Mobile: layout em coluna única, sidebar no final
- Tablet: layout em coluna única com sidebar lateral menor
- Desktop: layout 2/3 + 1/3 com sidebar sticky

---

## SEO

### Meta Tags (futuro)
- Title: `{titulo} | {tipo_de_imovel} em {bairro}, {cidade}`
- Description: `{descricao_resumida} - {quartos} quartos, {area}m²`
- Open Graph para compartilhamento

### URL Amigável
- `/imovel/AP0001` é curto e indexável
- Código único identifica o imóvel
- Fácil de compartilhar e memorizar
