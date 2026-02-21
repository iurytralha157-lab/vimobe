
# Ajuste do Formulario de Imoveis

## O que sera feito

### 1. Converter para Dialog centralizado (padrao estabelecido)
- Remover o `Sheet` (bottom sheet) do mobile e usar apenas `Dialog` centralizado
- Aplicar `w-[90%] sm:max-w-3xl sm:w-full rounded-lg max-h-[85vh] overflow-y-auto` no `DialogContent`

### 2. Botoes no padrao 40/60
- Reorganizar o footer com `flex gap-2`
- Cancelar: `w-[40%] rounded-xl`
- Cadastrar/Salvar: `w-[60%] rounded-xl`
- O botao de submit so fica habilitado quando os campos obrigatorios estiverem preenchidos

### 3. Campos obrigatorios
Os seguintes campos serao obrigatorios para habilitar o botao de cadastro:
- **Foto principal** (`imagem_principal`)
- **Galeria de imagens** (`fotos` - pelo menos 1 foto)
- **Titulo** (`formData.title`)
- **Valor/Preco** (`formData.preco`)
- **Quartos** (`formData.quartos`)

Uma variavel `isFormValid` sera calculada verificando esses 5 campos. O botao de submit ficara com `disabled` quando invalido, com opacidade reduzida para indicar visualmente.

## Detalhes tecnicos

**Arquivo modificado**: `src/components/properties/PropertyFormDialog.tsx`

- Remover imports de `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`
- Remover o bloco condicional `if (isMobile)` que renderiza o Sheet (linhas 626-638)
- Unificar para um unico `Dialog` com as classes de centralizacao padrao
- Adicionar validacao:
```tsx
const isFormValid = 
  formData.title.trim() !== '' &&
  formData.preco.trim() !== '' &&
  formData.quartos.trim() !== '' &&
  formData.imagem_principal.trim() !== '' &&
  formData.fotos.length > 0;
```
- Atualizar o footer (linhas 612-622) para o layout 40/60 com disabled condicional
