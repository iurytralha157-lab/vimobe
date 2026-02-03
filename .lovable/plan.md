

# Plano: Visibilidade de Pipeline para Líderes de Equipe (Supervisores)

## Problema Identificado

Os líderes de equipe (supervisores) não conseguem ver todos os leads nas pipelines vinculadas às suas equipes. Isso afeta tanto o segmento imobiliário quanto o telecom.

### Causa Raiz

O sistema possui **duas lacunas** que impedem a visibilidade correta:

1. **Política de RLS incompleta no banco de dados:**
   - A política atual (`Hierarchical lead access`) verifica se o líder pode ver leads **atribuídos a membros da sua equipe**
   - **Não considera** a relação `team_pipelines` - se uma equipe está vinculada a uma pipeline, o líder deveria ver **todos** os leads dessa pipeline

2. **Filtro padrão no frontend:**
   - Quando um usuário acessa a pipeline, o sistema pré-seleciona "meus leads" se ele não tiver a permissão `lead_view_all`
   - **Ignora** que líderes de equipe também deveriam ter o filtro "todos" como padrão

### Exemplo Prático

- IZADORA TORRES é líder da equipe BACKOFFICE
- A equipe BACKOFFICE está vinculada à "Pipeline Telecom"
- Existem leads atribuídos a usuários fora do BACKOFFICE (ex: Cristiano Fernando)
- **Resultado atual:** IZADORA não consegue ver esses leads
- **Resultado esperado:** IZADORA deveria ver TODOS os leads da Pipeline Telecom

---

## Solução Proposta

### 1. Atualizar Política de RLS para Leads (Banco de Dados)

Modificar a política `Hierarchical lead access` para incluir visibilidade baseada em pipelines vinculadas:

```text
Nova lógica para líderes de equipe:
- Ver leads atribuídos a membros da equipe (atual) OU
- Ver leads em pipelines vinculadas à equipe via team_pipelines (NOVO)
```

Alterações no SQL:
- Criar função auxiliar `get_user_led_pipeline_ids()` que retorna IDs das pipelines vinculadas às equipes lideradas pelo usuário
- Adicionar condição na política: `pipeline_id IN (SELECT get_user_led_pipeline_ids())`

### 2. Atualizar Filtro Padrão no Frontend (Pipelines.tsx)

Modificar a lógica de seleção inicial do filtro de usuário:
- Verificar se o usuário é líder de equipe usando `useCanEditCadences()` (já existente)
- Se for líder, definir filtro como "all" (mostrar todos)

### 3. Atualizar Dashboard e Contatos (Consistência)

Aplicar a mesma lógica de visibilidade para:
- Dashboard: gráficos e métricas
- Contatos: listagem de leads

---

## Detalhes Técnicos

### Migração SQL

```text
1. Criar função get_user_led_pipeline_ids():
   SELECT tp.pipeline_id 
   FROM team_pipelines tp
   WHERE tp.team_id IN (SELECT get_user_led_team_ids())

2. Atualizar política "Hierarchical lead access":
   Adicionar condição:
   OR (
     is_team_leader(auth.uid()) AND (
       pipeline_id IN (SELECT get_user_led_pipeline_ids())
     )
   )

3. Atualizar política "Hierarchical lead management":
   Mesma lógica para INSERT/UPDATE/DELETE
```

### Alterações em Arquivos

| Arquivo | Mudança |
|---------|---------|
| `supabase/migrations/...` | Nova migração com função e políticas atualizadas |
| `src/pages/Pipelines.tsx` | Verificar `isTeamLeader` para definir filtro padrão |
| `src/hooks/use-contacts-list.ts` | Garantir que RLS já cobre (se usa RPC, verificar) |
| `src/hooks/use-dashboard-stats.ts` | Verificar se respeita nova lógica de visibilidade |

### Fluxo de Visibilidade Atualizado

```text
Usuário abre Pipeline → RLS filtra leads
                        │
                        ├─ É Super Admin? → Vê tudo
                        ├─ É Admin da Org? → Vê tudo
                        ├─ Tem lead_view_all? → Vê tudo
                        ├─ Lead atribuído a ele? → Vê o lead
                        ├─ É líder de equipe? → Vê leads:
                        │   ├─ Atribuídos a membros da equipe
                        │   └─ Em pipelines vinculadas à equipe (NOVO)
                        └─ Tem lead_view_team? → Vê leads de colegas
```

---

## Impacto

- **Usuários afetados:** Todos os líderes de equipe em todas as organizações
- **Segmentos:** Imobiliário e Telecom
- **Comportamento novo:** Líderes verão automaticamente todos os leads das pipelines vinculadas às suas equipes
- **Sem breaking changes:** Usuários regulares mantêm comportamento atual

