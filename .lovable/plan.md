
## Plano: Dashboard de Monitoramento do Banco de Dados

Criar uma nova página no painel Super Admin para monitorar a saúde do banco de dados, incluindo métricas de uso, alertas de limites e visualização por tabela.

---

## Visão Geral

O dashboard exibirá:
- **Uso atual** do banco de dados vs. limites do plano
- **Uso do Storage** (arquivos/mídias)
- **Tabelas mais pesadas** com crescimento
- **Alertas visuais** quando atingir thresholds (70%, 85%, 95%)
- **Contagem de registros** das principais tabelas
- **Recomendações** de limpeza quando necessário

---

## Arquitetura

### Nova Página
| Arquivo | Descrição |
|---------|-----------|
| `src/pages/admin/AdminDatabase.tsx` | Página principal do dashboard |

### Novos Componentes
| Arquivo | Descrição |
|---------|-----------|
| `src/components/admin/DatabaseUsageCard.tsx` | Card com gauge de uso total |
| `src/components/admin/StorageUsageCard.tsx` | Card com uso do storage |
| `src/components/admin/TablesBreakdown.tsx` | Tabela das maiores tabelas |
| `src/components/admin/DatabaseAlerts.tsx` | Alertas e recomendações |

### Novo Hook
| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/use-database-stats.ts` | Hook para buscar estatísticas |

### Novo RPC (Banco de Dados)
| Função | Descrição |
|--------|-----------|
| `get_database_stats_admin()` | RPC com SECURITY DEFINER para estatísticas |

---

## Estrutura do RPC

O RPC `get_database_stats_admin` irá retornar:

```sql
CREATE OR REPLACE FUNCTION public.get_database_stats_admin()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Verificar se é super admin
  IF NOT EXISTS (
    SELECT 1 FROM public.super_admins 
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT json_build_object(
    'database_size_bytes', pg_database_size(current_database()),
    'database_size_pretty', pg_size_pretty(pg_database_size(current_database())),
    'tables', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT 
          tablename as name,
          pg_total_relation_size('public.' || tablename) as size_bytes,
          pg_size_pretty(pg_total_relation_size('public.' || tablename)) as size_pretty,
          (SELECT reltuples::bigint FROM pg_class WHERE oid = ('public.' || tablename)::regclass) as estimated_rows
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size('public.' || tablename) DESC
        LIMIT 15
      ) t
    ),
    'storage', (
      SELECT json_build_object(
        'count', COUNT(*),
        'size_bytes', COALESCE(SUM((metadata->>'size')::bigint), 0)
      )
      FROM storage.objects
    ),
    'counts', json_build_object(
      'whatsapp_messages', (SELECT COUNT(*) FROM whatsapp_messages),
      'notifications', (SELECT COUNT(*) FROM notifications),
      'activities', (SELECT COUNT(*) FROM activities),
      'audit_logs', (SELECT COUNT(*) FROM audit_logs),
      'leads', (SELECT COUNT(*) FROM leads),
      'users', (SELECT COUNT(*) FROM users),
      'organizations', (SELECT COUNT(*) FROM organizations)
    )
  ) INTO result;

  RETURN result;
