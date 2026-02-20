
## Melhorias Mobile no Dialog "Gerenciar Colunas"

### Problema Identificado

O componente `StagesEditorDialog.tsx` não possui adaptações para mobile. Os problemas visíveis na imagem são:

1. **Texto e ícones grandes demais**: a fonte do nome da coluna (`font-medium`) e os ícones (`h-5 w-5`, `h-3.5 w-3.5`) ocupam muito espaço horizontal
2. **Padding excessivo nos cards**: `p-3` cria muito espaço vertical, tornando cada linha muito alta
3. **Scroll cortado**: `max-h-[400px]` em tela de 390px de altura (iPhone) mostra poucos itens e corta o último
4. **Botões do footer grandes**: os botões "Cancelar" e "Fechar" ocupam muito espaço
5. **Gap entre elementos**: `gap-2` no container cria muito espaço interno nos cards
6. **Descrição verbosa**: o subtítulo ocupa 2 linhas desnecessariamente no mobile

### Solução — Apenas `StagesEditorDialog.tsx`

Todas as melhorias estão num único arquivo:

**1. Dialog responsivo**
- Trocar `max-w-md` por `sm:max-w-md w-[95vw]` para o diálogo caber melhor no mobile sem ser tão largo
- Reduzir o `padding` interno no mobile usando classes `sm:p-6 p-4`

**2. Altura do ScrollArea dinâmica**
- Mudar de `max-h-[400px]` fixo para `max-h-[55vh]` — isso usa 55% da altura da viewport, funcionando bem tanto em iPhones pequenos quanto grandes

**3. Cards mais compactos no mobile**
- Padding: `p-3` → `p-2 sm:p-3`
- Gap entre elementos: `gap-2` → `gap-1.5 sm:gap-2`
- Cor do dot: `h-4 w-4` → `h-3 w-3 sm:h-4 sm:w-4`
- Grip icon: `h-5 w-5` → `h-4 w-4 sm:h-5 sm:w-5`

**4. Texto menor no mobile**
- Nome da coluna: adicionar `text-sm sm:text-base` para reduzir de 16px para 14px no mobile
- Badge de contagem: manter `text-xs` mas reduzir padding `px-1.5 py-0.5 sm:px-2`

**5. Botões de ação menores**
- Ícones de editar/deletar: `h-7 w-7` → `h-6 w-6 sm:h-7 sm:w-7`
- Ícones internos: já são `h-3.5 w-3.5`, manter

**6. Footer com botões mais compactos**
- `pt-4` → `pt-3 sm:pt-4`
- Botões com `size="sm"` no mobile via classe `text-sm`

### Resultado Visual Esperado

```text
ANTES (mobile):
┌─────────────────────────────────────────┐
│  ⠿  🟡  Contato inicial         [62] ✏ 🗑 │  ← linha muito alta (52px)
│  ⠿  🟣  qualificação           [100] ✏ 🗑 │
│  ⠿  🔴  interagindo             [25] ✏ 🗑 │
│  ⠿  🔵  Documentação enviada     [2] ✏ 🗑 │
│  (último item cortado)                   │
└─────────────────────────────────────────┘

DEPOIS (mobile):
┌────────────────────────────────────────┐
│ ⠿ 🟡 Contato inicial         [62] ✏ 🗑 │  ← linha compacta (40px)
│ ⠿ 🟣 qualificação           [100] ✏ 🗑 │
│ ⠿ 🔴 interagindo             [25] ✏ 🗑 │
│ ⠿ 🔵 Documentação enviada     [2] ✏ 🗑 │
│ ⠿ 🔴 Reprovado                [7] ✏ 🗑 │
│ ⠿ 🔵 Venda ganha/pós venda    [2] ✏ 🗑 │
│ ⠿ 🟢 Fechamento                   ✏ 🗑 │
└────────────────────────────────────────┘
```

### Arquivo Modificado

| Arquivo | O que muda |
|---|---|
| `src/components/pipelines/StagesEditorDialog.tsx` | Classes responsivas em todo o dialog: tamanho, padding, fontes, ícones e altura do scroll |

Nenhum outro arquivo precisa ser alterado — a mudança é localizada e cirúrgica.
