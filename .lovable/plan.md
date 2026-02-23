
# Corrigir Espacamento Interno em Todas as Paginas do Super Admin

## Problema
Os blocos (Cards) em todas as paginas do painel Super Admin estao sem espacamento interno horizontal. O componente `CardContent` tem `px-0` como padrao, fazendo o conteudo encostar nas bordas do card.

## Solucao
Adicionar `px-4 md:px-6 pb-4` em todos os `CardContent` que ainda nao possuem esse espacamento, seguindo o padrao ja estabelecido no projeto (como ja feito em `AdminSettings.tsx`).

## Arquivos alterados

### 1. AdminDashboard.tsx
- 6 cards de KPI (linhas 122, 137, 153, 170, 186, 200): adicionar `px-4 md:px-6 pb-4`
- Card "Organizacoes Recentes" (linha 237): adicionar `px-4 md:px-6 pb-4`

### 2. AdminUsers.tsx
- Card "Todos os Usuarios" (linha 182): adicionar `px-4 md:px-6 pb-4`

### 3. AdminOrganizations.tsx
- Card "Todas as Organizacoes" (linha 250): adicionar `px-4 md:px-6 pb-4` e remover `px-[15px]` da div interna (linha 260)

### 4. AdminPlans.tsx
- Cards de planos (linha 178): adicionar `px-4 md:px-6` ao CardContent existente
- Card vazio (linha 154): adicionar `px-4 md:px-6`

### 5. AdminAudit.tsx
- Card "Filtros" (linha 77): adicionar `px-4 md:px-6 pb-4`
- Card "Registros" (linha 147): adicionar `px-4 md:px-6 pb-4`

### 6. AdminAnnouncements.tsx
- Card "Comunicado Ativo" (linha 105): adicionar `px-4 md:px-6 pb-4`
- Card "Novo Comunicado" (linha 142): adicionar `px-4 md:px-6 pb-4`
- Card "Historico" (linha 324): adicionar `px-4 md:px-6 pb-4`

### 7. AdminDatabase.tsx
- Card "Manutencao de Membros" (linha 92): adicionar `px-4 md:px-6 pb-4`

### 8. AdminHelpEditor.tsx
- Cards de stats (linhas 152-179): adicionar `px-4 md:px-6` nos 4 cards
- Card "Artigos por Categoria" (linha 203): adicionar `px-4 md:px-6 pb-4`

### 9. AdminRequests.tsx
- 5 cards de stats (linhas 109-137): adicionar padding nos CardContent com `p-4`
- Card "Filtros" (linha 142): ja tem `p-4`, ok
- Card "Solicitacoes" (linha 178): adicionar `px-4 md:px-6 pb-4`

### 10. AdminOrganizationDetail.tsx
- Card "Informacoes Gerais" (linha 228): adicionar `px-4 md:px-6 pb-4`
- Card "Modulos Principais" (linha 300): adicionar `px-4 md:px-6 pb-4`
- Card "Modulos por Segmento" (linha 338): adicionar `px-4 md:px-6 pb-4`
- Card "Modulos Avancados" (linha 381): adicionar `px-4 md:px-6 pb-4`
- Card "Usuarios da Organizacao" (linha 421): adicionar `px-4 md:px-6 pb-4`
- Card "Convites" (aba invites): adicionar `px-4 md:px-6 pb-4`

## Detalhes tecnicos
O padrao aplicado sera consistente: `className="px-4 md:px-6 pb-4"` adicionado a cada `CardContent`. Onde ja existem classes (como `space-y-4`), sera feito merge. Nenhuma alteracao de logica, apenas CSS.
