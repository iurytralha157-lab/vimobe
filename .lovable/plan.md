
# Plano: Seletor de Pipeline + Etapa no Follow-up Builder

## Problema Identificado

Atualmente o seletor de **"Etapa específica"** mostra todas as etapas de **todas as pipelines** misturadas. Isso causa confusão quando existem múltiplas pipelines (ex: Imobiliário e Telecom), pois etapas com nomes iguais de pipelines diferentes aparecem juntas sem distinção.

---

## Solução

Adicionar um seletor de **Pipeline** antes do seletor de **Etapa**, criando um fluxo hierárquico:

```text
┌──────────────────────────────────────────────┐
│ DISPARAR QUANDO                              │
│ ┌──────────────────────────────────────────┐│
│ │ Mudou de etapa                      ▼    ││
│ └──────────────────────────────────────────┘│
│                                              │
│ PIPELINE  ← NOVO CAMPO                      │
│ ┌──────────────────────────────────────────┐│
│ │ Selecione a pipeline...            ▼     ││
│ │  • Pipeline Imobiliário                  ││
│ │  • Pipeline Telecom                      ││
│ └──────────────────────────────────────────┘│
│                                              │
│ ETAPA ESPECÍFICA                            │
│ ┌──────────────────────────────────────────┐│
│ │ Selecione a etapa...               ▼     ││
│ │  • Novo         (filtrado pela pipeline) ││
│ │  • Proposta                              ││
│ │  • Ganho                                 ││
│ └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

---

## Alterações Técnicas

### Arquivo: `src/components/automations/FollowUpBuilder.tsx`

1. **Importar hook de pipelines:**
   ```typescript
   import { useStages, usePipelines } from '@/hooks/use-stages';
   ```

2. **Adicionar estado para pipeline selecionada:**
   ```typescript
   const [pipelineId, setPipelineId] = useState<string>('');
   const { data: pipelines } = usePipelines();
   ```

3. **Atualizar useStages para filtrar por pipeline:**
   ```typescript
   const { data: stages } = useStages(pipelineId || undefined);
   ```

4. **Limpar etapa quando pipeline muda:**
   ```typescript
   useEffect(() => {
     setStageId('');
   }, [pipelineId]);
   ```

5. **Adicionar seletor de pipeline antes da etapa:**
   ```typescript
   {triggerType === 'lead_stage_changed' && (
     <>
       <div className="space-y-2">
         <Label>Pipeline</Label>
         <Select value={pipelineId} onValueChange={setPipelineId}>
           ...pipelines
         </Select>
       </div>
       
       {pipelineId && (
         <div className="space-y-2">
           <Label>Etapa específica</Label>
           <Select value={stageId} onValueChange={setStageId}>
             ...stages (já filtrados pela pipeline)
           </Select>
         </div>
       )}
     </>
   )}
   ```

6. **Atualizar validação:**
   ```typescript
   if (triggerType === 'lead_stage_changed' && !pipelineId) {
     toast.error('Selecione uma pipeline');
     return;
   }
   ```

7. **Salvar pipeline_id no trigger_config:**
   ```typescript
   trigger_config: triggerType === 'lead_stage_changed'
     ? { pipeline_id: pipelineId, to_stage_id: stageId }
     : ...
   ```

---

## Resultado Esperado

| Passo | Campo | Ação |
|-------|-------|------|
| 1 | Disparar quando | Seleciona "Mudou de etapa" |
| 2 | Pipeline | Aparece seletor → escolhe "Pipeline Imobiliário" |
| 3 | Etapa específica | Aparece seletor com apenas etapas da pipeline selecionada |
| 4 | Salvar | Automação vinculada à pipeline + etapa corretas |

---

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/automations/FollowUpBuilder.tsx` | Adicionar estado pipelineId, importar usePipelines, seletores encadeados e validação |
