
## Correção do Espaçamento Interno dos Cards de Conta

### Problema identificado

O `CardContent` no projeto tem um override global em `card.tsx` que zera o padding horizontal (`px-0`). Isso faz com que os campos do formulário fiquem **colados nas bordas** dos cards de "Meu Perfil" e "Dados da Empresa".

O `AppLayout` já fornece `px-4 md:px-6 py-3 md:py-4` para o conteúdo da página — então o problema não é externo, é interno ao Card.

### Causa raiz

Em `src/components/ui/card.tsx`:
```tsx
// CardContent tem px-0 no projeto
const CardContent = ... className={cn("p-6 pt-0 px-0", className)}
```

E em `AccountTab.tsx`, o `CardContent` usa:
```tsx
<CardContent className="space-y-6">
```

Sem passar `px-4` ou `px-5`, o conteúdo herda o `px-0` global e fica colado nas bordas.

### Correção

**Arquivo: `src/components/settings/AccountTab.tsx`**

Nos dois `CardContent` (Perfil e Organização), adicionar `px-4 md:px-5` para dar o respiro interno correto:

```tsx
// Card de Perfil
<CardContent className="space-y-6 px-4 md:px-5">

// Card de Organização  
<CardContent className="space-y-6 px-4 md:px-5">
```

Também o `CardHeader` dos dois cards precisa de `px-4 md:px-5` pra alinhar com o conteúdo:

```tsx
<CardHeader className="px-4 md:px-5 pt-4 pb-2">
```

### Resultado esperado

```
┌──────────────────────────────────────┐
│  Meu Perfil                          │  ← título com padding
│  Gerencie suas informações pessoais  │
│                                      │
│  [Avatar]  Fernando Silva            │  ← conteúdo com respiro
│            email@...                 │
│                                      │
│  ⊙ Português (Brasil)            ▾  │  ← inputs alinhados
│                                      │
│  Nome          CPF                   │
│  [__________] [__________]           │
└──────────────────────────────────────┘
```

### Arquivo alterado

| Arquivo | Mudança |
|---|---|
| `src/components/settings/AccountTab.tsx` | Adicionar `px-4 md:px-5` nos `CardContent` e `CardHeader` dos cards de Perfil e Organização |
