

# Plano: Adicionar Seletor de Etapa no Follow-up Builder

## Problema Identificado

Na tela de criação de Follow-up, quando você seleciona **"Mudou de etapa"** como gatilho, não aparece um campo para escolher **qual etapa específica** vai disparar a automação.

Atualmente só existe tratamento para "Tag adicionada":
```
if (triggerType === 'tag_added') → mostra seletor de TAG
if (triggerType === 'lead_stage_changed') → NÃO mostra nada ❌
```

---

## Solução

Adicionar um seletor de **"Etapa específica"** que aparece quando o gatilho é "Mudou de etapa", similar ao que já existe para tags.

---

## Fluxo Corrigido

```text
┌──────────────────────────────────────────────┐
│ DISPARAR QUANDO                              │
│ ┌──────────────────────────────────────────┐│
│ │ Mudou de etapa                      ▼    ││
│ └──────────────────────────────────────────┘│
│                                              │
│ ETAPA ESPECÍFICA  ← NOVO CAMPO              │
│ ┌──────────────────────────────────────────┐│
│ │ Selecione a etapa...               ▼     ││
│ │  • Novo                                  ││
│ │  • Em atendimento                        ││
│ │  • Qualificado                           ││
│ │  • Proposta                              ││
│ │  • Ganho                                 ││
│ │  • Perdido                               ││
│ └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

---

## Alterações Técnicas

### Arquivo: `src/components/automations/FollowUpBuilder.tsx`

1. **Importar hook de estágios:**
   ```typescript
   import { useStages } from '@/hooks/use-stages';
   ```

2. **Adicionar estado para etapa selecionada:**
   ```typescript
   const [stageId, setStageId] = useState<string>('');
   const { data: stages } = useStages();
   ```

3. **Adicionar seletor condicional após o seletor de tags (linha ~460):**
   ```typescript
   {triggerType === 'lead_stage_changed' && (
     <div className="space-y-2">
       <Label className="text-xs font-semibold uppercase text-muted-foreground">
         Etapa específica
       </Label>
       <Select value={stageId} onValueChange={setStageId}>
         <SelectTrigger>
           <SelectValue placeholder="Selecione a etapa..." />
         </SelectTrigger>
         <SelectContent>
           {stages?.map((stage) => (
             <SelectItem key={stage.id} value={stage.id}>
               <div className="flex items-center gap-2">
                 <div 
                   className="w-3 h-3 rounded-full" 
                   style={{ backgroundColor: stage.color || '#888' }}
                 />
                 {stage.name}
               </div>
             </SelectItem>
           ))}
         </SelectContent>
       </Select>
     </div>
   )}
   ```

4. **Atualizar validação no handleSave (linha ~262):**
   ```typescript
   if (triggerType === 'lead_stage_changed' && !stageId) {
     toast.error('Selecione uma etapa para o gatilho');
     return;
   }
   ```

5. **Atualizar trigger_config no save (linha ~281):**
   ```typescript
   trigger_config: 
     triggerType === 'tag_added' 
       ? { tag_id: tagId } 
       : triggerType === 'lead_stage_changed'
         ? { to_stage_id: stageId }
         : {},
   ```

6. **Atualizar config do nó trigger (linha ~300):**
   ```typescript
   config: { 
     trigger_type: triggerType, 
     tag_id: tagId,
     to_stage_id: stageId,
   },
   ```

---

## Resultado Esperado

| Gatilho Selecionado | Campo Adicional |
|---------------------|-----------------|
| Tag adicionada | Seletor de TAG com cor |
| Mudou de etapa | Seletor de ETAPA com cor |
| Lead criado | Nenhum |
| Manual | Nenhum |

---

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/automations/FollowUpBuilder.tsx` | Adicionar import, estado, seletor e validação para etapa |

