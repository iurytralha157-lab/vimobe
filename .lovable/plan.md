

# Auditoria Completa do Modulo de Contatos

## Resumo Executivo

Analisei **864 linhas** do arquivo principal `Contacts.tsx`, o hook `use-contacts-list.ts`, o `ImportContactsDialog.tsx`, e o `export-contacts.ts`. O modulo esta **bem estruturado e funcional**, com paginacao eficiente no servidor via RPC, sistema de importacao com drag-and-drop, e exportacao via Excel. Identifiquei **3 problemas** e algumas melhorias recomendadas.

---

## Estatisticas do Sistema

| Metrica | Valor | Status |
|---------|-------|--------|
| Total de leads | 362 | Normal |
| Com telefone | 360 (99.4%) | Excelente |
| Com email | 309 (85.4%) | Bom |
| Com responsavel | 360 (99.4%) | Excelente |
| Sem pipeline | 3 (0.8%) | Atencao |
| Sem estagio | 3 (0.8%) | Atencao |
| Ganhos | 5 | Normal |
| Perdidos | 12 | Normal |
| Abertos | 345 | Normal |
| Duplicados por telefone | 2 casos | Menor |

---

## O Que Esta Funcionando Bem

| Area | Status | Observacoes |
|------|--------|-------------|
| **Paginacao Server-Side** | Excelente | RPC `list_contacts_paginated` com todos os filtros, RBAC, e contagem total |
| **Importacao XLSX/CSV** | Excelente | Drag-and-drop, parsing robusto, normalizacao de colunas, download de exemplo |
| **Exportacao Excel** | Funcional | ExcelJS gerando .xlsx com formatacao |
| **Filtros Completos** | Excelente | Pipeline, estagio, responsavel, tag, fonte, data |
| **Selecao em Lote** | Funcional | Checkbox para selecao multipla + exclusao em lote |
| **Ordenacao** | Funcional | Por nome, data de criacao, e interacao |
| **Visibilidade RBAC** | Excelente | RPC respeita `lead_view_all`, `lead_view_team`, e filtro por equipe |
| **Navegacao de Paginas** | Excelente | First/prev/next/last + input direto de pagina |
| **Mobile Responsive** | Excelente | Cards no mobile, tabela no desktop, filtros em sheet |
| **Indices no Banco** | Excelente | 18 indices otimizados incluindo `idx_leads_phone`, `idx_leads_email` |

---

## Problemas Identificados

### 1. Exportacao Usa Hook Antigo (Problema de Performance)

```typescript
// Linha 151 do Contacts.tsx
const { data: allLeads = [] } = useLeads();

// Linha 283
onClick={() => exportContacts({ leads: allLeads })}
```

**Problema**: O `useLeads()` esta sendo chamado SEMPRE (mesmo quando nao exporta) e carrega ate 200 leads sem usar a paginacao otimizada do RPC.

**Impacto**: 
- Query adicional em toda visita a pagina
- Limite de 200 leads na exportacao (mesmo tendo 362 no sistema)
- Nao respeita os filtros aplicados

**Solucao Recomendada**: 
- Criar funcao `exportContactsWithFilters()` que chama o RPC com `p_limit = 9999`
- Remover `useLeads()` do componente
- Exportar apenas os contatos filtrados (mais util para o usuario)

---

### 2. Leads Sem Pipeline Precisam de Correcao

Encontrei **3 leads** sem pipeline/estagio definidos:

| Lead | Fonte | Criado em |
|------|-------|-----------|
| ANDRE FILIPE DA SILVA ROCHA | website | 31/01 |
| Teste | website | 01/02 |
| Minami testando | website | 03/02 |

**Causa**: Provavel falha no webhook `public-site-contact` que nao definiu pipeline padrao.

**Impacto**: Esses leads nao aparecem no Kanban (apenas em Contatos).

**Solucao Recomendada**: Executar script de correcao para atribuir pipeline padrao.

---

### 3. Duplicatas de Telefone Existentes

```text
Telefone 5561999230375 -> 2 leads na mesma org
Telefone 5522974063727 -> 2 leads na mesma org
```

**Causa**: Hook `useCreateLead` tem logica de deduplicacao, mas leads antigos foram criados antes.

**Impacto**: Menor - pode causar confusao para vendedores.

**Acao**: Manter monitoramento - novos leads ja sao deduplicados automaticamente.

---

## Filtro de Status do Deal Ausente

Observei que o filtro de `deal_status` (Aberto/Ganho/Perdido) **nao existe** na UI de Contatos, mas o campo esta disponivel no RPC.

