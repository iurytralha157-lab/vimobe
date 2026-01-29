
# Diagnóstico: Leads do Guilherme não aparecem no Pipeline

## Problema Identificado

Os leads do Guilherme estão visíveis na página de **Contatos**, mas não aparecem no **Pipeline** (Kanban).

**Causa raiz**: 17 dos 18 leads do Guilherme estão com `pipeline_id = NULL` e `stage_id = NULL`. O Kanban filtra por pipeline selecionado, então leads sem pipeline nunca aparecem lá.

### Evidência dos dados:

| Métrica | Guilherme | Total Sistema |
|---------|-----------|---------------|
| Total de leads | 18 | 138 |
| Leads sem pipeline | 17 | 58 |
| Leads sem stage | 17 | 58 |

Todos os 58 leads sem pipeline foram criados via `source: webhook`.

---

## Plano de Correção

### Parte 1: Correção Imediata dos Dados

Executar SQL para atribuir o pipeline e stage padrão para todos os leads órfãos:

```sql
-- Atribuir pipeline e stage padrão para leads sem pipeline
WITH default_pipeline AS (
  SELECT p.id as pipeline_id, s.id as stage_id
  FROM pipelines p
  JOIN stages s ON s.pipeline_id = p.id
  WHERE p.is_default = true
  ORDER BY s.position
  LIMIT 1
)
UPDATE leads
SET 
  pipeline_id = (SELECT pipeline_id FROM default_pipeline),
  stage_id = (SELECT stage_id FROM default_pipeline),
  stage_entered_at = COALESCE(stage_entered_at, created_at)
WHERE pipeline_id IS NULL
  AND (SELECT pipeline_id FROM default_pipeline) IS NOT NULL;
```

### Parte 2: Correção no Webhook (Prevenção)

Atualizar o webhook `generic-webhook/index.ts` para garantir que **sempre** atribua um pipeline e stage padrão quando criar um lead, mesmo que não venham especificados no payload.

Mudança necessária:
- Antes de inserir o lead, buscar o pipeline padrão da organização
- Buscar o primeiro stage (menor `position`) desse pipeline
- Atribuir esses valores ao lead se `pipeline_id` ou `stage_id` não forem fornecidos

### Parte 3: Correção Alternativa via Trigger (Mais Robusta)

Criar um trigger no banco de dados para garantir que nenhum lead seja criado sem pipeline/stage:

```sql
CREATE OR REPLACE FUNCTION ensure_lead_has_pipeline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pipeline_id IS NULL THEN
    SELECT p.id, s.id INTO NEW.pipeline_id, NEW.stage_id
    FROM pipelines p
    JOIN stages s ON s.pipeline_id = p.id
    WHERE p.organization_id = NEW.organization_id
      AND p.is_default = true
    ORDER BY s.position
    LIMIT 1;
  ELSIF NEW.stage_id IS NULL THEN
    SELECT id INTO NEW.stage_id
    FROM stages
    WHERE pipeline_id = NEW.pipeline_id
    ORDER BY position
    LIMIT 1;
  END IF;
  
  IF NEW.stage_entered_at IS NULL THEN
    NEW.stage_entered_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_ensure_lead_pipeline
BEFORE INSERT ON leads
FOR EACH ROW
EXECUTE FUNCTION ensure_lead_has_pipeline();
```

---

## Resumo da Implementação

| Etapa | Ação | Impacto |
|-------|------|---------|
| 1 | Migração SQL para corrigir leads existentes | Imediato - leads aparecem no Pipeline |
| 2 | Trigger no banco | Previne leads órfãos no futuro |

Após a correção, todos os leads do Guilherme (e de outros usuários) que estavam órfãos aparecerão no estágio inicial do pipeline padrão (provavelmente "Contato inicial").
