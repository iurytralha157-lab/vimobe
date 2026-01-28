
# Plano: Reformulação do Sistema de Distribuição de Leads

## Visão Geral

Este plano visa transformar o sistema de distribuição de leads para centralizar toda a lógica de roteamento nas **Filas de Distribuição**, removendo a configuração de destino do webhook e implementando um sistema robusto de regras inspirado no C2S.

## Mudanças Principais

### 1. Simplificar Webhooks (Entrada de Leads)
- **Remover** do webhook: Pipeline, Estágio, Equipe destino
- **Manter** no webhook: Nome, Token, Tags, e adicionar **Interesse** (imóvel ou plano)
- Todos os leads entram via webhook de forma "limpa" e a distribuição decide para onde vai

### 2. Melhorar Filas de Distribuição
- Adicionar suporte a **Equipes** nos participantes (não apenas usuários individuais)
- Sistema de **Regras Avançadas** com múltiplas condições:
  - Fonte (Meta, WordPress, WhatsApp, Manual, etc.)
  - Nome da Campanha (contém texto)
  - Tags
  - Cidade
  - Interesse em Imóvel/Plano específico
  - Pipeline de destino
- Configurações de **Horário** por dia da semana
- Configurações **Avançadas** (redistribuição, preservar posição)

### 3. Campo de Interesse no Lead
- Adicionar coluna `interest_property_id` ou `interest_plan_id` na tabela `leads`
- Exibir valor do interesse em verde no card do lead (já existe parcialmente com `valor_interesse`)

---

## Detalhamento Técnico

### Fase 1: Migração de Banco de Dados

**Tabela `leads`:**
```sql
ALTER TABLE leads ADD COLUMN interest_property_id uuid REFERENCES properties(id);
ALTER TABLE leads ADD COLUMN interest_plan_id uuid REFERENCES service_plans(id);
```

**Tabela `round_robin_rules` - Expandir `match` JSONB:**
- O campo `match` (jsonb) já existe e suportará:
```json
{
  "source": ["meta", "wordpress"],
  "campaign_contains": "ALPHAVILLE",
  "tag_in": ["VIP", "Urgente"],
  "city_in": ["São Paulo", "Campinas"],
  "interest_property_id": "uuid-do-imovel",
  "interest_plan_id": "uuid-do-plano",
  "target_pipeline_id": "uuid-pipeline",
  "target_stage_id": "uuid-stage",
  "schedule": {
    "days": [1,2,3,4,5],
    "start": "08:00",
    "end": "18:00"
  }
}
```

**Tabela `round_robins` - Novas configurações:**
```sql
ALTER TABLE round_robins ADD COLUMN target_pipeline_id uuid REFERENCES pipelines(id);
ALTER TABLE round_robins ADD COLUMN target_stage_id uuid REFERENCES stages(id);
ALTER TABLE round_robins ADD COLUMN settings jsonb DEFAULT '{}';
-- settings pode ter: enable_redistribution, preserve_position, schedule, etc.
```

### Fase 2: Atualizar Webhook

**`supabase/functions/generic-webhook/index.ts`:**
1. Remover lógica de `target_pipeline_id`, `target_stage_id`, `target_team_id`
2. Adicionar suporte a `interest_property_id` ou `interest_plan_id` no payload
3. Lead entra sem pipeline/stage definido - a distribuição define
4. Manter tags configuradas no webhook

**Novo fluxo:**
```
Webhook recebe lead → Salva lead (sem pipeline) → Trigger chama handle_lead_intake → 
Regras de distribuição avaliam → Fila matched → Atribui usuário + define pipeline/stage
```

### Fase 3: Refatorar `handle_lead_intake` (RPC)

**Nova lógica:**
1. Buscar todas as filas ativas da organização
2. Para cada fila, avaliar regras em ordem de prioridade
3. Verificar condições do `match` JSONB:
   - Fonte combina?
   - Campanha contém texto?
   - Lead tem alguma das tags?
   - Cidade combina?
   - Interesse em imóvel/plano específico?
   - Horário atual está dentro do schedule?
4. Primeira fila que combinar → Atribuir lead
5. Definir `pipeline_id` e `stage_id` da fila no lead
6. Fallback: fila padrão sem regras

### Fase 4: Interface de Criação/Edição de Fila

**Componente: `DistributionQueueEditor.tsx`**

Layout em seções expansíveis (como nas imagens C2S):

**Seção 1 - Informações Básicas:**
- Nome da fila
- Pipeline de destino
- Estágio inicial

