

# Nó "Resposta Positiva/Negativa" nas Automações

## Problema
Hoje o nó de **Condição** existe mas funciona com variáveis genéricas e operadores lógicos simples. Não existe uma forma prática de avaliar se a resposta do lead no WhatsApp foi **positiva** (sim, claro, pode ser, etc.) ou **negativa** (não, não quero, sem interesse, etc.).

## Solução
Criar um novo tipo de condição chamado **"Análise de Resposta"** (`response_sentiment`) dentro do nó de Condição existente. Ele analisa a última mensagem recebida do lead e classifica como positiva ou negativa usando uma lista de palavras-chave (sem necessidade de IA).

## Como vai funcionar

```text
[Mensagem] → [Espera (se responder)] → [Condição: Resposta Positiva?]
                                            ├── Sim → [Continua fluxo]
                                            └── Não → [Outra ação]
```

O usuário seleciona no painel do nó de Condição o tipo **"Resposta do lead"**, e o sistema automaticamente avalia a última mensagem recebida.

## Detalhes Técnicos

### 1. Atualizar o ConditionNode visual (sem mudanças de layout)
- Exibir "Resposta positiva?" como label quando o tipo for `response_sentiment`

### 2. Atualizar o NodeConfigPanel (nó condition)
- Adicionar um seletor de tipo de condição: **"Resposta do lead"** (response_sentiment) e **"Variável personalizada"** (custom)
- Quando `response_sentiment`: mostrar campo editável com palavras positivas (default: sim, claro, quero, pode, beleza, bora, vamos, aceito, ok, com certeza, fechado, top) e palavras negativas (default: não, nao, nope, sem interesse, desculpa, obrigado, talvez não, deixa pra lá)
- Quando `custom`: manter o comportamento atual (variável + operador + valor)

### 3. Atualizar `evaluateCondition` no automation-executor
- Quando `condition_type === 'response_sentiment'`:
  - Buscar a última mensagem recebida (`direction = 'incoming'`) da conversa do lead
  - Comparar o texto com as listas de palavras positivas/negativas configuradas
  - Retornar `true` se positiva, `false` se negativa ou não reconhecida

### 4. Arquivos a modificar
| Arquivo | Mudança |
|---|---|
| `src/components/automations/nodes/ConditionNode.tsx` | Mostrar label contextual baseado no tipo |
| `src/components/automations/NodeConfigPanel.tsx` | Adicionar config de tipo de condição + listas de palavras |
| `supabase/functions/automation-executor/index.ts` | Expandir `evaluateCondition` para buscar última mensagem e classificar sentimento |

### 5. Listas de palavras default (editáveis pelo usuário)
- **Positivas**: sim, claro, quero, pode, beleza, bora, vamos, aceito, ok, com certeza, fechado, top, pode ser, show, perfeito, ótimo, massa, interessado
- **Negativas**: não, nao, nope, sem interesse, desculpa, obrigado mas não, talvez não, deixa pra lá, não quero, não preciso, dispenso, valeu mas não

O matching será case-insensitive e com trim, verificando se a mensagem contém qualquer uma das palavras/frases da lista.

