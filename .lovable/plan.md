
# Plano: Corrigir Campo de Nome Vazio no StageSettingsDialog

## Problema Identificado
Quando o dialog de configurações da coluna é aberto, o campo "Nome da coluna" aparece vazio (mostrando apenas o placeholder "Nome do estágio"). Isso ocorre porque o estado local não é sincronizado quando a prop `stage` muda.

## Causa Raiz
No arquivo `StageSettingsDialog.tsx`, linhas 96-101, há um erro de uso do React:

```tsx
// ERRADO - useState não é reativo às mudanças de props
useState(() => {
  if (stage) {
    setName(stage.name);
    setColor(stage.color || '#22c55e');
  }
});
```

O `useState` é chamado apenas uma vez na montagem do componente. Como o dialog é mantido na árvore DOM e apenas a prop `stage` muda, o estado local (`name` e `color`) nunca é atualizado.

## Solução
Substituir o `useState` incorreto por um `useEffect` que reage às mudanças da prop `stage`:

```tsx
// CORRETO - useEffect sincroniza quando stage muda
useEffect(() => {
  if (stage) {
    setName(stage.name);
    setColor(stage.color || '#22c55e');
  }
}, [stage]);
```

## Arquivo a Modificar
- `src/components/pipelines/StageSettingsDialog.tsx`

## Detalhes Técnicos
1. Adicionar `useEffect` à lista de imports do React (linha 1)
2. Substituir o bloco `useState` das linhas 96-101 por `useEffect`
3. Adicionar `stage` como dependência do efeito

## Resultado Esperado
- Ao abrir as configurações de qualquer coluna, o nome e cor atuais serão exibidos corretamente
- A alteração entre diferentes colunas também atualizará os valores corretamente
- O usuário poderá salvar sem risco de sobrescrever com valores vazios
