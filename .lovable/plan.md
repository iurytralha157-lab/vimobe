
# Ajuste do Dialog de Configuracoes de SLA

Aplicar o mesmo padrao visual dos outros dialogs ao popup de "Configuracoes de SLA".

## O que muda

Apenas 1 arquivo: `src/components/pipelines/PipelineSlaSettings.tsx`

1. **Dialog centralizado no mobile**: Adicionar `w-[90%] sm:w-full rounded-lg` ao `DialogContent` para manter 5% de espaco em cada lado no celular
2. **Botoes 60/40**: Reorganizar o `DialogFooter` para usar layout `flex gap-2` com:
   - Cancelar: `w-[40%]` (esquerda)
   - Salvar: `w-[60%]` (direita)

## Detalhes tecnicos

**Linha ~68 - DialogContent:**
```
Antes:  <DialogContent className="sm:max-w-[500px]">
Depois: <DialogContent className="sm:max-w-[500px] w-[90%] sm:w-full rounded-lg">
```

**Linhas ~116-125 - DialogFooter:**
```
Antes:
<DialogFooter>
  <Button variant="outline" ...>Cancelar</Button>
  <Button ...>Salvar</Button>
</DialogFooter>

Depois:
<div className="flex gap-2 pt-4 border-t">
  <Button variant="outline" className="w-[40%]" ...>Cancelar</Button>
  <Button className="w-[60%]" ...>Salvar</Button>
</div>
```
