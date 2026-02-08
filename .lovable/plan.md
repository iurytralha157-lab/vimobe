
# Correção do Sistema de Distribuição e Histórico de Leads

## Problemas Identificados

### 1. Fallback Problemático
O lead do Meta foi distribuído pela fila "Webhooks" mesmo que a regra de imóvel não corresponda, pois existe um **fallback** que pega a fila mais antiga quando nenhuma regra casa.

**Código atual em `handle_lead_intake`:**
```sql
IF v_round_robin_id IS NULL THEN
  -- Fallback: find any active queue for the organization
  SELECT * INTO v_queue
  FROM round_robins
  WHERE organization_id = v_lead.organization_id
    AND is_active = true
  ORDER BY created_at ASC  -- ← Pega a mais antiga!
  LIMIT 1;
```

**Regras configuradas:**
| Fila | Imóvel Exigido | Imóvel do Lead |
|------|----------------|----------------|
| Webhooks | `df6d607d...` (sdgsdgd) | `3bdc4ceb...` (Casa alto padrão) ❌ |
| vendas | `cad5ca46...` (Testes) | `3bdc4ceb...` (Casa alto padrão) ❌ |

Como nenhuma regra casou, o fallback selecionou "Webhooks" (a mais antiga).

### 2. Histórico com Múltiplos Eventos Duplicados

O histórico mostra:
- "Estágio alterado de Desconhecido para Base"
- "Atribuído a André Rocha"
- "Atribuído a usuário de teste"
- "Distribuído por Webhooks → usuário de teste"

Isso acontece porque:
1. O lead é criado sem estágio (o meta-webhook não define)
2. A fila aplica `target_stage_id` → gera evento de "estágio alterado"
3. A lógica de distribuição está registrando múltiplos eventos no mesmo timestamp

---

## Soluções Propostas

### Solução 1: Remover Fallback Automático

Se não houver regra que case, o lead NÃO deve ser distribuído automaticamente. Ele deve:
- Ir para o **pool** (bolsão) aguardando atribuição manual
- Ou ser atribuído ao administrador da organização

**Migração SQL:**
```sql
-- Atualizar handle_lead_intake para NÃO ter fallback
-- Se pick_round_robin_for_lead retornar NULL, o lead fica sem responsável
-- e vai aparecer no pool/bolsão aguardando distribuição manual
```

### Solução 2: Consolidar Eventos do Histórico

Evitar duplicação de eventos `assignee_changed` quando a distribuição acontece no mesmo momento da criação.

**Mudanças:**
1. Verificar se já existe evento recente antes de criar novo
2. Marcar o evento principal como `is_initial_distribution: true`
3. Não criar eventos de "atribuição" intermediários durante a cadeia de distribuição

### Solução 3: Corrigir Nomenclatura do Estágio

O lead está sendo movido para o estágio da fila ("Base"), mas como ele não tinha estágio antes, o histórico mostra "Desconhecido" como origem.

**Mudança:**
- Se o estágio anterior era `NULL`, exibir "Lead criado no estágio Base" em vez de "Movido de Desconhecido para Base"

---

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| Migração SQL | Atualizar `handle_lead_intake` para remover fallback |
| `src/hooks/use-lead-full-history.ts` | Melhorar labels para eventos de criação |
| Migração SQL | Ajustar `pick_round_robin_for_lead` para registrar motivo de não-match |

---

## Resultado Esperado

Após as correções:

1. **Sem Fallback**: Leads do Meta (ou qualquer fonte) sem regra de distribuição configurada **não serão distribuídos automaticamente** - ficarão no pool aguardando atribuição
2. **Histórico Limpo**: Apenas um evento de "Lead criado via Meta" + opcionalmente "Distribuído por [fila]" se houver regra
3. **Estágios Corretos**: Se o lead já nasceu no estágio, exibir "Lead criado no estágio X" em vez de "Movido de Desconhecido para X"

---

## Quer que eu implemente?

Posso criar a migração SQL e atualizar os componentes do histórico.
