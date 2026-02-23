

# Corrigir Scroll, Adicionar Portabilidade e Verificar Rascunho

## Problema 1 - Scroll nao funciona
O formulario usa `ScrollArea` (Radix) dentro de um container flex com `h-[85vh]`. O viewport interno do ScrollArea precisa receber altura explicita para funcionar corretamente. Vou ajustar o CSS para garantir que o scroll funcione tanto no mobile quanto no desktop.

## Problema 2 - Trocar "Telefone 2" por "Portabilidade"
O campo "Telefone 2" (linhas 350-357) sera substituido por um checkbox "Portabilidade" com label "Este numero e portabilidade". O campo ficara logo abaixo do campo WhatsApp, no mesmo estilo visual do checkbox "E Combo?" ja existente no `TelecomCustomerTab.tsx`.

## Problema 3 - Rascunho
O rascunho ESTA funcionando no codigo (linhas 117-177 do CreateLeadDialog). Nenhuma alteracao necessaria - ele salva automaticamente com debounce de 500ms e restaura ao reabrir o formulario.

---

## Alteracoes tecnicas

### CreateLeadDialog.tsx

**Scroll fix:**
- Adicionar `style={{ maxHeight: 'calc(85vh - 180px)' }}` no ScrollArea ou ajustar o viewport com classe `[&>[data-radix-scroll-area-viewport]]:max-h-full` para garantir que o Radix compute a area de scroll corretamente.
- Alternativa: trocar o ScrollArea por um `div` com `overflow-y-auto flex-1 min-h-0` que e mais confiavel em containers flex.

**Portabilidade:**
1. Adicionar `is_portability: false` no `getEmptyFormData()` (linha 69)
2. Na aba "Basico" do Telecom, remover o campo "Telefone 2" (linhas 350-357) e substituir por um checkbox:
   ```
   <div className="flex items-center gap-2 mt-1">
     <Checkbox checked={formData.is_portability} onCheckedChange={...} />
     <Label>Este numero e portabilidade</Label>
   </div>
   ```
3. Mover o campo abaixo do WhatsApp, na mesma grid
4. No `handleSubmit`, incluir `is_portability` no payload do `upsertTelecomCustomer`
5. Remover `phone2` do `getEmptyFormData` e do payload

### TelecomCustomerTab.tsx
- Adicionar `is_portability` no `FormData`, `defaultFormData`, `useEffect` de inicializacao e `handleSubmit`
- Trocar o campo "Telefone 2" pelo checkbox "Portabilidade" na secao "Dados Pessoais"

