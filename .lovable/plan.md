

# Plano: Adicionar Deduplicação por Telefone no Meta Webhook

## Problema Identificado

O `meta-webhook` atualmente deduplica leads **apenas** pelo `meta_lead_id` (ID do formulário do Facebook). Porém, não verifica se já existe um lead com o **mesmo telefone** na organização.

### Exemplo real encontrado no banco:

```text
Lead 1: "FERNANDO ULLYAN" | +55 61 9104-9018 | source: webhook  | 23:22:45.237
Lead 2: "FERNANDO ULLYAN" | +55 61 9104-9018 | source: meta     | 23:22:45.674
                                                                   ↑ 0.4s depois!
```

O mesmo contato entrou por dois canais quase simultaneamente, criando dois cards no Kanban.

### Comparação entre os webhooks:

| Webhook | Deduplica por meta_lead_id | Deduplica por telefone | Faz reentrada |
|---------|---------------------------|----------------------|---------------|
| `generic-webhook` | N/A | Sim | Sim |
| `evolution-webhook` | N/A | Sim | Sim |
| `meta-webhook` | Sim | **Nao** | **Nao** |

## Solucao

Adicionar a mesma lógica de deduplicação por telefone que já existe no `generic-webhook` ao `meta-webhook`. Quando um lead com o mesmo telefone já existir, fazer **reentrada** (atualizar o lead existente + registrar no histórico) em vez de criar um novo.

## Arquivo a Modificar

### `supabase/functions/meta-webhook/index.ts`

Após o parse dos campos (linha ~211), antes da verificação por `meta_lead_id`, adicionar verificação por telefone:

```text
FLUXO ATUAL:
  Parse campos → Verifica meta_lead_id → Cria lead novo

FLUXO NOVO:
  Parse campos → Verifica meta_lead_id → Verifica telefone → 
    Se telefone existe: Reentrada (atualiza lead + histórico)
    Se nao existe: Cria lead novo
```

### Lógica de reentrada (similar ao generic-webhook):

1. Buscar leads da organização com telefone normalizado
2. Se encontrar lead existente:
   - Atualizar dados (nome, email, mensagem)
   - Resetar `deal_status` para "open"
   - Atualizar `stage_entered_at` para priorizar no Kanban
   - Registrar atividade de reentrada no histórico
   - Registrar evento na timeline ("Lead reenviado via Meta Ads")
   - Aplicar auto-tags do form config
   - Atualizar contadores de leads
   - **Nao** criar lead novo
3. Se nao encontrar: seguir fluxo normal (criar lead novo)

### Normalização de telefone:

O Meta envia telefones em formatos variados (`+55 61 9104-9018`, `5561991049018`, etc.). A normalização vai:
- Remover caracteres não numéricos
- Remover prefixo `55` se tiver 12+ dígitos
- Comparar o resultado com os telefones existentes

## Secao Tecnica

### Mudancas no codigo (`supabase/functions/meta-webhook/index.ts`):

**Apos linha 211** (fim do parse de campos), adicionar bloco de deduplicação por telefone:

```typescript
// ===== DEDUPLICAÇÃO POR TELEFONE =====
if (phone) {
  const normalizedPhone = phone.replace(/\D/g, '');
  const phoneWithoutCountry = normalizedPhone.length >= 12 && normalizedPhone.startsWith('55')
    ? normalizedPhone.substring(2)
    : normalizedPhone;

  const { data: allLeads } = await supabase
    .from('leads')
    .select('id, phone, stage_id, pipeline_id, assigned_user_id, deal_status')
    .eq('organization_id', integration.organization_id)
    .not('phone', 'is', null);

  const existingByPhone = allLeads?.find(l => {
    if (!l.phone) return false;
    const lp = l.phone.replace(/\D/g, '');
    const lpClean = lp.length >= 12 && lp.startsWith('55') ? lp.substring(2) : lp;
    return lpClean === phoneWithoutCountry || lp === normalizedPhone;
  });

  if (existingByPhone) {
    // REENTRADA: atualizar lead existente + histórico
    // (detalhado abaixo)
    continue; // Não cria lead novo
  }
}
```

**O bloco de reentrada inclui:**

1. Update do lead existente com dados novos
2. Insert em `activities` com tipo `lead_reentry`
3. Insert em `lead_timeline_events` com título "Lead reenviado via Meta Ads"
4. Gravar `meta_lead_id` e `meta_form_id` no lead existente (para deduplicação futura)
5. Aplicar auto-tags do form config
6. Atualizar contadores da integração e form config

### Ordem de verificação final:

```text
1. Verifica meta_lead_id (exato mesmo formulário enviado 2x)
2. Verifica telefone normalizado (mesmo contato, fonte diferente)
3. Se nenhum match: cria lead novo
```

