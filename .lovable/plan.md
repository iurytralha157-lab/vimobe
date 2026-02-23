
# Adicionar Campo de Portabilidade no Cadastro de Lead Telecom

## Problema
Nao existe opcao para marcar se o numero de telefone do cliente e uma portabilidade. Isso e importante para operadoras de telecom controlarem quais clientes estao trazendo numero de outra operadora.

## Solucao
Adicionar um checkbox "Portabilidade" logo abaixo do campo de telefone no formulario de criacao e edicao do lead telecom, e criar a coluna correspondente no banco de dados.

## Alteracoes

### 1. Banco de dados - Nova coluna
Criar uma migration SQL adicionando a coluna `is_portability` (boolean, default false) na tabela `telecom_customers`.

### 2. CreateLeadDialog.tsx - Formulario de criacao
- Adicionar `is_portability: false` no `getEmptyFormData`
- Adicionar um checkbox "Portabilidade" logo abaixo da grid dos telefones (WhatsApp e Telefone 2), com label "Este numero e portabilidade"
- Incluir `is_portability` no payload enviado ao `upsertTelecomCustomer`

### 3. TelecomCustomerTab.tsx - Formulario de edicao (dentro do card do lead)
- Adicionar `is_portability: boolean` na interface `FormData` e no `defaultFormData`
- Carregar o valor salvo do customer no `useEffect`
- Adicionar o checkbox "Portabilidade" abaixo dos campos de telefone, na secao "Dados Pessoais"
- Incluir `is_portability` no payload do `handleSubmit`

### 4. Hook use-telecom-customer-by-lead.ts
- Adicionar `is_portability` no tipo `UpsertTelecomCustomerInput` (ja e passado dinamicamente via spread, entao basta incluir no objeto enviado)

### Detalhes tecnicos
- Coluna: `is_portability BOOLEAN DEFAULT false` na tabela `telecom_customers`
- O checkbox aparece apenas para organizacoes com `segment === 'telecom'`
- Visualmente: checkbox com estilo identico ao "E Combo?" ja existente na secao de equipamentos
- O campo sera salvo junto com os demais dados do telecom_customers, sem necessidade de endpoint novo
