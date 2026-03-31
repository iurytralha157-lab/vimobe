

# Fix: Condições não salvando nas automações

## Problema
Quando o usuário configura o nó de Condição (tanto "Resposta do lead" quanto "Variável personalizada"), os dados não persistem. Ao reabrir o painel, tudo volta ao estado inicial.

**Causa raiz**: Os campos usam valores fallback no JSX (ex: `selectedNode.data.positive_keywords || 'sim, claro...'`), mas esses defaults nunca são escritos no `node.data`. Quando o usuário seleciona "Resposta do lead" sem editar as palavras-chave, nada é salvo. Além disso, ao trocar o tipo de condição, apenas `condition_type` é persistido — os campos associados não são inicializados.

## Solução

### Arquivo: `src/components/automations/NodeConfigPanel.tsx`

1. **Ao trocar `condition_type` para `response_sentiment`**: escrever imediatamente os defaults das keywords no `node.data`
2. **Ao trocar `condition_type` para `custom`**: limpar os campos de sentiment e inicializar os campos de variável
3. **Remover os fallbacks inline** dos `value` das textareas/inputs — usar apenas o que está em `node.data`

Mudanças concretas no `onValueChange` do Select de tipo de condição (linha ~555):
- Quando `response_sentiment`: chamar `onNodeDataChange` com `condition_type`, `positive_keywords` (default), `negative_keywords` (default)
- Quando `custom`: chamar `onNodeDataChange` com `condition_type`, `variable: ''`, `operator: 'equals'`, `value: ''`

Nos campos de textarea (linhas ~572, ~582):
- Trocar `selectedNode.data.positive_keywords || 'sim, claro...'` por apenas `selectedNode.data.positive_keywords ?? ''`
- Idem para `negative_keywords`

Isso garante que ao selecionar o tipo, os defaults são gravados no estado do nó, e qualquer edição subsequente também persiste corretamente.

## Arquivos modificados
| Arquivo | Mudança |
|---|---|
| `src/components/automations/NodeConfigPanel.tsx` | Inicializar defaults ao trocar tipo de condição; remover fallbacks inline |

