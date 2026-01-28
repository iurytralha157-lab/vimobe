
# Plano: Corrigir Inputs Perdendo Foco ao Editar Lead

## Problema Identificado

Ao digitar em campos como Nome, Email, Profissão, Finalidade de Compra e Valor do Negócio dentro do dialog de detalhes do lead, **o input perde o foco após cada caractere digitado**.

**Causa Raiz**: Os componentes `MobileContent` e `DesktopContent` estão definidos como **funções inline** dentro do `LeadDetailDialog`. A cada re-render (quando o estado `editForm` muda), essas funções são recriadas com uma nova referência, fazendo o React interpretar como **componentes diferentes** e remontá-los completamente, o que causa a perda de foco.

```text
Usuário digita "A"
      ↓
setEditForm({...name: "A"})
      ↓
LeadDetailDialog re-renderiza
      ↓
MobileContent = () => ... (nova função criada!)
      ↓
React vê como componente diferente
      ↓
Desmonta inputs antigos, monta novos
      ↓
Input perde foco
```

---

## Solução

Converter as funções `MobileContent` e `DesktopContent` de funções inline para **JSX direto inline** ou extraí-las para o nível superior do módulo. A abordagem mais segura e limpa é usar JSX direto no retorno do componente.

---

## Seção Tecnica

### Arquivo a Modificar
- `src/components/leads/LeadDetailDialog.tsx`

### Mudancas

**1. Remover as definicoes de funcao inline:**

Antes (linhas ~434 e ~1312):
```tsx
const MobileContent = () => <div className="flex flex-col h-full">
  // ... todo o conteudo mobile
</div>;

const DesktopContent = () => <div className="flex flex-col h-full max-h-[90vh]">
  // ... todo o conteudo desktop
</div>;
```

**2. Usar o JSX diretamente no retorno:**

Depois:
```tsx
// No return do componente
if (isMobile) {
  return (
    <Drawer open={!!lead} onOpenChange={() => onClose()}>
      <DrawerContent className="h-[95vh] p-0">
        {/* JSX do mobile direto aqui, sem funcao wrapper */}
        <div className="flex flex-col h-full">
          {/* ... todo o conteudo que estava em MobileContent */}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

return (
  <Dialog open={!!lead} onOpenChange={() => onClose()}>
    <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] p-0 overflow-hidden">
      {/* JSX do desktop direto aqui, sem funcao wrapper */}
      <div className="flex flex-col h-full max-h-[90vh]">
        {/* ... todo o conteudo que estava em DesktopContent */}
      </div>
    </DialogContent>
  </Dialog>
);
```

### Alternativa (Memoizacao)

Se houver necessidade de manter as funcoes por organizacao do codigo, envolver com `useMemo`:

```tsx
const MobileContent = useMemo(() => (
  <div className="flex flex-col h-full">
    {/* conteudo */}
  </div>
), [/* dependencias essenciais */]);
```

Porem, a abordagem de JSX direto e mais simples e evita problemas de dependencias.

---

## Resultado Esperado

**Antes**: Digitar uma letra faz o input perder o foco, forçando clique novamente

**Depois**: Digitação fluida e contínua em todos os campos do formulário de edição

---

## Bonus: Correcao do PhoneInput

Tambem ha um problema menor no `PhoneInput` onde o `useEffect` com `[value]` reseta estados internos a cada mudanca. Isso sera corrigido adicionando uma verificacao para evitar reset desnecessario:

```tsx
useEffect(() => {
  const newParsed = parsePhoneInput(value);
  // Só atualiza se os valores realmente mudaram
  if (newParsed.ddd !== ddd || newParsed.number !== number) {
    setSelectedCountry(countries.find(c => c.code === newParsed.countryCode) || countries[0]);
    setDdd(newParsed.ddd);
    setNumber(newParsed.number);
  }
}, [value]);
```
