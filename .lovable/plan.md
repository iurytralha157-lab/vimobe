
# Plano: Corrigir carregamento da etapa específica no FollowUpBuilderEdit

## Diagnóstico

O problema ocorre porque há uma **condição de corrida** no carregamento dos dados:

1. A automação é carregada do banco com `on_reply_move_to_stage_id = "9e4c8102-..."` ✅
2. O estado `onReplyStageId` é setado corretamente ✅
3. O `pipelineId` é setado, disparando a query de `stages`
4. **Problema**: O Select renderiza com `value="9e4c8102-..."` mas os `stages` ainda não carregaram
5. O Radix Select não encontra um `<SelectItem>` correspondente e não consegue exibir o valor

### Por que o valor "some" mas não aparece no Select

O componente Radix `<Select>` só consegue exibir um valor se existir um `<SelectItem>` com aquele `value`. Como os stages demoram um momento para carregar (query assíncrona), o Select fica "vazio" visualmente mesmo tendo um valor válido no estado.

## Solução

Modificar a lógica para garantir que o Select sempre exiba corretamente o valor selecionado, mesmo enquanto os stages estão carregando.

### Mudanças em `FollowUpBuilderEdit.tsx`

1. **Adicionar estado para controlar quando os stages foram carregados após o pipelineId ser setado**

2. **Mostrar o nome da etapa selecionada mesmo antes dos stages carregarem** - Adicionar um fallback que mostra o ID ou um texto de loading enquanto a lista não está disponível

3. **Alternativa mais simples**: Adicionar um `SelectItem` dinâmico para o valor atual caso ele não esteja na lista de stages carregados

```text
Fluxo corrigido:
┌──────────────────────────────────────────────────────────┐
│ 1. automation carrega                                    │
│ 2. setOnReplyStageId("9e4c8102-...")                    │
│ 3. setPipelineId("074b4...")                            │
│ 4. stages query inicia (loading)                         │
│ 5. Select renderiza:                                     │
│    - value = "9e4c8102-..."                             │
│    - Items = [__none__] + (stages ainda vazio)          │
│    - ADICIONAR: Item temporário para o valor atual      │
│ 6. stages carrega → Select atualiza automaticamente     │
└──────────────────────────────────────────────────────────┘
```

### Implementação técnica

```typescript
// Dentro do Select de onReplyStageId:
<SelectContent>
  <SelectItem value="__none__">Não mover (apenas parar)</SelectItem>
  
  {/* Se há um valor selecionado mas os stages ainda não carregaram,
      adicionar um item placeholder para evitar que o Select fique vazio */}
  {onReplyStageId && 
   onReplyStageId !== "__none__" && 
   !stages?.find(s => s.id === onReplyStageId) && (
    <SelectItem value={onReplyStageId} disabled>
      Carregando...
    </SelectItem>
  )}
  
  {stages?.map((stage) => (
    <SelectItem key={stage.id} value={stage.id}>
      {/* ... */}
    </SelectItem>
  ))}
</SelectContent>
```

### Mesma correção em `FollowUpBuilder.tsx`

Aplicar a mesma lógica no componente de criação para consistência.

## Benefícios

- O valor selecionado sempre aparece no Select, mesmo durante o carregamento
- Sem alteração na lógica de salvamento (que já está correta)
- Experiência de usuário melhor - nunca vai parecer que "perdeu" o valor
