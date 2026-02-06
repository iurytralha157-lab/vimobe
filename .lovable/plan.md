
## Plano de Remoção: Integração WordPress

### Escopo da Remoção

Vou remover completamente a funcionalidade WordPress do sistema, incluindo:

| Item | Tipo | Caminho |
|------|------|---------|
| Hook `use-wordpress-integration` | Frontend | `src/hooks/use-wordpress-integration.ts` |
| Edge Function | Backend | `supabase/functions/wordpress-webhook/` |
| Aba WordPress em Settings | Frontend | `src/pages/Settings.tsx` |
| Traduções | i18n | `src/i18n/translations/pt-BR.ts` e `en.ts` |
| Módulo na lista de módulos | Frontend | `src/hooks/use-organization-modules.ts` |
| Referências em filtros | Frontend | Múltiplos arquivos |
| Tabela do banco de dados | Database | `wordpress_integrations` |

**Verificação**: Não há nenhuma integração WordPress ativa no banco (`COUNT = 0`), então a remoção é segura.

---

## Fase 1: Remover Frontend

### 1.1 Deletar Hook WordPress
**Arquivo**: `src/hooks/use-wordpress-integration.ts`
- Deletar arquivo completamente

### 1.2 Remover da Página de Settings
**Arquivo**: `src/pages/Settings.tsx`

Remover:
- Import do hook `useWordPressIntegration`, `useCreateWordPressIntegration`, `useToggleWordPressIntegration`
- Variáveis `wpIntegration`, `wpLoading`, `createWpIntegration`, `toggleWpIntegration`
- Variável `hasWordpressModule`
- Variável `webhookUrl`
- Funções `handleCreateWpIntegration`, `handleToggleWpIntegration`
- Adição da aba WordPress no array `settingsTabs`
- Todo o `TabsContent value="wordpress"` (linhas 604-678)

### 1.3 Remover Módulo da Lista
**Arquivo**: `src/hooks/use-organization-modules.ts`

Remover `'wordpress'` do type `ModuleName`

### 1.4 Remover de Filtros de Source
**Arquivos**:
- `src/pages/Contacts.tsx` - Remover do `sourceLabels` e do `SelectItem`
- `src/components/leads/LeadDetailDialog.tsx` - Remover do `sourceLabels`
- `src/components/round-robin/RuleEditor.tsx` - Remover do array `SOURCES`
- `src/hooks/use-dashboard-stats.ts` - Remover referências
- `src/hooks/use-lead-notifications.ts` - Remover do mapeamento
- `src/lib/export-contacts.ts` - Remover do `sourceLabels`

---

## Fase 2: Remover Traduções

### 2.1 Português (pt-BR)
**Arquivo**: `src/i18n/translations/pt-BR.ts`

Remover:
- `wordpress: 'WordPress'` em `settings`
- Bloco `wordpress: { ... }` em `settings.integrations`
- `wordpress: 'WordPress'` em `leads.source`

### 2.2 Inglês (en)
**Arquivo**: `src/i18n/translations/en.ts`

Remover as mesmas referências

---

## Fase 3: Remover Backend

### 3.1 Deletar Edge Function
**Diretório**: `supabase/functions/wordpress-webhook/`

Deletar pasta inteira e usar ferramenta para remover função deployada

### 3.2 Remover Referência no Create Organization
**Arquivo**: `supabase/functions/create-organization-admin/index.ts`

Remover `'wordpress'` do array `disabledModules`

---

## Fase 4: Limpar Banco de Dados

### 4.1 Migração SQL

```sql
-- Remover políticas RLS
DROP POLICY IF EXISTS "Users can view wordpress integration" ON public.wordpress_integrations;
DROP POLICY IF EXISTS "Admins can manage wordpress integration" ON public.wordpress_integrations;

-- Remover trigger
DROP TRIGGER IF EXISTS update_wordpress_integrations_updated_at ON public.wordpress_integrations;

-- Remover tabela
DROP TABLE IF EXISTS public.wordpress_integrations CASCADE;

-- Remover função de regeneração de token (se existir)
DROP FUNCTION IF EXISTS public.regenerate_wordpress_token(uuid);

-- Remover registros de módulos existentes
DELETE FROM public.organization_modules WHERE module_name = 'wordpress';
```

**Nota**: Não vou alterar o ENUM `lead_source` porque já existem leads com `source = 'wordpress'` no sistema. Eles continuarão funcionando, apenas não será mais possível criar novos leads com essa fonte.

---

## Resumo de Arquivos

| Ação | Arquivo/Diretório |
|------|-------------------|
| **DELETAR** | `src/hooks/use-wordpress-integration.ts` |
| **DELETAR** | `supabase/functions/wordpress-webhook/` |
| **EDITAR** | `src/pages/Settings.tsx` |
| **EDITAR** | `src/hooks/use-organization-modules.ts` |
| **EDITAR** | `src/pages/Contacts.tsx` |
| **EDITAR** | `src/components/leads/LeadDetailDialog.tsx` |
| **EDITAR** | `src/components/round-robin/RuleEditor.tsx` |
| **EDITAR** | `src/hooks/use-dashboard-stats.ts` |
| **EDITAR** | `src/hooks/use-lead-notifications.ts` |
| **EDITAR** | `src/lib/export-contacts.ts` |
| **EDITAR** | `src/i18n/translations/pt-BR.ts` |
| **EDITAR** | `src/i18n/translations/en.ts` |
| **EDITAR** | `supabase/functions/create-organization-admin/index.ts` |
| **MIGRAÇÃO** | Remover tabela `wordpress_integrations` |

---

## Impacto

- **Leads existentes**: Leads com `source = 'wordpress'` continuarão visíveis e funcionando
- **Filtros**: Não será mais possível filtrar por fonte WordPress (opção removida)
- **Configurações**: Aba WordPress desaparece das configurações
- **Round-robin**: Regras que usavam WordPress como condição não terão mais essa opção

