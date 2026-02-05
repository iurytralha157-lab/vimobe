
# Plano: Integrar Redistribuição com Tempo de Resposta

## Contexto Atual

### Sistema de Redistribuição (Pool)
- Usa a coluna `first_touch_at` para determinar se houve contato
- A Edge Function `pool-checker` busca leads sem `first_touch_at` após timeout
- A função SQL `redistribute_lead_from_pool` redistribui via `handle_lead_intake`

### Sistema de Tempo de Resposta  
- Usa `first_response_at` com métricas detalhadas (segundos, canal, usuário)
- Gatilhos: WhatsApp (automático), Telefone (clique), Email (clique)
- Edge Function `calculate-first-response` registra idempotentemente

### Problema Identificado
Os dois sistemas usam colunas diferentes, criando desconexão:
- `first_touch_at` - usado pelo Pool (antigo)
- `first_response_at` - usado pelas métricas (novo)

---

## Solução Proposta

Unificar os sistemas para que a **Redistribuição use o Tempo de Resposta** como critério:

```text
Lead chega → Distribuído → Timer inicia
         ↓
     Corretor age? (Ligação/Mensagem/Email)
         ↓               ↓
        SIM             NÃO (timeout)
         ↓               ↓
first_response_at    Redistribui!
   é registrado
```

---

## Alterações Técnicas

### 1. Atualizar Edge Function `pool-checker`

Mudar a verificação de `first_touch_at` para `first_response_at`:

```typescript
// ANTES (atual)
.is("first_touch_at", null)

// DEPOIS (proposto)
.is("first_response_at", null)
```

O `first_response_at` já é preenchido automaticamente quando:
- Corretor envia mensagem WhatsApp
- Corretor clica em "Ligar" 
- Corretor clica em "Email"

### 2. Atualizar Interface do PoolTab

Melhorar a UX para deixar claro que a redistribuição é baseada no primeiro contato:

- Renomear "Aguardando Contato" para descrição mais clara
- Adicionar indicador visual dos canais monitorados (WhatsApp, Telefone, Email)
- Mostrar qual canal disparou o first_response quando houver

### 3. Manter Compatibilidade

A Edge Function `calculate-first-response` já atualiza `first_touch_at` junto com `first_response_at` para ações humanas (não-automação), garantindo retrocompatibilidade:

```typescript
// Código existente em calculate-first-response
if (!is_automation && actor_user_id) {
  updateData.first_touch_at = now.toISOString();
  // ...
}
```

### 4. Sincronizar Dados Legados (Opcional)

Criar migração que sincroniza leads antigos:
```sql
UPDATE leads 
SET first_response_at = first_touch_at
WHERE first_touch_at IS NOT NULL 
  AND first_response_at IS NULL;
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/pool-checker/index.ts` | Trocar `.is("first_touch_at", null)` por `.is("first_response_at", null)` |
| `src/components/crm-management/PoolTab.tsx` | Atualizar query para usar `first_response_at` e melhorar UI |
| Nova migração SQL | Sincronizar dados legados e garantir consistência |

---

## Fluxo Final Simplificado

```text
┌──────────────┐    ┌─────────────────┐    ┌────────────────┐
│  Lead Chega  │───→│  Distribuição   │───→│  Timer Inicia  │
│              │    │  (Round Robin)  │    │  assigned_at   │
└──────────────┘    └─────────────────┘    └───────┬────────┘
                                                   │
                    ┌──────────────────────────────┼────────────────────────────────┐
                    │                              │                                │
                    ▼                              ▼                                ▼
           ┌───────────────┐            ┌───────────────┐              ┌───────────────┐
           │   WhatsApp    │            │    Telefone   │              │     Email     │
           │   Enviado     │            │   (clique)    │              │   (clique)    │
           └───────┬───────┘            └───────┬───────┘              └───────┬───────┘
                   │                            │                              │
                   └────────────────────────────┼──────────────────────────────┘
                                                │
                                                ▼
                                   ┌───────────────────────┐
                                   │  first_response_at    │
                                   │  é preenchido         │
                                   │  (para timer)         │
                                   └───────────────────────┘
                                                │
                         ┌──────────────────────┴──────────────────────┐
                         │                                             │
                         ▼                                             ▼
              ┌─────────────────────┐                      ┌─────────────────────┐
              │  Dentro do timeout  │                      │  Excedeu timeout    │
              │  Lead permanece     │                      │  + sem resposta     │
              └─────────────────────┘                      └──────────┬──────────┘
                                                                      │
                                                                      ▼
                                                           ┌─────────────────────┐
                                                           │  REDISTRIBUI        │
                                                           │  via Round Robin    │
                                                           └─────────────────────┘
```

---

## Benefícios

1. **Unificação**: Um único campo (`first_response_at`) para métricas e redistribuição
2. **Precisão**: Apenas ações reais do corretor contam (não automações se configurado)
3. **Métricas Ricas**: Saber exatamente qual canal e quanto tempo levou
4. **Simplicidade**: Menos campos para gerenciar no banco

---

## Observação Importante

O campo `first_response_at` diferencia entre ações humanas e automações via flag `first_response_is_automation`. Se o pipeline estiver configurado para **não contar automações**, apenas ações manuais do corretor param o timer de redistribuição.
