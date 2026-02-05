
# Plano de Correção: Criação Automática de Comissões via Trigger

## Problema Identificado

O lead **"Lead Teste Financeiro"** foi marcado como ganho com valor de R$ 250.000, mas a comissão e conta a receber **NÃO foram criadas**.

**Causa raiz:** O lead foi arrastado para um estágio com automação "mudar para Ganho", que executa via trigger SQL. Este trigger apenas atualiza o `deal_status` e `won_at`, mas **não cria registros financeiros**.

A criação de comissões só acontece quando:
- O status é alterado manualmente no LeadDetailDialog (usa hook JavaScript)

## Solução Proposta

Criar um **trigger SQL** que cria comissão e receivable automaticamente quando `deal_status` muda para `'won'`.

### Etapa 1: Criar Função de Auto-Criação de Comissão

```sql
CREATE OR REPLACE FUNCTION create_commission_on_won()
RETURNS TRIGGER AS $$
DECLARE
  v_commission_percentage numeric;
  v_commission_amount numeric;
  v_property_commission numeric;
  v_org_commission numeric;
BEGIN
  -- Só executa se deal_status mudou para 'won' e tem valor_interesse
  IF NEW.deal_status = 'won' 
     AND (OLD.deal_status IS NULL OR OLD.deal_status != 'won')
     AND NEW.valor_interesse > 0 THEN
    
    -- Verificar se já existe comissão para este lead
    IF NOT EXISTS (SELECT 1 FROM commissions WHERE lead_id = NEW.id) THEN
      
      -- Buscar percentual do imóvel
      SELECT commission_percentage INTO v_property_commission
      FROM properties WHERE id = NEW.property_id;
      
      -- Buscar percentual da organização
      SELECT default_commission_percentage INTO v_org_commission
      FROM organizations WHERE id = NEW.organization_id;
      
      -- Fallback chain: lead -> property -> organization -> 5%
      v_commission_percentage := COALESCE(
        NULLIF(NEW.commission_percentage, 0),
        NULLIF(v_property_commission, 0),
        NULLIF(v_org_commission, 0),
        5.0
      );
      
      v_commission_amount := NEW.valor_interesse * (v_commission_percentage / 100);
      
      -- Criar comissão
      INSERT INTO commissions (
        organization_id, lead_id, user_id, property_id,
        base_value, amount, percentage, status, notes
      ) VALUES (
        NEW.organization_id, NEW.id, NEW.assigned_user_id, NEW.property_id,
        NEW.valor_interesse, v_commission_amount, v_commission_percentage,
        'forecast', 'Comissão gerada automaticamente'
      );
    END IF;
    
    -- Verificar se já existe receivable para este lead
    IF NOT EXISTS (
      SELECT 1 FROM financial_entries 
      WHERE lead_id = NEW.id AND type = 'receivable'
    ) THEN
      -- Criar conta a receber
      INSERT INTO financial_entries (
        organization_id, lead_id, type, amount, 
        due_date, status, description
      ) VALUES (
        NEW.organization_id, NEW.id, 'receivable', NEW.valor_interesse,
        (CURRENT_DATE + INTERVAL '30 days')::date,
        'pending', 'Venda - ' || NEW.name
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Etapa 2: Criar Trigger

```sql
CREATE TRIGGER trigger_create_commission_on_won
AFTER UPDATE ON leads
FOR EACH ROW
WHEN (NEW.deal_status = 'won' AND OLD.deal_status IS DISTINCT FROM 'won')
EXECUTE FUNCTION create_commission_on_won();
```

### Etapa 3: Criar Comissão para o Lead de Teste

Após implementar o trigger, criar manualmente a comissão para o lead que você acabou de testar:

```sql
INSERT INTO commissions (organization_id, lead_id, user_id, base_value, amount, percentage, status, notes)
VALUES (
  'cd868dbb-924d-4e14-9bc8-5d3e67f44c3d',
  'be635892-31ff-402b-8c12-d158bab36a1c',
  '4ad539ef-1e16-4c43-9cad-0e3c76b2949b',
  250000, 12500, 5, 'forecast', 'Comissão criada manualmente (teste)'
);

INSERT INTO financial_entries (organization_id, lead_id, type, amount, due_date, status, description)
VALUES (
  'cd868dbb-924d-4e14-9bc8-5d3e67f44c3d',
  'be635892-31ff-402b-8c12-d158bab36a1c',
  'receivable', 250000,
  (CURRENT_DATE + INTERVAL '30 days')::date,
  'pending', 'Venda - Lead Teste Financeiro'
);
```

### Etapa 4: Validar no Dashboard

Após as correções, o dashboard financeiro deve mostrar:
- **Comissões a Pagar:** R$ 12.500 (5% de R$ 250.000)
- **A Receber:** R$ 250.000

## Resumo das Alterações

| Arquivo/Recurso | Alteração |
|-----------------|-----------|
| Migration SQL | Criar função `create_commission_on_won()` |
| Migration SQL | Criar trigger `trigger_create_commission_on_won` |
| Dados | Inserir comissão e receivable para lead de teste |

## Benefícios

1. **Consistência:** Comissões são criadas independente de como o status foi alterado
2. **Automação completa:** Estágios "Ganhos" funcionam end-to-end
3. **Sem duplicatas:** Verificação de existência antes de inserir
