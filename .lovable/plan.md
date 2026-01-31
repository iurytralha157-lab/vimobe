
# Plano: Marca d'Água nas Fotos do Site Público

## Funcionalidade

Adicionar marca d'água sutil nas fotos dos imóveis exibidas no site público, com opções de personalização.

---

## Configurações no Painel (Aparência > Marca d'Água)

| Configuração | Descrição | Padrão |
|--------------|-----------|--------|
| **Ativar marca d'água** | Switch on/off | Desativado |
| **Opacidade** | Slider de 5% a 50% | 20% |
| **Logo personalizada** | Upload de logo específica para marca d'água | Logo principal |

---

## Como Funciona

### 1. Exibição no Site (Overlay CSS)

```text
┌─────────────────────────────────────┐
│                                     │
│     Foto do Imóvel                  │
│                                     │
│                     ┌──────────┐    │
│                     │  LOGO    │    │  ← Marca d'água
│                     │  20%     │    │    (canto inferior direito)
│                     └──────────┘    │
└─────────────────────────────────────┘
```

A marca d'água será aplicada via **CSS overlay** em todas as imagens:
- Galeria do imóvel (carrossel)
- Lightbox (tela cheia)
- Cards de imóveis nas listagens
- Home (destaques e portfólio)

### 2. Download com Marca d'Água Embutida

Quando o usuário baixar uma foto (botão de download ou salvar imagem):
- A imagem será processada via **Canvas API**
- A marca d'água é renderizada diretamente na imagem
- O download acontece com a logo embutida

---

## Mudanças Técnicas

### Parte 1: Banco de Dados

Nova migração para adicionar campos à tabela `organization_sites`:

```sql
ALTER TABLE public.organization_sites
ADD COLUMN IF NOT EXISTS watermark_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS watermark_opacity integer DEFAULT 20,
ADD COLUMN IF NOT EXISTS watermark_logo_url text;
```

Atualizar a função `resolve_site_domain` para incluir os novos campos no JSON retornado.

---

### Parte 2: Interface de Configurações

Adicionar nova seção em **Aparência** (`SiteSettings.tsx`):

```tsx
<Card>
  <CardHeader>
    <CardTitle>Marca d'Água</CardTitle>
    <CardDescription>
      Adicione uma marca d'água sutil nas fotos dos imóveis
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-6">
    {/* Switch para ativar */}
    <div className="flex items-center justify-between">
      <Label>Ativar marca d'água</Label>
      <Switch checked={...} onCheckedChange={...} />
    </div>

    {/* Slider de opacidade (5% a 50%) */}
    <div className="space-y-3">
      <Label>Opacidade: {opacity}%</Label>
      <Slider 
        value={[opacity]} 
        min={5} max={50} step={5}
        onValueChange={...}
      />
    </div>

    {/* Upload de logo personalizada */}
    <div className="space-y-2">
      <Label>Logo da marca d'água</Label>
      <p className="text-sm text-muted-foreground">
        Deixe em branco para usar a logo principal
      </p>
      {/* Botão de upload + preview */}
    </div>
  </CardContent>
</Card>
```

---

### Parte 3: Componente de Marca d'Água

Criar componente `WatermarkedImage.tsx`:

```tsx
interface WatermarkedImageProps {
  src: string;
  alt: string;
  watermarkUrl: string;
  opacity: number;
  className?: string;
  onDownload?: () => void;
}

export function WatermarkedImage({ src, alt, watermarkUrl, opacity, className }: Props) {
  return (
    <div className="relative">
      <img src={src} alt={alt} className={className} />
      
      {/* Overlay da marca d'água */}
      <div 
        className="absolute bottom-4 right-4 pointer-events-none"
        style={{ opacity: opacity / 100 }}
      >
        <img 
          src={watermarkUrl} 
          alt=""
          className="max-h-12 max-w-32 object-contain"
        />
      </div>
    </div>
  );
}
```

---

### Parte 4: Função de Download com Marca d'Água

Utilitário para renderizar a marca d'água na imagem via Canvas:

