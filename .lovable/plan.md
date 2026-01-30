

# Plano: Ajustes Finais na Galeria de Fotos

## Mudanças Solicitadas

### 1. Remover Espaçamento Preto no Topo
**Arquivo:** `PropertyGallery.tsx` (linha 73)
- Remover `mt-16 md:mt-20` do container principal
- A galeria vai até o topo da página

### 2. Reduzir Espaçamento Entre Fotos para 1px
**Arquivo:** `PropertyGallery.tsx` (linha 95)
- Alterar `gap-1 md:gap-2` para `gap-px`
- Apenas uma linha fina separando as fotos

### 3. Implementar Carrossel Infinito
**Arquivo:** `PropertyGallery.tsx`
- Quando chegar no final, voltar para o início automaticamente
- Quando estiver no início e ir para trás, ir para o final
- Setas sempre visíveis (sem condição de disabled)

Lógica do carrossel infinito:
```text
nextSlide:
  Se currentIndex >= maxStartIndex
    → Voltar para 0
  Senão
    → Avançar +1

prevSlide:
  Se currentIndex <= 0
    → Ir para maxStartIndex
  Senão
    → Voltar -1
```

### 4. Remover Barra "Voltar para Imóveis"
**Arquivo:** `PublicPropertyDetail.tsx` (linhas 103-126)
- Remover toda a seção do breadcrumb com "Voltar para imóveis" e botão de compartilhar
- O usuário pode voltar pelo navegador ou pelo menu

---

## Arquivos a Modificar

### `src/components/public/property-detail/PropertyGallery.tsx`
- Linha 73: Remover `mt-16 md:mt-20`
- Linha 95: Alterar `gap-1 md:gap-2` → `gap-px`
- Linhas 29-35: Implementar lógica de loop infinito
- Linhas 116-133: Mostrar setas sempre (remover condições)

### `src/pages/public/PublicPropertyDetail.tsx`
- Linhas 103-126: Remover toda a seção do breadcrumb

---

## Resultado Esperado

- Galeria colada no topo da página (respeitando apenas o cabeçalho do site)
- Fotos separadas por apenas 1 pixel (linha fina)
- Carrossel sem fim - usuário pode rolar infinitamente
- Página mais limpa sem a barra de navegação duplicada

