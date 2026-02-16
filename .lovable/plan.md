
# Compactar stepper de estagios no detalhe do lead

## O que muda

Na barra de estagios (pipeline timeline) dentro do detalhe do lead, tanto no desktop quanto no mobile:

- **Estagio ativo (onde o lead esta)**: mostra o nome completo como hoje (ex: "Contato Inicial")
- **Todos os outros estagios**: mostra apenas o numero da posicao (1, 2, 3, 4...)
- Ao clicar em um numero, o lead e movido para aquele estagio e o novo estagio passa a mostrar o nome, enquanto o anterior vira numero

Isso resolve o problema de a barra quebrar o layout quando ha muitos estagios.

## Arquivo afetado

`src/components/leads/LeadDetailDialog.tsx`

## Detalhes tecnicos

### Desktop stepper (linha ~1594-1607)

Trocar `{stage.name}` por logica condicional:
- Se `isActive`: mostra `stage.name`
- Senao: mostra `idx + 1` (numero da posicao)

Tambem adicionar `title={stage.name}` no botao para que o usuario veja o nome no tooltip ao passar o mouse.

### Mobile popover (linha ~645-654)

O mobile usa um popover com lista completa, entao os nomes podem continuar aparecendo la normalmente (tem scroll). Nao precisa mudar.

### Resultado visual esperado

```text
Antes:  [Contato Inicial] — [Qualificação] — [Interagindo] — [Documentação enviada] — [Fechamento] — ...
Depois: [●Contato Inicial] — [2] — [3] — [4] — [5] — ...
```

Ao clicar no "5" (Fechamento), fica:
```text
[1] — [2] — [3] — [4] — [●Fechamento] — ...
```