**Seção 2 - Regras de Entrada:**
- Botão "+ Nova condição"
- Cada condição:
  - Tipo (Fonte, Campanha, Tag, Cidade, Interesse, etc.)
  - Operador (É igual, Contém, etc.)
  - Valor(es) - multi-select quando aplicável
- Múltiplas condições com "E TAMBÉM"
- Alerta: "Se nenhum critério for selecionado, qualquer lead poderá ser distribuído nessa fila!"

**Seção 3 - Configurações de Horário:**
- Toggle "Fila ativa todos os dias (24/7)"
- Grid de dias da semana com horário início/fim
- Toggle "Usuários devem realizar Check-in?"

**Seção 4 - Usuários Ativos na Fila:**
- Buscar usuário ou **Adicionar Equipe**
- Lista com drag-and-drop para ordenar
- Peso/percentual para distribuição ponderada
- Contador de leads recebidos

**Seção 5 - Configurações Avançadas:**
- Toggle "Ativar redistribuição?" (com explicação)
- Toggle "Permitir marcar presença após fechamento do Check-in?"
- Toggle "Preservar posição na fila quando usuário estiver temporariamente indisponível?"

### Fase 5: Webhook Simplificado

**Nova interface `WebhooksTab.tsx`:**
- Nome do webhook
- Tipo (Entrada)
- **Interesse** - Selector de Imóvel ou Plano (exibe valor)
- Tags a aplicar
- Token/URL

Remove:
- Pipeline destino
- Estágio destino
- Equipe destino

### Fase 6: Card do Lead

**Atualizar `LeadCard.tsx`:**
- Já exibe `valorInteresse` em laranja/verde
- Adicionar lógica para buscar preço do `interest_property_id` ou `interest_plan_id`
- Tooltip mostrando nome do imóvel/plano

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | Adicionar colunas em `leads`, `round_robins` |
| `generic-webhook/index.ts` | Simplificar, adicionar interest |
| `handle_lead_intake` (RPC) | Nova lógica de matching com JSONB |
| `pick_round_robin_for_lead` (RPC) | Avaliar campo `match` JSONB |
| `DistributionTab.tsx` | Nova UI de criação/edição |
| `EditQueueDialog.tsx` | Adicionar suporte a equipes |
| `RuleEditor.tsx` | Expandir condições disponíveis |
| `RulesManager.tsx` | UI para múltiplas condições |
| `WebhooksTab.tsx` | Remover destinos, adicionar interesse |
| `LeadCard.tsx` | Exibir interesse do imóvel/plano |
| `use-round-robins.ts` | Carregar novas colunas |
| `use-round-robin-rules.ts` | Trabalhar com `match` JSONB |

---

## Fluxo Final

```text
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Webhook   │────▶│  Lead criado │────▶│ handle_lead_     │
│ (simples)   │     │ (sem assign) │     │ intake trigger   │
└─────────────┘     └──────────────┘     └────────┬─────────┘
                                                  │
                    ┌─────────────────────────────▼──────────┐
                    │     Avaliar Filas de Distribuição      │
                    │  ┌───────────────────────────────────┐ │
                    │  │ Fila 1: Leads Facebook            │ │
                    │  │ Regras: source=meta, city=SP      │ │
                    │  │ Pipeline: Vendas, Stage: Novo     │ │
                    │  │ Membros: Equipe Sul               │ │
                    │  └───────────────────────────────────┘ │
                    │  ┌───────────────────────────────────┐ │
                    │  │ Fila 2: Leads WhatsApp            │ │
                    │  │ Regras: source=whatsapp           │ │
                    │  │ Pipeline: Atendimento             │ │
                    │  │ Membros: João, Maria              │ │
                    │  └───────────────────────────────────┘ │
                    │  ┌───────────────────────────────────┐ │
                    │  │ Fila Padrão (sem regras)          │ │
                    │  │ Fallback para leads não matched   │ │
                    │  └───────────────────────────────────┘ │
                    └────────────────────────────────────────┘
                                         │
                    ┌────────────────────▼───────────────────┐
                    │  Lead atribuído + Pipeline/Stage set   │
                    │  Notificação enviada ao responsável    │
                    └────────────────────────────────────────┘
```

---

## Considerações

1. **Backward Compatibility**: Webhooks existentes com pipeline/stage configurado continuarão funcionando até serem migrados
2. **Migração Gradual**: Novo campo `target_pipeline_id` na fila terá precedência sobre o webhook
3. **Interesse no Card**: Voltará a exibir o valor em destaque como era antes
4. **Equipes como Participantes**: Ao selecionar uma equipe, todos os membros ativos entram na distribuição
