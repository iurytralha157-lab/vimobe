
# Adicionar Telefone 2 no Formulario de Cadastro Telecom

## Resumo
O formulario de criacao de lead/cliente telecom (`CreateLeadDialog.tsx`) nao possui o campo "Telefone 2". Os outros formularios (edicao de cliente e aba de contrato) ja tem esse campo. A correcao e simples: adicionar o campo no formulario de criacao.

## O que sera feito

### Arquivo: `src/components/leads/CreateLeadDialog.tsx`

1. **Adicionar `phone2` no estado do formulario** (`getEmptyFormData`): incluir `phone2: ''`
2. **Adicionar campo de input** no bloco telecom da aba "Basico", logo abaixo do campo WhatsApp e acima do checkbox de portabilidade
3. **Passar `phone2` para o `upsertTelecomCustomer`** no `handleSubmit`, que ja aceita esse campo

### Detalhes tecnicos

No `getEmptyFormData` (linha ~71), adicionar:
```
phone2: '',
```

No JSX telecom (apos o campo WhatsApp, linha ~352), adicionar um campo PhoneInput para Telefone 2.

No `handleSubmit` (linha ~221), passar `phone2`:
```
phone2: formData.phone2 || null,
```

Nenhuma alteracao de banco de dados necessaria -- a coluna `phone2` ja existe na tabela `telecom_customers`.
