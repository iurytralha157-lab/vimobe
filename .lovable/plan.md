

## Plano: Página de Login com Suporte a Tema Escuro

### Problema Identificado

A página de login (`src/pages/Auth.tsx`) está com estilos **hardcoded para tema claro**:
- Fundo: `bg-gradient-to-br from-slate-50 to-slate-100` (sempre cinza claro)
- Card: `bg-white` (sempre branco)
- Labels: `text-slate-700`, `text-slate-400` (cores fixas para tema claro)
- Inputs: `bg-slate-50` (fundo fixo claro)
- Logo: `/logo.png` (fixa, não muda com tema)

### Solução

Converter a página de login para usar:
1. **Variáveis CSS do Tailwind** que respeitam o tema (`bg-background`, `bg-card`, `text-foreground`, etc.)
2. **Hook `useTheme`** do next-themes para detectar o tema atual
3. **Hook `useSystemSettings`** para buscar as logos configuradas (light/dark)
4. **Seleção dinâmica da logo** baseada no `resolvedTheme`

---

### Alterações no Arquivo `src/pages/Auth.tsx`

| Elemento | Antes (Hardcoded) | Depois (Dinâmico) |
|----------|-------------------|-------------------|
| Container fundo | `from-slate-50 to-slate-100` | `bg-background` |
| Card | `bg-white` | `bg-card` |
| Labels | `text-slate-700` | `text-foreground` |
| Inputs | `bg-slate-50` | `bg-muted` |
| Botões secundários | `text-slate-400` | `text-muted-foreground` |
| Logo | `/logo.png` (fixa) | Dinâmica via `useSystemSettings` + `useTheme` |

---

### Detalhes Técnicos

**1. Imports adicionais:**
```typescript
import { useTheme } from 'next-themes';
import { useSystemSettings } from '@/hooks/use-system-settings';
import { useMemo } from 'react';
```

**2. Hooks no componente:**
```typescript
const { resolvedTheme } = useTheme();
const { data: systemSettings } = useSystemSettings();

const logoUrl = useMemo(() => {
  if (!systemSettings) return '/logo.png';
  return resolvedTheme === 'dark' 
    ? systemSettings.logo_url_dark || systemSettings.logo_url_light || '/logo.png'
    : systemSettings.logo_url_light || systemSettings.logo_url_dark || '/logo.png';
}, [systemSettings, resolvedTheme]);
```

**3. Classes CSS atualizadas:**

```tsx
// Container principal
<div className="min-h-screen flex items-center justify-center bg-background px-4">

// Card
<div className="bg-card rounded-3xl p-9 border border-border shadow-lg">

// Labels
<Label className="text-sm text-foreground">Seu e-mail</Label>

// Inputs
<Input className="h-12 rounded-2xl bg-muted border-input" />

// Botões de ícone
<button className="... text-muted-foreground hover:text-foreground">

// Logo dinâmica
<img 
  src={logoUrl} 
  alt="Logo" 
  className="h-16 w-auto mb-4" 
/>
```

---

### Resultado Visual Esperado

**Tema Claro:**
- Fundo cinza claro suave
- Card branco com borda sutil
- Logo para tema claro

**Tema Escuro:**
- Fundo preto premium (`0 0% 4%`)
- Card escuro (`0 0% 7%`) com borda sutil
- Logo para tema escuro

O tema será preservado entre sessões porque o `next-themes` já salva a preferência no localStorage.

