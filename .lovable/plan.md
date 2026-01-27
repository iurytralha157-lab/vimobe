
# Plano de Correção: Aba de Gestão (CRM Management)

## Diagnóstico Completo

Após análise detalhada do código e banco de dados, identifiquei os seguintes problemas:

| Funcionalidade | Status | Problema |
|---|---|---|
| **Equipes** | ✅ OK | Interface funcionando normalmente |
| **Escala** | ⚠️ Parcial | Salva mas não é usada na distribuição |
| **Distribuição** | ✅ OK | Round-robin funcional |
| **Bolsão** | ❌ Quebrado | Faltam colunas no banco de dados |
| **Tags** | ⚠️ Oculto | Componente existe mas não está na página |

---

## Problema 1: Bolsão não funciona

**Causa:** A tabela `leads` não possui as colunas necessárias:
- `assigned_at` - Quando o lead foi atribuído
- `first_touch_at` - Quando houve primeiro contato (WhatsApp, ligação)
- `redistribution_count` - Contador de redistribuições

**Evidência:** Logs do Postgres mostram erros repetidos:
```
"column leads.assigned_at does not exist"
```

**Solução:** Adicionar as colunas faltantes via migração SQL.

---

## Problema 2: Tabela lead_pool_history não existe

**Causa:** O histórico de redistribuições precisa dessa tabela para funcionar.

**Solução:** Criar a tabela `lead_pool_history`.

---

## Problema 3: Escala não afeta distribuição

**Causa:** A função `handle_lead_intake` não verifica `is_member_available()` antes de atribuir o lead.

**Exemplo atual:** Corretor com horário 9h-18h recebe leads às 22h.

**Solução:** Alterar a função para pular membros indisponíveis.

---

## Problema 4: Aba de Tags sumiu

**Causa:** O componente `TagsTab.tsx` existe e funciona, mas não foi adicionado ao arquivo `CRMManagement.tsx`.

**Solução:** Importar e adicionar a aba de Tags.

---

## Alterações Técnicas

### 1. Migração SQL - Colunas do Bolsão

```sql
-- Adicionar colunas na tabela leads
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_touch_at timestamptz,
  ADD COLUMN IF NOT EXISTS redistribution_count integer DEFAULT 0;

-- Criar tabela de histórico
CREATE TABLE IF NOT EXISTS lead_pool_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  from_user_id uuid REFERENCES users(id),
  to_user_id uuid REFERENCES users(id),
  reason text DEFAULT 'timeout',
  redistributed_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE lead_pool_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org pool history"
  ON lead_pool_history FOR SELECT
  USING (organization_id = auth_org_id());
```

### 2. Trigger para preencher assigned_at

```sql
CREATE OR REPLACE FUNCTION set_lead_assigned_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_user_id IS NOT NULL 
     AND (OLD.assigned_user_id IS NULL OR OLD.assigned_user_id != NEW.assigned_user_id) THEN
    NEW.assigned_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_set_assigned_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_lead_assigned_at();
```

### 3. Atualizar handle_lead_intake para respeitar escala

Adicionar verificação de disponibilidade antes de atribuir:

```sql
-- Dentro do loop de seleção de membro:
-- Verificar se o usuário está disponível
IF NOT is_member_available(v_member.user_id) THEN
  -- Pular para próximo membro
  CONTINUE;
END IF;
```

### 4. Adicionar aba de Tags

**Arquivo:** `src/pages/CRMManagement.tsx`

```tsx
// Adicionar import
import { TagsTab } from '@/components/crm-management/TagsTab';
import { Tags } from 'lucide-react';

// Adicionar na TabsList
<TabsTrigger value="tags">
  <Tags className="h-4 w-4" />
  Tags
</TabsTrigger>

// Adicionar TabsContent
<TabsContent value="tags">
  <TagsTab />
</TabsContent>
```

---

## Ordem de Implementação

1. **Migração SQL** - Criar colunas e tabela (banco de dados)
2. **Trigger assigned_at** - Automatizar preenchimento
3. **Atualizar handle_lead_intake** - Respeitar escala
4. **Adicionar aba Tags** - Interface (código React)
5. **Testar Bolsão** - Verificar funcionamento completo

---

## Resultado Esperado

Após implementação:
- ✅ Equipes: Funcionando
- ✅ Escala: Corretores fora do horário não recebem leads
- ✅ Distribuição: Round-robin funcional
- ✅ Bolsão: Redistribuição automática por timeout
- ✅ Tags: Aba visível para gerenciar tags
