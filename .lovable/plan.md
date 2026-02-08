
# Correção do Meta Webhook - Campos Inválidos

## Problema Identificado

O lead do Andre (+5522974063927) chegou às 15:11:53 mas **não foi criado** porque a edge function tenta inserir campos que não existem na tabela `leads`:

```
PGRST204: Could not find the 'bairro' column of 'leads' in the schema cache
```

## Campos Problemáticos

| Campo | Existe em `leads`? | Solução |
|-------|-------------------|---------|
| `cargo` | ❌ Não | Mover para `lead_meta.contact_notes` |
| `empresa` | ❌ Não | Mover para `lead_meta.contact_notes` |
| `cidade` | ❌ Não | Mover para `lead_meta.contact_notes` |
| `bairro` | ❌ Não | Mover para `lead_meta.contact_notes` |
| `custom_fields` | ❌ Não | Já está no `raw_payload` |
| `source_detail` | ❌ Não | Já temos `ad_name` no `lead_meta` |
| `campaign_name` | ❌ Não | Já temos `campaign_name` no `lead_meta` |

## Código Morto

Linhas 322-334 ainda referenciam `assignedUserId` que foi removido na refatoração anterior.

---

## Modificações no Arquivo

**Arquivo:** `supabase/functions/meta-webhook/index.ts`

### 1. Simplificar o INSERT do lead (linhas 212-236)

**Remover campos inexistentes:**
- `cargo`, `empresa`, `cidade`, `bairro`
- `custom_fields`, `source_detail`, `campaign_name`

**INSERT corrigido:**
```typescript
const { data: newLead, error: leadError } = await supabase
  .from("leads")
  .insert({
    organization_id: integration.organization_id,
    name,
    email,
    phone,
    message: message || `Lead gerado via Facebook Lead Ads`,
    source: "meta",
    pipeline_id: null,       
    stage_id: null,          
    property_id: propertyId,
    assigned_user_id: null,  
    meta_lead_id: leadgenId,
    meta_form_id: formId,
  })
  .select("id")
  .single();
```

### 2. Adicionar dados extras no lead_meta (linhas 259-273)

Formatar os campos extras como `contact_notes`:

```typescript
// Preparar contact_notes com dados extras
const contactNotesLines = [];
if (cargo) contactNotesLines.push(`Cargo: ${cargo}`);
if (empresa) contactNotesLines.push(`Empresa: ${empresa}`);
if (cidade) contactNotesLines.push(`Cidade: ${cidade}`);
if (bairro) contactNotesLines.push(`Bairro: ${bairro}`);
if (Object.keys(customFields).length > 0) {
  for (const [key, val] of Object.entries(customFields)) {
    contactNotesLines.push(`${key}: ${val}`);
  }
}
const contactNotes = contactNotesLines.length > 0 
  ? contactNotesLines.join('\n') 
  : null;

await supabase
  .from("lead_meta")
  .insert({
    lead_id: newLead.id,
    page_id: pageId,
    form_id: formId,
    ad_id: leadData.ad_id,
    adset_id: leadData.adset_id,
    campaign_id: leadData.campaign_id,
    ad_name: leadData.ad_name || null,
    adset_name: leadData.adset_name || null,
    campaign_name: leadData.campaign_name || null,
    platform: leadData.platform || null,
    contact_notes: contactNotes,  // ← NOVO
    raw_payload: leadData
  });
```

### 3. Remover código morto (linhas 322-334)

Deletar completamente o bloco que tenta notificar `assignedUserId`:

```typescript
// REMOVER ESTE BLOCO:
if (assignedUserId && !admins?.find(a => a.id === assignedUserId)) {
  await supabase
    .from("notifications")
    .insert({...});
}
```

---

## Onde Ficam os Dados

| Dado | Destino Final |
|------|---------------|
| Nome, Email, Phone, Message | `leads` (campos principais) |
| Cargo, Empresa, Cidade, Bairro | `lead_meta.contact_notes` |
| Campos customizados | `lead_meta.raw_payload` |
| Campaign, Ad, Adset | `lead_meta` (campos dedicados) |

---

## Resultado Esperado

Após a correção:
1. ✅ Leads do Meta serão criados com sucesso
2. ✅ Trigger `handle_lead_intake` será acionado
3. ✅ Round Robin fará a distribuição automaticamente
4. ✅ Dados extras ficam em `lead_meta.contact_notes`
5. ✅ Notificações funcionam para admins
