
# Plano: Corrigir Conflito de Funções handle_lead_intake

## Problema Identificado

Existe um **conflito de funções** no banco de dados. Há duas funções com o mesmo nome mas assinaturas diferentes:

| Função | Tipo de Retorno | Propósito |
|--------|-----------------|-----------|
| `handle_lead_intake()` | trigger | Versão antiga - só define stage/pipeline |
| `handle_lead_intake(p_lead_id uuid)` | jsonb | Versão correta - faz round-robin completo |

O trigger `trigger_lead_intake` está chamando `handle_lead_intake(NEW.id)`, que deveria acionar a versão com parâmetro, **MAS** a existência da versão sem parâmetros está causando conflitos e comportamento inesperado.

**Resultado**: O log `assignments_log` registra a distribuição correta (alternando entre usuários), mas o UPDATE no lead não está sendo aplicado corretamente.

---

## Solução

Criar uma migração que:

1. **Remove a função antiga** `handle_lead_intake()` sem parâmetros
2. **Mantém apenas** `handle_lead_intake(p_lead_id uuid)` com a lógica correta
3. **Recria o trigger** para garantir que chama a versão correta

---

## Seção Técnica

### Migração SQL

```sql
-- 1. Dropar função antiga (a versão trigger sem parâmetros)
DROP FUNCTION IF EXISTS public.handle_lead_intake() CASCADE;

-- 2. Recriar função trigger que chama a versão correta
CREATE OR REPLACE FUNCTION public.trigger_handle_lead_intake()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN 
  -- Só aciona se o lead não tiver responsável atribuído
  IF NEW.assigned_user_id IS NULL THEN 
    v_result := public.handle_lead_intake(NEW.id); 
  END IF; 
  RETURN NEW; 
END; 
$$;

-- 3. Recriar trigger
DROP TRIGGER IF EXISTS trigger_lead_intake ON public.leads;
CREATE TRIGGER trigger_lead_intake 
  AFTER INSERT ON public.leads 
  FOR EACH ROW 
  EXECUTE FUNCTION public.trigger_handle_lead_intake();
```

### Verificação

Após a migração, deve existir apenas:
- `handle_lead_intake(p_lead_id uuid)` → retorna JSONB
- `trigger_handle_lead_intake()` → trigger que chama a função acima

### Fluxo Corrigido

```text
1. Webhook cria lead com assigned_user_id = NULL
   ↓
2. Trigger AFTER INSERT dispara
   ↓  
3. trigger_handle_lead_intake() verifica assigned_user_id IS NULL
   ↓
4. Chama handle_lead_intake(p_lead_id uuid) ← Versão correta com round-robin
   ↓
5. Round-robin seleciona próximo membro (alternando 1→2→1→2)
   ↓
6. UPDATE leads SET assigned_user_id = membro_selecionado
   ↓
7. INSERT assignments_log (registro histórico)
```

---

## Resultado Esperado

**Antes**: Todos os leads sendo atribuídos para o mesmo usuário (primeiro da fila)

**Depois**: Leads alternando corretamente entre os participantes:
- Lead 1 → André Rocha
- Lead 2 → usuário de teste  
- Lead 3 → André Rocha
- Lead 4 → usuário de teste
- ...
