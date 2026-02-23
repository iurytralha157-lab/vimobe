
# Adicionar Mascaras de CPF e RG nos Formularios

## O que sera feito
Aplicar formatacao automatica nos campos CPF e RG em todos os formularios do sistema, aceitando apenas numeros e formatando automaticamente conforme o usuario digita.

- **CPF**: formato `000.000.000-00` (11 digitos)
- **RG**: formato `00.000.000-0` (9 digitos)

## Arquivos alterados

### 1. `src/lib/masks.ts` (novo arquivo)
Criar funcoes utilitarias de mascara reutilizaveis:
- `maskCPF(value)` - remove tudo que nao e numero, aplica pontos e traco: `123.456.789-00`
- `maskRG(value)` - remove tudo que nao e numero, aplica pontos e traco: `12.345.678-9`

### 2. `src/components/leads/CreateLeadDialog.tsx`
- Campo CPF (linha 314): trocar `onChange` para aplicar `maskCPF` antes de salvar no state, adicionar `maxLength={14}`
- Campo RG (linha 325): trocar `onChange` para aplicar `maskRG` antes de salvar no state, adicionar `maxLength={12}`, mudar placeholder para `00.000.000-0`

### 3. `src/components/leads/TelecomCustomerTab.tsx`
- Campo CPF (linha 252): aplicar `maskCPF` no `onChange`, adicionar `maxLength={14}`
- Campo RG (linha 259): aplicar `maskRG` no `onChange`, mudar placeholder para `00.000.000-0`, adicionar `maxLength={12}`

### 4. `src/components/telecom/CustomerFormDialog.tsx`
- Campo CPF (linha 210): aplicar `maskCPF` no `onChange`, adicionar `maxLength={14}`
- Campo RG: aplicar `maskRG` no `onChange`, adicionar `maxLength={12}`

## Detalhes tecnicos

As funcoes de mascara funcionam assim:
```
maskCPF("18510318719") => "185.103.187-19"
maskRG("123456789") => "12.345.678-9"
```

Cada funcao:
1. Remove todos os caracteres nao numericos com `replace(/\D/g, '')`
2. Limita o tamanho maximo (11 para CPF, 9 para RG)
3. Aplica a formatacao progressivamente conforme o usuario digita