| Filtro | Disponivel na UI | Disponivel no RPC |
|--------|------------------|-------------------|
| Pipeline | Sim | Sim |
| Estagio | Sim | Sim |
| Responsavel | Sim | Sim |
| Tag | Sim | Sim |
| Fonte | Sim | Sim |
| Data | Sim | Sim |
| **Status do Deal** | **NAO** | N/A no RPC atual |

**Sugestao**: Adicionar filtro de status (util para ver apenas leads ganhos/perdidos).

---

## Arquitetura do Modulo

```text
Contacts.tsx (864 linhas)
|-- Estado: filtros, paginacao, selecao
|-- Hooks:
|   |-- useContactsList() --> RPC list_contacts_paginated (paginado)
|   |-- useLeads() --> Query direta (apenas para export - PROBLEMA)
|   |-- useLead() --> Detalhe de um lead
|   |-- useDeleteLead() --> Exclusao com cascade
|   |-- usePipelines(), useStages() --> Para filtros
|   |-- useOrganizationUsers() --> Para filtro de responsavel
|   |-- useTags() --> Para filtro de tag
|-- Componentes:
|   |-- ContactCard --> Card para mobile
|   |-- MobileFilters --> Sheet de filtros
|   |-- ImportContactsDialog --> Modal de importacao
|   |-- LeadDetailDialog --> Modal de detalhes
|   |-- TableSkeleton, EmptyState --> Estados

ImportContactsDialog.tsx (458 linhas)
|-- Parsing de XLSX via ExcelJS
|-- Parsing de CSV manual (split por , ou ;)
|-- Normalizacao de colunas (nome/name, telefone/phone, etc)
|-- Criacao via useCreateLead() (sequencial - pode ser otimizado)

export-contacts.ts (70 linhas)
|-- Gera XLSX via ExcelJS
|-- Tambem suporta CSV
|-- Apenas exporta o que recebe (nao filtra)
```

---

## Fluxo de Importacao

```text
1. Usuario arrasta arquivo .xlsx/.xls/.csv
2. parseFile() le com ExcelJS ou split manual
3. Normaliza colunas (nome, telefone, email, mensagem)
4. Valida se tem coluna "nome"
5. Usuario seleciona pipeline destino + fonte + responsavel
6. handleImport() chama createLead() para cada linha (sequencial)
7. Toast mostra sucesso/falhas
8. Leads criados no primeiro estagio da pipeline
```

---

## Melhorias Recomendadas

### Prioridade Alta

| # | Melhoria | Esforco | Impacto |
|---|----------|---------|---------|
| 1 | **Corrigir exportacao** - usar RPC paginado em vez de useLeads() | 1h | Alto |
| 2 | **Corrigir leads sem pipeline** - atribuir pipeline padrao | 15 min | Medio |
| 3 | **Adicionar filtro de status do deal** | 30 min | Medio |

### Prioridade Media

| # | Melhoria | Esforco | Impacto |
|---|----------|---------|---------|
| 4 | **Importacao em lote** - usar Promise.all com chunks de 10 | 30 min | Performance |
| 5 | **Progress bar na importacao** - mostrar X de Y | 20 min | UX |
| 6 | **Exportar apenas filtrados** - mais util para usuario | 30 min | UX |

### Prioridade Baixa

| # | Melhoria | Esforco | Impacto |
|---|----------|---------|---------|
| 7 | **Pre-visualizacao de dados** antes de importar | 1h | UX |
| 8 | **Suporte a mais colunas** na importacao (tags, estagio) | 1h | Features |
| 9 | **Cache de contagens** para evitar recalculo | 30 min | Performance |

---

## Seguranca

| Aspecto | Status | Notas |
|---------|--------|-------|
| RLS em leads | Ativado | 4 policies configuradas |
| RBAC via RPC | Ativado | Verifica `lead_view_all`, `lead_view_team`, filtra por equipe |
| Super Admin | Funciona | Pode ver todos os leads de todas orgs |
| Importacao | Segura | Apenas cria leads, validacao de arquivo no frontend |
| Exportacao | Segura | Exporta apenas leads visiveis para o usuario |

---

## Conclusao

O modulo de **Contatos esta bem implementado** com:
- Paginacao eficiente no servidor (RPC com RBAC)
- Importacao robusta com suporte a XLSX e CSV
- Interface responsiva com cards no mobile

Os principais pontos de atencao sao:
1. **Exportacao usando hook antigo** - corrigir para usar RPC
2. **3 leads sem pipeline** - atribuir pipeline padrao
3. **Filtro de status do deal** - adicionar na UI

---

## Acoes Imediatas Disponiveis

1. **Corrigir leads sem pipeline** - Executar UPDATE no banco
2. **Otimizar exportacao** - Refatorar para usar RPC
3. **Continuar para outra auditoria** - Gestao CRM ou Financeiro

