
## Remover limitações horizontais redundantes da página "Meu Site"

### Problema

A página `SiteSettings.tsx` tem um wrapper `<div className="p-6 max-w-5xl mx-auto">` na linha 196 que adiciona:
- `max-w-5xl mx-auto` — limita e centraliza o conteúdo manualmente
- `p-6` — padding extra que duplica o já fornecido pelo `AppLayout`

O `AppLayout` já fornece `px-4 md:px-6 py-3 md:py-4` para todas as páginas, tornando essas classes redundantes.

### Correção

**Arquivo: `src/pages/SiteSettings.tsx`**

Linha 196 — trocar:
```tsx
<div className="p-6 max-w-5xl mx-auto">
```
Por:
```tsx
<div className="space-y-6">
```

Também passar o título para o `AppLayout` (linha 195) e remover o header manual (linhas 197-232):
```tsx
<AppLayout title="Configurações do Site">
  <div className="space-y-6">
    {/* Botões de ação (Preview, Copiar Link, Visitar Site) */}
    <div className="flex items-center justify-end gap-2">
      ...botões existentes...
    </div>
    {/* Restante do conteúdo sem mudanças */}
  </div>
</AppLayout>
```

### Resultado

A página seguirá o mesmo padrão de largura e espaçamento de todas as outras páginas do sistema, sem limitação horizontal própria.

### Arquivo alterado

| Arquivo | Mudança |
|---|---|
| `src/pages/SiteSettings.tsx` | Remover `p-6 max-w-5xl mx-auto`; usar `AppLayout title`; remover header manual |