```typescript
// lib/watermark-utils.ts

export async function downloadWithWatermark(
  imageUrl: string,
  watermarkUrl: string,
  opacity: number,
  filename: string
): Promise<void> {
  // 1. Carregar a imagem principal
  const image = await loadImage(imageUrl);
  
  // 2. Carregar a logo da marca d'água
  const watermark = await loadImage(watermarkUrl);
  
  // 3. Criar canvas com o tamanho da imagem
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d')!;
  
  // 4. Desenhar a imagem
  ctx.drawImage(image, 0, 0);
  
  // 5. Configurar opacidade e desenhar marca d'água
  ctx.globalAlpha = opacity / 100;
  
  // Calcular posição (canto inferior direito)
  const watermarkHeight = Math.min(watermark.height, image.height * 0.1);
  const watermarkWidth = (watermark.width / watermark.height) * watermarkHeight;
  const x = image.width - watermarkWidth - 20;
  const y = image.height - watermarkHeight - 20;
  
  ctx.drawImage(watermark, x, y, watermarkWidth, watermarkHeight);
  
  // 6. Converter para blob e fazer download
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob!);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/jpeg', 0.9);
}
```

---

### Parte 5: Integrar na Galeria

Modificar `PropertyGallery.tsx`:

1. Adicionar botão de download em cada imagem no lightbox
2. Aplicar overlay de marca d'água em todas as imagens
3. Usar a função de download com Canvas quando clicado

```tsx
// No lightbox
<div className="relative">
  <img src={img} alt={...} className="max-w-full max-h-full object-contain" />
  
  {/* Overlay de marca d'água */}
  {watermarkEnabled && (
    <div 
      className="absolute bottom-4 right-4 pointer-events-none"
      style={{ opacity: watermarkOpacity / 100 }}
    >
      <img src={watermarkUrl || logoUrl} alt="" className="max-h-16" />
    </div>
  )}
  
  {/* Botão de download */}
  <button 
    onClick={() => handleDownload(img)}
    className="absolute bottom-4 left-4 bg-white/80 p-2 rounded-full"
  >
    <Download className="w-5 h-5" />
  </button>
</div>
```

---

### Parte 6: Aplicar nos Cards de Imóveis

Modificar os cards em:
- `PublicHome.tsx` (destaques e portfólio)
- `PublicProperties.tsx` (listagem)

Adicionar overlay de marca d'água quando `watermark_enabled = true`.

---

## Arquivos a Modificar/Criar

| Arquivo | Mudança |
|---------|---------|
| **Nova migração SQL** | Adicionar campos `watermark_enabled`, `watermark_opacity`, `watermark_logo_url` |
| **Atualizar função SQL** | Incluir campos no `resolve_site_domain` |
| `src/hooks/use-organization-site.ts` | Adicionar tipos dos novos campos |
| `src/hooks/use-public-site.ts` | Adicionar tipos na interface `PublicSiteConfig` |
| `src/pages/SiteSettings.tsx` | Nova seção "Marca d'Água" em Aparência |
| `src/lib/watermark-utils.ts` | **CRIAR** - Função de download com Canvas |
| `src/components/public/WatermarkedImage.tsx` | **CRIAR** - Componente de imagem com overlay |
| `src/components/public/property-detail/PropertyGallery.tsx` | Adicionar marca d'água + botão download |
| `src/pages/public/PublicHome.tsx` | Overlay nos cards |
| `src/pages/public/PublicProperties.tsx` | Overlay nos cards |

---

## Resultado Visual

### Configurações
Nova seção "Marca d'Água" na aba Aparência, com:
- Toggle para ativar/desativar
- Slider de opacidade (5% a 50%)
- Upload de logo específica (opcional)
- Preview da marca d'água aplicada

### No Site Público
- Todas as fotos de imóveis mostram a logo no canto inferior direito
- Opacidade sutil (padrão 20%) não atrapalha a visualização
- Botão de download no lightbox
- Downloads incluem a marca d'água permanentemente embutida

---

## Comportamento por Cenário

| Cenário | Comportamento |
|---------|---------------|
| Marca d'água desativada | Fotos exibidas normalmente, sem overlay |
| Ativada com logo principal | Usa `logo_url` do site |
| Ativada com logo personalizada | Usa `watermark_logo_url` |
| Download da foto | Renderiza marca d'água via Canvas, salva com logo embutida |
| Print screen | Overlay visível na captura |
