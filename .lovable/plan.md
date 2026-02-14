
# Exibir dados Telecom no resumo do Lead

## Problema

Os dados de CPF, RG, endereco e demais campos Telecom estao sendo salvos corretamente na tabela `telecom_customers`. Porem, quando o usuario abre o card do lead, a aba principal (overview/atividades) mostra apenas os dados basicos da tabela `leads` (nome, telefone, email). Os dados Telecom so aparecem se o usuario clicar na aba "Contato", o que nao e intuitivo.

## Solucao

Adicionar uma secao de resumo dos dados do cliente Telecom na visao principal do lead detail (overview), para que o usuario veja imediatamente as informacoes mais importantes (CPF, endereco, plano) sem precisar navegar para outra aba.

## Implementacao

### 1. Carregar dados do cliente Telecom no LeadDetailDialog

No `LeadDetailDialog.tsx`, ja existe o import e uso do `TelecomCustomerTab` na aba "contact". Vamos adicionar o hook `useTelecomCustomerByLead` diretamente no componente principal para ter acesso aos dados do cliente Telecom na visao geral.

### 2. Criar secao de resumo Telecom na overview

Dentro do LeadDetailDialog, na area de informacoes de contato (que aparece na visao principal antes das abas de atividades), adicionar um bloco que mostra:
- CPF
- Endereco completo (endereco, numero, bairro, cidade, UF)
- Plano contratado e valor
- Status do cliente

Essa secao so aparece quando `isTelecom` e `true` e quando existem dados no `telecom_customers`.

### 3. Alteracao nos dois layouts (Desktop e Mobile)

Conforme documentado na memoria do projeto, o `LeadDetailDialog` tem layouts separados para Desktop e Mobile. A secao de resumo Telecom deve ser adicionada em ambos os layouts.

## Detalhes tecnicos

### Arquivo: `src/components/leads/LeadDetailDialog.tsx`

1. Adicionar import:
```text
import { useTelecomCustomerByLead } from '@/hooks/use-telecom-customer-by-lead';
```

2. Adicionar hook no componente:
```text
const { data: telecomCustomer } = useTelecomCustomerByLead(isTelecom ? lead?.id : null);
```

3. Criar bloco de resumo (inserido logo abaixo das informacoes de contato basicas, tanto no layout Mobile quanto Desktop):
- Mostrar CPF, RG, endereco, plano e status em formato compacto (somente leitura)
- Incluir botao "Editar" que leva o usuario para a aba "Contato" (setActiveTab('contact'))
- Usar icones e layout consistente com o restante do dialogo

### Arquivos afetados

- `src/components/leads/LeadDetailDialog.tsx` - adicionar secao de resumo Telecom nos dois layouts
