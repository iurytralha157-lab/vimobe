
# Plano: Interesse de Imóvel Dinâmico via Webhook

## Resumo

Atualmente, o interesse do lead (imóvel ou plano) é configurado **fixo** no webhook. Você quer que quando enviar `property_id` no payload (ex: `"property_id": "AP0004"`), o sistema automaticamente encontre o imóvel pelo código e associe ao lead.

**Mudanças necessárias:**

1. **Webhook**: Processar `property_id` dinâmico do payload
2. **Pipeline**: Exibir o interesse do imóvel no card do lead

---

## O Que Vai Mudar

### 1. Webhook - Processar `property_id` Dinâmico

Quando receber um payload assim:
```json
{
  "name": "João Silva",
  "phone": "11999999999",
  "property_id": "AP0004"
}
```

O webhook vai:
1. Verificar se `property_id` está no payload
2. Buscar o imóvel pelo **código** (AP0004) OU pelo **UUID**
3. Se encontrar, associar o `interest_property_id` ao lead
4. Prioridade: payload > configuração fixa do webhook

### 2. Card do Pipeline - Mostrar Interesse

O card do lead no Kanban vai exibir:
- Nome/código do imóvel de interesse
- Valor do imóvel (badge verde)

---

## Seção Técnica

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/generic-webhook/index.ts` | Buscar imóvel por código/UUID antes de criar lead |
| `src/hooks/use-stages.ts` | Incluir `interest_property_id` e join com `properties` |

### Lógica do Webhook (generic-webhook)

```text
┌─────────────────────────────────────────────────────────┐
│ Payload recebido: { "property_id": "AP0004", ... }      │
├─────────────────────────────────────────────────────────┤
│ 1. Verificar se property_id está no payload            │
│                                                         │
│ 2. Se sim:                                              │
│    a) Tentar buscar por UUID direto                     │
│    b) Se não encontrar, buscar por código               │
│                                                         │
│ 3. Se encontrou imóvel:                                 │
│    → interest_property_id = imóvel.id                   │
│                                                         │
│ 4. Se não encontrou mas webhook tem config fixa:        │
│    → interest_property_id = webhook.field_mapping       │
└─────────────────────────────────────────────────────────┘
```

### Query do Pipeline (use-stages.ts)

Atualizar `LEAD_PIPELINE_FIELDS`:
```sql
-- Campos atuais
id, name, phone, email, source, ...

-- Adicionar
interest_property_id,
interest_plan_id,
interest_property:properties!leads_interest_property_id_fkey(id, code, title, preco),
interest_plan:service_plans!leads_interest_plan_id_fkey(id, code, name, price)
```

### Fluxo Completo

```text
1. Webhook recebe payload com property_id: "AP0004"
   ↓
2. Busca imóvel: SELECT id FROM properties WHERE code = 'AP0004' AND organization_id = X
   ↓
3. Cria lead com interest_property_id = imóvel encontrado
   ↓
4. Pipeline busca lead com JOIN em properties
   ↓
5. Card mostra: "AP0004 - Apartamento" + "R$450K"
```

---

## Resultado Final

**Antes:**
- Interesse de imóvel fixo por webhook
- Card não mostrava interesse dinâmico

**Depois:**
- Payload pode enviar `property_id` (código ou UUID)
- Sistema busca e associa automaticamente
- Card exibe o imóvel/plano de interesse com valor
