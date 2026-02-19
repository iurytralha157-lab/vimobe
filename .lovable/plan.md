
# Diagnóstico Completo do Painel Super Admin

## Status atual por funcionalidade

### 1. Gestão de Usuários (`/admin/users`) — PARCIALMENTE IMPLEMENTADO

**O que funciona:**
- Listagem de todos os usuários via RPC `list_all_users_admin` (bypass RLS)
- Filtro por busca (nome/email), organização e status ativo/inativo
- Ativar/desativar usuários (`is_active`)
- Excluir usuário via edge function `manage-user`
- Badge de role (super_admin, admin, usuário)

**O que está FALTANDO:**
- Editar role do usuário (o botão de ações só tem "Ativar/Desativar" e "Excluir" — nenhuma opção de promover a admin ou rebaixar)
- Histórico de ações do usuário (link para o log de auditoria filtrado por usuário específico)
- Mover usuário de organização pelo painel (só via banco)
- Nenhuma paginação — carrega todos os usuários de uma vez (problema de escala)

---

### 2. Dashboard (`/admin`) — IMPLEMENTADO (com lacunas)

**O que funciona:**
- KPIs: Total de organizações, pagantes, em trial, gratuitos, total de usuários, MRR
- Gráfico de crescimento de organizações
- Gráfico de distribuição de status
- Alertas (trials expirando, organizações suspensas)
- Lista de organizações recentes

**O que está FALTANDO:**
- Nenhuma métrica de usuários ativos (logins recentes, sessões ativas)
- Novos cadastros por período (gráfico de crescimento mostra organizações, não usuários novos)
- Erros recentes do sistema (não existe)
- As métricas são estáticas (sem auto-refresh ou WebSocket)
- MRR calculado no frontend sem considerar planos anuais (potencialmente incorreto)

---

### 3. Gestão de Planos (`/admin/plans`) — BEM IMPLEMENTADO

**O que funciona:**
- Criar, editar, ativar/desativar e excluir planos
- Configurar: nome, descrição, preço, ciclo (mensal/anual), dias de trial, máx. usuários, módulos incluídos
- Grid visual com cards por plano

**O que está FALTANDO:**
- Não mostra quantas organizações estão em cada plano
- Não há opção de atribuir um plano a uma organização diretamente daqui (precisa ir em `/admin/organizations/:id`)
- Sem histórico de alterações de planos

---

### 4. Logs de Auditoria (`/admin/audit`) — IMPLEMENTADO

**O que funciona:**
- Tabela paginada com todos os logs
- Filtros: organização, ação (criar/atualizar/excluir/login/impersonação), entidade, data inicial
- Modal de detalhes com `old_data` e `new_data` lado a lado
- Ações cobertas: login, logout, impersonação (start/stop), CRUD de leads/usuários/organizações/contratos/comissões

**O que está FALTANDO:**
- Filtro por usuário específico (só filtra por organização)
- Sem filtro de data final (só data inicial)
- Sem exportação CSV dos logs
- Ações do sistema (automações, triggers) não são registradas

---

### 5. Impersonação (`/admin/organizations`) — IMPLEMENTADO (com risco)

**O que funciona:**
- Botão "Entrar como Admin" em cada organização
- Banner laranja fixo mostrando qual org está sendo impersonada
- Botão para voltar ao painel admin
- Log de auditoria da impersonação (start/stop)

**RISCO DE SEGURANÇA IDENTIFICADO:**
- A impersonação funciona modificando o `organization_id` diretamente na tabela `users` (`supabase.from('users').update({ organization_id: orgId })`)
- Isso é persistido no banco de dados, não na sessão. Se o servidor cair ou a aba fechar sem clicar em "Voltar", o super admin fica com `organization_id` de outra organização no banco
- O estado de impersonação é armazenado em `localStorage` — se limpar o storage, o banner some mas o `organization_id` no banco continua errado
- Não há mecanismo de recuperação automática

---

### 6. Configurações Globais (`/admin/settings`) — IMPLEMENTADO

**O que funciona:**
- Upload de logos (tema claro/escuro)
- Upload de ícones da sidebar
- Ajuste de tamanho da logo (slider)
- WhatsApp padrão do sistema
- Broadcast de refresh forçado para todos os usuários
- Publicar/desativar comunicado global com botão e link

**O que está FALTANDO:**
- Sem feature flags (habilitar/desabilitar funcionalidades globais)
- Sem configuração de modo de manutenção (mostrar banner de manutenção para todos)
- Sem configuração de limites globais padrão (ex: trial_days padrão)

---

## Páginas extras existentes (não listadas na solicitação)

| Página | Status |
|---|---|
| `/admin/organizations` | Funcional — listar, criar, impersonar, ativar/desativar, excluir |
| `/admin/organizations/:id` | Funcional — editar módulos, plano, status, notas, convidar usuário |
| `/admin/database` | Funcional — uso de disco, storage, breakdown de tabelas, limpeza de órfãos |
| `/admin/requests` | Funcional — solicitações de funcionalidades dos usuários |
| `/admin/announcements` | Funcional — comunicados globais com targeting por org/usuário |
| `/admin/help-editor` | Funcional — central de ajuda editável |

---

## O que será implementado

### Prioridade 1 — Gestão de Usuários (lacunas críticas)
- Adicionar ação "Editar Role" no dropdown de usuários (promover para admin / rebaixar para user)
- Adicionar botão "Ver histórico de ações" que redireciona para `/admin/audit` com filtro de `userId` pré-aplicado
- Paginação na listagem de usuários (não carrega tudo de uma vez)

### Prioridade 2 — Logs de Auditoria (lacunas importantes)
- Adicionar filtro por usuário (search input ou select)
- Adicionar filtro de data final
- Link "Ver auditoria" a partir da página de usuário

### Prioridade 3 — Segurança na Impersonação (risco atual)
- Adicionar verificação no startup: se super admin tem `organization_id` no banco mas não tem `impersonating` no localStorage, limpar automaticamente o `organization_id` (recovery)
- Ou migrar para modelo de impersonação via localStorage/sessão sem alterar banco (mais seguro)

### Prioridade 4 — Dashboard (métricas faltando)
- Adicionar card "Logins hoje" com contagem de eventos `login` nos audit_logs das últimas 24h
- Adicionar card "Novos usuários (7 dias)"

### Prioridade 5 — Configurações Globais (feature flags)
- Adicionar seção "Feature Flags" com switches para funcionalidades experimentais
- Adicionar toggle de "Modo Manutenção" que exibe banner global para todos os usuários não-admin

---

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/pages/admin/AdminUsers.tsx` | Adicionar "Editar Role" e "Ver Auditoria" no dropdown; paginação |
| `src/pages/admin/AdminAudit.tsx` | Filtro por usuário + data final |
| `src/hooks/use-super-admin.ts` | Adicionar `updateUserRole` mutation |
| `src/pages/admin/AdminDashboard.tsx` | Cards de logins hoje e novos usuários (7d) usando audit_logs |
| `src/contexts/AuthContext.tsx` | Recovery automático de impersonação órfã no startup |
| `src/pages/admin/AdminSettings.tsx` | Seção de feature flags e modo manutenção |
| Nova migration SQL | Tabela `feature_flags` para persistir flags globais |
