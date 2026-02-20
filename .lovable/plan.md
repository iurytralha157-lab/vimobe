
## Correção do Espaçamento Interno dos Cards — AccountTab

### Problema

O `CardContent` global em `card.tsx` tem `px-0` como padrão, zerando o padding horizontal. Como os cards de "Meu Perfil" e "Dados da Empresa" no `AccountTab.tsx` não passam padding explícito, o conteúdo fica colado nas bordas laterais dos cards.

O `CardHeader` também herda padding inconsistente — o título fica sem alinhamento com o conteúdo interno.

### Causa raiz

```tsx
// card.tsx — padrão global
const CardContent = ... className={cn("p-6 pt-0 px-0", className)}
//                                              ^^^^ zera padding horizontal

// AccountTab.tsx — não passa px
<CardContent className="space-y-6">  // herda px-0 → conteúdo colado na borda
```

### Correção

**Arquivo: `src/components/settings/AccountTab.tsx`**

Adicionar `px-4 md:px-5` nos dois `CardContent` e `px-4 md:px-5 pt-4 pb-2` nos dois `CardHeader`:

**Card de Perfil (linha ~275):**
```tsx
<CardHeader className="px-4 md:px-5 pt-5 pb-2">
  ...
</CardHeader>
<CardContent className="space-y-6 px-4 md:px-5 pb-5">
```

**Card de Organização (linha ~454):**
```tsx
<CardHeader className="px-4 md:px-5 pt-5 pb-2">
  ...
</CardHeader>
<CardContent className="space-y-6 px-4 md:px-5 pb-5">
```

### Resultado esperado

```
┌──────────────────────────────────────┐
│    Meu Perfil                        │  ← título com padding lateral
│    Gerencie suas informações...      │
│                                      │
│    [Avatar]  Fernando Silva          │  ← conteúdo com respiro
│              email@...               │
│                                      │
│    ⊙ Português (Brasil)          ▾  │  ← inputs alinhados
│                                      │
│    Nome          CPF                 │
│    [__________] [__________]         │
└──────────────────────────────────────┘
```

### Arquivo alterado

| Arquivo | Mudança |
|---|---|
| `src/components/settings/AccountTab.tsx` | `px-4 md:px-5` nos `CardContent` e `CardHeader` dos cards de Perfil e Organização |
