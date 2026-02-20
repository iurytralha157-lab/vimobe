
## Redesign das Páginas Meta — Padrão WhatsApp

### Problema identificado

As duas páginas Meta estão com um layout vertical e desorganizado para mobile:

**`MetaIntegrationSettings`** (lista de páginas conectadas):
- Header card com título e botão "Adicionar Página" sem alinhamento compacto
- Cards de integração com avatar + nome + badge empilhados verticalmente
- 4 ações separadas (Formulários, Switch, Settings, Unlink) sem organização em grid como o WhatsApp

**`MetaFormManager`** (formulários dentro de cada integração):
- Cards de formulário com layout interno desbalanceado
- Switch + botão "Editar/Configurar" sem proporção definida

### Padrão do WhatsApp a seguir

O card do WhatsApp ficou com 3 linhas bem definidas em `p-3 space-y-2.5`:
```
Row 1: [Avatar] [Nome] [Status badge]
Row 2: [Responsável]  [Bell] [Toggle]  ← border-y separador
Row 3: [Botão flex-1] [Botão flex-1] [W-8] [W-8]
```

### O que será alterado

**Arquivo 1: `src/components/integrations/MetaIntegrationSettings.tsx`**

**Header Card** — consolidar em linha única:
```
[ƒ] Integração Meta          [+ Adicionar Página]
    Conecte sua conta...
    ✓ 2 página(s) conectada(s)
```

**Cards de integração** — aplicar o mesmo padrão de 3 rows:
```
Row 1: [ƒ] [Nome da Página]           [Ativo/Inativo]
             [95 leads recebidos]
Row 2: [Pipeline configurado]         [Switch ativo]   ← border-y
Row 3: [📄 Formulários flex-1] [⚙️ w-8] [🔗 w-8]
```

Em vez de usar `Collapsible` com `ChevronDown` separado, o botão "Formulários" vira o trigger do collapsible diretamente, mais limpo.

**Arquivo 2: `src/components/integrations/MetaFormManager.tsx`** — subseção de formulários

O header da subseção fica alinhado:
```
Formulários da Página    [↺ Atualizar]
```

Cada `FormCard` segue o mesmo padrão compacto:
```
Row 1: [📄] [Nome do Formulário]        [Ativo/Não config.]
Row 2: [X leads] [Imóvel] [Tags]        [Switch]  ← border-y
Row 3: [Configurar/Editar flex-1]
```

### Mudanças técnicas

| Arquivo | Mudança |
|---|---|
| `MetaIntegrationSettings.tsx` | Refatorar `CardHeader` para linha única; refatorar cards de integração com 3 rows padrão WhatsApp; `p-3 space-y-2.5`; botões proporcionais `flex-1 h-8` + `h-8 w-8` |
| `MetaFormManager.tsx` | Refatorar `FormCard` com 3 rows; mover Switch para row separada com `border-y`; botão ação em `flex-1` |

### Resultado visual esperado

```
┌──────────────────────────────────────┐
│ [ƒ] Integração Meta  [+ Add. Página] │  ← Header compacto
│     ✓ 2 página(s) conectada(s)       │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ [ƒ] Fernando - Corretor  [● Ativo]   │  ← Row 1
├──────────────────────────────────────┤
│ 95 leads recebidos       [● Toggle]  │  ← Row 2 (border-y)
├──────────────────────────────────────┤
│ [📄 Formulários  flex-1] [⚙][🔗]    │  ← Row 3
└──────────────────────────────────────┘
```
