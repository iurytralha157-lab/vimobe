
# Plano: Integração Meta Lead Ads com Gestão CRM (Round Robin)

## Resumo Executivo

Modificar o fluxo de leads do Meta para que **toda distribuição passe pelo sistema de Gestão CRM (Round Robin)**, removendo as opções de destino direto (pipeline, etapa, atribuição) do formulário Meta e delegando essas decisões às Filas de Distribuição.

## O Que Muda

### Antes (Atual)
- Formulário Meta define: pipeline, etapa, status, usuário atribuído, imóvel, tags, mapeamento
- Lead é criado JÁ com pipeline/stage/assigned_user definidos

### Depois (Novo)
- Formulário Meta define: **apenas** imóvel, tags e mapeamento de campos
- Lead é criado **SEM** pipeline/stage/assigned_user
- Trigger `handle_lead_intake` é acionado automaticamente
- A função `pick_round_robin_for_lead` avalia as regras e escolhe a fila correta
- A fila define pipeline, stage e usuário responsável

## Arquitetura do Fluxo

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. Lead chega via Meta Webhook                                             │
│  2. meta-webhook busca config do formulário (imóvel, tags, mapeamento)      │
│  3. Cria lead SEM pipeline/stage/assigned (source=meta, meta_form_id=X)     │
│  4. Trigger AFTER INSERT dispara handle_lead_intake()                       │
│  5. pick_round_robin_for_lead() avalia regras:                              │
│     - Fonte = "meta"?                                                       │
│     - Formulário Meta = X?                                                  │
│     - Campanha contém "Y"?                                                  │
│     - Tag?                                                                  │
│  6. Fila escolhida define pipeline/stage e atribui usuário                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Arquivos a Modificar

### 1. Edge Function `meta-webhook`
**Arquivo:** `supabase/functions/meta-webhook/index.ts`

**Modificações:**
- Remover leitura de `pipeline_id`, `stage_id`, `assigned_user_id` do formConfig/integration
- Criar lead apenas com: name, email, phone, source="meta", meta_form_id, property_id, custom_fields
- Manter: aplicação de tags automáticas, criação de `lead_meta` com tracking data
- O trigger `handle_lead_intake` cuida da distribuição

### 2. Dialog de Configuração do Formulário
**Arquivo:** `src/components/integrations/MetaFormConfigDialog.tsx`

**Modificações:**
- Remover seção "Destino do Lead" (pipeline, etapa, status, atribuição)
- Manter: Vincular Imóvel, Tags Automáticas, Mapeamento de Campos
- Tornar save não obrigatório ter pipeline/stage
- Adicionar nota explicativa sobre distribuição via Gestão

### 3. Tipos e Hooks
**Arquivo:** `src/hooks/use-meta-forms.ts`

**Modificações:**
- Remover campos obrigatórios `pipelineId`, `stageId` do `useSaveFormConfig`
- Atualizar interface para refletir que esses campos são opcionais/legados

### 4. Exibição na Gestão CRM
**Novo recurso no editor de filas**

O `DistributionQueueEditor.tsx` já suporta o tipo de condição `meta_form`:
- Já lista formulários configurados (`metaFormConfigs`)
- Já permite selecionar múltiplos formulários como filtro
- **Porém:** Só mostra formulários com `is_active = true`

**Modificação necessária:**
- Mostrar TODOS os formulários da página conectada (configurados ou não)
- Indicar visualmente quais estão configurados vs não configurados
- Formulários não configurados ainda podem ser usados como filtro (só não terão mapeamento/tags)

### 5. Exibição de Formulários na Gestão
**Arquivo:** `src/components/round-robin/DistributionQueueEditor.tsx`

**Modificações:**
- Buscar formulários diretamente da API Meta (não apenas configs salvos)
- Exibir formulários com indicador: ✓ Configurado / ⚠ Não configurado
- Adicionar link rápido para configurar formulário (abre página Meta Settings)

