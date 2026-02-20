
## Correção do Alinhamento do Card WhatsApp

### Problema Identificado

Observando o print enviado, os cards de sessão têm dois problemas de alinhamento:

1. **Padding inconsistente**: O `p-4` do `CardContent` cria um espaçamento uniforme, mas o Avatar e o badge de status ficam desalinhados visualmente — parece que o lado esquerdo "empurra" mais que o direito.

2. **Row 2 (Responsável + toggle)**: O nome do responsável (`Raquel Fernandes`, `Jessica`, `Maykon`) e o ícone de sino + switch estão em alturas diferentes, sem um alinhamento vertical claro.

3. **Row 3 (Botões)**: Os botões "Desconectar" e "Verificar" têm `flex-1` mas os ícones de Users e Trash são `w-8`. Isso cria uma distribuição desproporcional — os botões de texto são muito largos e os ícones ficam pequenos sem relação com os outros.

### O que o print de referência mostra

```
┌──────────────────────────────────────┐
│ [🟠] Vendas            [✓ Conectado] │
│      Conectado                       │
│ Raquel Fernandes              🔔 ⬤  │
│ [→ Desconectar] [↺ Verificar] [👥][🗑]│
└──────────────────────────────────────┘
```

O layout do print está bem alinhado — avatar à esquerda rente à borda, badge à direita rente à borda, e os botões distribuídos uniformemente.

### Correções

**Arquivo: `src/components/settings/WhatsAppTab.tsx`**

**1. Remover `p-4` e usar `p-3` com padding lateral consistente:**
```tsx
<CardContent className="p-3 space-y-2.5">
```

**2. Row 1 — Alinhar Avatar + nome + badge:**
- Usar `items-center` e `gap-2.5` para alinhamento perfeito
- O badge de status com `shrink-0` fica sempre à direita sem quebrar

**3. Row 2 — Responsável + toggle:**
- Alinhar verticalmente com `items-center` e garantir que o nome use `flex-1` para empurrar o toggle para a direita
- Reduzir gap para `gap-1` no lado esquerdo

**4. Row 3 — Botões:**
- Trocar os dois botões com texto de `flex-1` para tamanhos fixos mais proporcionais: ambos com `flex-1 h-8 text-xs px-2`
- Os dois ícones (Users e Trash) mantêm `h-8 w-8 p-0` — fixos
- Isso cria uma distribuição: `[— flex —][— flex —][32px][32px]`

**Resultado esperado:**
```
┌──────────────────────────────────────┐
│ [🟠] Vendas            [✓ Conectado] │  ← alinhado nas bordas
│      Conectado                       │
├──────────────────────────────────────┤
│ Raquel Fernandes         🔔 [toggle]  │  ← owner à esq, toggle à dir
├──────────────────────────────────────┤
│ [→ Desconectar] [↺ Verificar] [👥][🗑]│  ← proporcionais
└──────────────────────────────────────┘
```

### Arquivo alterado

| Arquivo | Mudança |
|---|---|
| `src/components/settings/WhatsAppTab.tsx` | Ajustar `CardContent` padding para `p-3`, corrigir `gap` e `items-center` nas 3 rows, balancear botões de ação |
