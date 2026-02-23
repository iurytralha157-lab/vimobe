
# Rascunho Automatico no Formulario de Lead

## Problema

Ao preencher o formulario de cadastro de lead no celular, se o usuario clicar fora do popup ou minimizar o app, o dialog fecha e todos os dados digitados sao perdidos.

## Solucao

Salvar automaticamente os dados do formulario no `localStorage` a cada alteracao. Quando o dialog reabrir, restaurar os dados salvos. Limpar o rascunho apenas apos o envio com sucesso.

## Como vai funcionar

1. Cada vez que o usuario digitar/alterar qualquer campo, os dados sao salvos no localStorage automaticamente (com debounce de 500ms para performance)
2. Ao abrir o formulario, se existir rascunho salvo, os dados sao restaurados e uma barra discreta aparece informando "Rascunho restaurado" com opcao de "Descartar"
3. Apos submeter o formulario com sucesso, o rascunho e apagado
4. O rascunho e vinculado a organizacao para evitar conflitos entre contas

## Alteracoes

### Arquivo: `src/components/leads/CreateLeadDialog.tsx`

1. **Chave do localStorage**: `lead-draft-{organization_id}` para isolar por organizacao

2. **Salvar rascunho**: Adicionar um `useEffect` que observa `formData` e salva no localStorage com debounce de 500ms (evita escrita excessiva)

3. **Restaurar rascunho**: No `useEffect` que roda quando `open` muda para `true`, verificar se existe rascunho salvo antes de resetar o formulario. Se existir, restaurar os dados e mostrar indicador visual

4. **Limpar rascunho**: Chamar `localStorage.removeItem` no `handleSubmit` apos sucesso (linha 214, antes do `onOpenChange(false)`)

5. **Indicador visual**: Uma barra sutil no topo do formulario (abaixo do titulo) com texto "Rascunho restaurado" e botao "Descartar" que limpa o localStorage e reseta o formulario

6. **Impedir fechamento acidental**: Alterar o `onOpenChange` do Dialog para que, quando houver dados preenchidos, o popup NAO feche ao clicar fora (backdrop). O usuario precisara clicar em "Cancelar" ou no X explicitamente. Os dados ficam salvos no localStorage de qualquer forma.

### Detalhes tecnicos

- Chave: `lead-draft-${organization?.id}`
- Debounce: `setTimeout` de 500ms no useEffect de save, com cleanup
- Dados salvos: todo o objeto `formData` + `activeTab` (para restaurar a aba ativa)
- Nao salva se o formulario estiver vazio (apenas nome vazio e sem outros campos preenchidos)
- Banner de rascunho: componente inline com `bg-amber-50 dark:bg-amber-950` e icone de rascunho