### 6. Função SQL (Já Suportada)
**Não precisa de modificação!**

A função `pick_round_robin_for_lead` já suporta:
```sql
IF v_match ? 'meta_form_id' THEN
  IF v_lead.form_id IS NULL OR NOT (
    v_lead.form_id = ANY(ARRAY(SELECT jsonb_array_elements_text(v_match->'meta_form_id')))
  ) THEN
    CONTINUE;
  END IF;
END IF;
```

**Porém:** A query busca `form_id` do `lead_meta`, não do `leads.meta_form_id`. Isso pode precisar de ajuste se o join não estiver pegando corretamente.

## Detalhes Técnicos

### Edge Function (meta-webhook)

```typescript
// ANTES:
const pipelineId = formConfig?.pipeline_id || integration.pipeline_id;
const stageId = formConfig?.stage_id || integration.stage_id;
const assignedUserId = formConfig?.assigned_user_id || integration.assigned_user_id;

// DEPOIS:
// Não definir pipeline/stage/assigned - deixar para o Round Robin
const propertyId = formConfig?.property_id || null;
const autoTags = formConfig?.auto_tags || [];
const fieldMapping = formConfig?.field_mapping || {};

// Na criação do lead:
.insert({
  // ... campos básicos
  source: "meta",
  pipeline_id: null,      // Round Robin vai definir
  stage_id: null,         // Round Robin vai definir  
  assigned_user_id: null, // Round Robin vai definir
  property_id: propertyId,
  meta_lead_id: leadgenId,
  meta_form_id: formId,   // Importante para matching nas regras!
  // ...
})
```

### Dialog Simplificado

Remover a seção com Pipeline/Etapa/Status/Atribuição. Layout final:

1. **Vincular Imóvel** - Busca e seleciona imóvel
2. **Tags Automáticas** - Seletor de tags inline
3. **Mapeamento de Campos** - Mapear campos do formulário para campos do lead

Adicionar texto informativo:
> "A distribuição do lead será feita automaticamente pelas Filas de Distribuição configuradas em Gestão CRM"

### Formulários na Gestão

No editor de condições `meta_form`, buscar:
1. Formulários da API Meta (via integração conectada)
2. Configs salvos para saber quais estão "configurados"

Exibir:
```
📝 Formulário A          ✓ Configurado
📝 Formulário B          ⚠ Não configurado [Configurar →]
📝 Formulário C          ✓ Configurado
```

## Sequência de Implementação

1. **Atualizar Edge Function `meta-webhook`**
   - Remover atribuição direta de pipeline/stage/assigned
   - Manter property_id, tags, field_mapping

2. **Simplificar `MetaFormConfigDialog`**
   - Remover seção "Destino do Lead"
   - Atualizar validação (não exigir pipeline/stage)
   - Adicionar nota sobre Gestão CRM

3. **Atualizar `useSaveFormConfig`**
   - Tornar pipelineId/stageId opcionais
   - Remover defaultStatus e assignedUserId da interface

4. **Melhorar seletor de formulários na Gestão**
   - Mostrar todos os formulários (não só configurados)
   - Indicador visual de status
   - Link para configurar

5. **Verificar função SQL**
   - Garantir que `meta_form_id` está sendo capturado corretamente
   - Ajustar join com `lead_meta` se necessário

## Benefícios

- **Centralização**: Toda distribuição passa pela Gestão CRM
- **Consistência**: Mesmo padrão de webhooks, WhatsApp, site
- **Flexibilidade**: Regras complexas de distribuição por campanha, formulário, horário
- **Visibilidade**: Filas de distribuição mostram todos os critérios
- **Simplicidade**: Configuração do formulário é apenas para mapeamento/enriquecimento

## Notas Importantes

- Leads existentes com pipeline/stage definidos pelo Meta não serão afetados
- Formulários sem configuração ainda funcionam (mapeamento automático de campos)
- A tabela `meta_form_configs` manterá as colunas legadas (`pipeline_id`, etc.) para compatibilidade
