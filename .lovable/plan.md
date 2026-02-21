
## Padronizar o Dialog de Pipelines da Equipe

Aplicar o mesmo padrao visual dos outros pop-ups ao dialog de atribuicao de pipelines no `TeamPipelinesManager`.

### Alteracoes

**Arquivo:** `src/components/teams/TeamPipelinesManager.tsx`

1. **DialogContent** - Alterar a classe de `sm:max-w-md` para `w-[90%] sm:max-w-md sm:w-full rounded-lg`
2. **Botao "Fechar"** no DialogFooter - Aplicar o padrao de largura total com `rounded-xl`:
   - Trocar o `DialogFooter` por uma `div` com `flex gap-2 pt-4`
   - Botao "Fechar" com `w-full rounded-xl`

### Detalhes tecnicos

```tsx
// Linha 275: DialogContent
<DialogContent className="w-[90%] sm:max-w-md sm:w-full rounded-lg">

// Linhas 330-334: Substituir DialogFooter
<div className="flex gap-2 pt-4">
  <Button variant="outline" className="w-full rounded-xl" onClick={() => setDialogOpen(false)}>
    Fechar
  </Button>
</div>
```