END;
$$;
```

---

## Design Visual

### Cards de Métricas Principais

```text
+----------------------+  +----------------------+  +----------------------+
|  BANCO DE DADOS      |  |  STORAGE            |  |  REGISTROS          |
|  ==================  |  |  ==================  |  |  ==================  |
|     85 MB / 500 MB   |  |     6.3 GB / 50 GB  |  |   40K mensagens     |
|     [========--]     |  |     [====------]    |  |   354 leads         |
|        17%           |  |        13%          |  |   35 usuários       |
+----------------------+  +----------------------+  +----------------------+
```

### Alertas Visuais

| Threshold | Cor | Ação |
|-----------|-----|------|
| 0-70% | Verde | Normal |
| 70-85% | Amarelo | Atenção |
| 85-95% | Laranja | Alerta |
| 95%+ | Vermelho | Crítico |

### Tabelas Mais Pesadas

```text
+--------------------------------------------------+
| Tabela              | Tamanho | Registros | % BD |
|---------------------|---------|-----------|------|
| whatsapp_messages   | 23 MB   | 40K       | 27%  |
| activities          | 1.9 MB  | 4.8K      | 2%   |
| telecom_customers   | 1.3 MB  | 1.2K      | 1.5% |
| audit_logs          | 1.3 MB  | 3.8K      | 1.5% |
+--------------------------------------------------+
```

### Card de Alertas e Recomendações

Quando detectar situações críticas:
- "whatsapp_messages com 40K registros - considere limpar mensagens antigas"
- "notifications crescendo rapidamente - ative limpeza automática"
- "Storage em 6GB - verifique mídias não utilizadas"

---

## Limites do Supabase (Configuráveis)

Valores padrão baseados no plano Pro:
- Database: 8GB (configurável)
- Storage: 100GB (configurável)

O Super Admin poderá ajustar esses limites nas configurações.

---

## Modificações Necessárias

### 1. AdminSidebar.tsx
Adicionar novo item de navegação:
```tsx
{ icon: Database, label: 'Banco de Dados', path: '/admin/database' }
```

### 2. App.tsx
Adicionar rota:
```tsx
<Route path="/admin/database" element={<SuperAdminRoute><AdminDatabase /></SuperAdminRoute>} />
```

---

## Seção Técnica

### Estrutura de Arquivos

```text
src/
├── hooks/
│   └── use-database-stats.ts (novo)
├── components/admin/
│   ├── DatabaseUsageCard.tsx (novo)
│   ├── StorageUsageCard.tsx (novo)
│   ├── TablesBreakdown.tsx (novo)
│   └── DatabaseAlerts.tsx (novo)
└── pages/admin/
    └── AdminDatabase.tsx (novo)

supabase/migrations/
└── XXXXXX_database_stats_rpc.sql (novo)
```

### Hook use-database-stats

```typescript
export function useDatabaseStats() {
  return useQuery({
    queryKey: ['database-stats-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_database_stats_admin');
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000, // Atualiza a cada minuto
  });
}
```

### Componente Principal

O `AdminDatabase.tsx` seguirá o padrão do `AdminDashboard.tsx`:
- Usa `AdminLayout` como wrapper
- Grid responsivo para cards
- Cards de UI existentes
- Recharts para visualizações

---

## Funcionalidades do Dashboard

1. **Gauge de Uso do Banco**
   - Mostra uso atual vs limite configurado
   - Cores de alerta conforme threshold
   - Botão para configurar limite

2. **Gauge de Uso do Storage**
   - Mostra uso atual vs limite
   - Contagem de arquivos
   - Link para gerenciar storage

3. **Tabela de Breakdown**
   - 15 maiores tabelas
   - Tamanho, registros, percentual
   - Ordenável por coluna

4. **Card de Alertas**
   - Alertas automáticos baseados em thresholds
   - Recomendações de limpeza
   - Botões de ação rápida

5. **Estatísticas Gerais**
   - Total de organizações, usuários, leads
   - Contagem de mensagens WhatsApp
   - Tendência de crescimento

---

## Resumo de Arquivos

| Ação | Arquivo |
|------|---------|
| **CRIAR** | `src/pages/admin/AdminDatabase.tsx` |
| **CRIAR** | `src/hooks/use-database-stats.ts` |
| **CRIAR** | `src/components/admin/DatabaseUsageCard.tsx` |
| **CRIAR** | `src/components/admin/StorageUsageCard.tsx` |
| **CRIAR** | `src/components/admin/TablesBreakdown.tsx` |
| **CRIAR** | `src/components/admin/DatabaseAlerts.tsx` |
| **EDITAR** | `src/components/admin/AdminSidebar.tsx` |
| **EDITAR** | `src/App.tsx` |
| **MIGRAÇÃO** | Criar RPC `get_database_stats_admin` |
