

## Padronizar Dialogs do Projeto

Aplicar o padrao visual consistente em todos os dialogs que ainda nao foram atualizados: `w-[90%] sm:w-full rounded-lg` no DialogContent e botoes com `rounded-xl` e proporcao 40/60 (Cancelar/Acao).

---

### Arquivos a alterar (21 dialogs em 17 arquivos)

**Grupo 1 - Dialogs de formulario com 2 botoes (Cancelar + Acao) - padrao 40/60:**

1. **`src/components/schedule/EventForm.tsx`** (linha 148)
   - DialogContent: `sm:max-w-[500px]` -> `w-[90%] sm:max-w-[500px] sm:w-full rounded-lg`
   - Botoes Cancelar/Salvar (linhas 334-341): aplicar `w-[40%] rounded-xl` / `w-[60%] rounded-xl`

2. **`src/components/plans/PlanFormDialog.tsx`** (linha 98)
   - DialogContent: `sm:max-w-[500px]` -> `w-[90%] sm:max-w-[500px] sm:w-full rounded-lg`
   - DialogFooter -> `div flex gap-2 pt-4`, botoes 40/60 com `rounded-xl`

3. **`src/components/coverage/CoverageFormDialog.tsx`** (linha 120)
   - DialogContent: `sm:max-w-[500px]` -> `w-[90%] sm:max-w-[500px] sm:w-full rounded-lg`
   - DialogFooter -> `div flex gap-2 pt-4`, botoes 40/60 com `rounded-xl`

4. **`src/components/telecom/CustomerFormDialog.tsx`** (linha 179)
   - DialogContent: adicionar `w-[90%] sm:w-full rounded-lg`
   - DialogFooter -> `div flex gap-2 pt-4`, botoes 40/60 com `rounded-xl`

5. **`src/components/leads/TaskOutcomeDialog.tsx`** (linha 123)
   - DialogContent: `sm:max-w-md` -> `w-[90%] sm:max-w-md sm:w-full rounded-lg`
   - DialogFooter -> `div flex gap-2 pt-4`, botoes 40/60 com `rounded-xl`

6. **`src/components/conversations/CreateLeadDialog.tsx`** (linha 136)
   - DialogContent: `sm:max-w-[500px]` -> `w-[90%] sm:max-w-[500px] sm:w-full rounded-lg`
   - Botoes (linhas 267-281): aplicar `w-[40%] rounded-xl` / `w-[60%] rounded-xl`

7. **`src/components/integrations/MetaIntegrationSettings.tsx`** - 2 dialogs
   - Dialog PageSelector (linha 389): `sm:max-w-md` -> `w-[90%] sm:max-w-md sm:w-full rounded-lg`
   - Dialog Edit (linha 492): `sm:max-w-md` -> `w-[90%] sm:max-w-md sm:w-full rounded-lg`
   - Ambos DialogFooter -> `div flex gap-2 pt-4`, botoes 40/60 com `rounded-xl`

8. **`src/components/integrations/MetaFormConfigDialog.tsx`** (linha 138)
   - DialogContent: `max-w-2xl max-h-[90vh]` -> `w-[90%] sm:max-w-2xl sm:w-full rounded-lg max-h-[90vh]`
   - DialogFooter -> `div flex gap-2 pt-4`, botoes 40/60 com `rounded-xl`

9. **`src/components/whatsapp/QuickMessageTemplates.tsx`** (linha ~192)
   - DialogContent: adicionar `w-[90%] sm:w-full rounded-lg`
   - DialogFooter -> `div flex gap-2 pt-4`, botoes 40/60 com `rounded-xl`

10. **`src/components/crm-management/TagsTab.tsx`** (linha 192)
    - DialogContent: `max-h-[90vh] overflow-y-auto` -> `w-[90%] sm:max-w-md sm:w-full rounded-lg max-h-[90vh] overflow-y-auto`
    - Botoes (linhas 242-252): aplicar `w-[40%] rounded-xl` / `w-[60%] rounded-xl`

11. **`src/components/help/FeatureRequestDialog.tsx`** (linha 85)
    - DialogContent: `max-w-lg` -> `w-[90%] sm:max-w-lg sm:w-full rounded-lg`
    - DialogFooter -> `div flex gap-2 pt-4`, botoes 40/60 com `rounded-xl`

12. **`src/components/round-robin/RuleEditor.tsx`** (linha 186)
    - DialogContent: `max-w-2xl max-h-[90vh] overflow-y-auto` -> `w-[90%] sm:max-w-2xl sm:w-full rounded-lg max-h-[90vh] overflow-y-auto`
    - DialogFooter -> `div flex gap-2 pt-4`, botoes 40/60 com `rounded-xl`

13. **`src/components/round-robin/DistributionQueueEditor.tsx`** (linha 630)
    - DialogContent: `max-w-2xl max-h-[90vh] overflow-y-auto` -> `w-[90%] sm:max-w-2xl sm:w-full rounded-lg max-h-[90vh] overflow-y-auto`
    - Botoes Cancelar/Salvar: aplicar `w-[40%] rounded-xl` / `w-[60%] rounded-xl`

14. **`src/components/settings/RolesTab.tsx`** (linha 254)
    - DialogContent: `max-w-2xl max-h-[90vh] overflow-hidden flex flex-col` -> `w-[90%] sm:max-w-2xl sm:w-full rounded-lg max-h-[90vh] overflow-hidden flex flex-col`
    - DialogFooter -> `div flex gap-2 pt-4 border-t`, botoes 40/60 com `rounded-xl`

15. **`src/pages/Pipelines.tsx`** - New Stage Dialog (linha 1213)
    - DialogContent: `max-w-sm` -> `w-[90%] sm:max-w-sm sm:w-full rounded-lg`
    - Botoes (linhas 1262-1270): aplicar `w-[40%] rounded-xl` / `w-[60%] rounded-xl`

16. **`src/pages/admin/AdminOrganizations.tsx`** (linha 145)
    - DialogContent: `max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto` -> `w-[90%] sm:max-w-lg sm:w-full rounded-lg max-h-[90vh] overflow-y-auto`
    - DialogFooter -> `div flex gap-2 pt-4`, botoes 40/60 com `rounded-xl`

17. **`src/pages/admin/AdminOrganizationDetail.tsx`** (linha 472)
    - DialogContent: `max-w-[95vw] sm:max-w-md` -> `w-[90%] sm:max-w-md sm:w-full rounded-lg`
    - DialogFooter -> `div flex gap-2 pt-4`, botoes 40/60 com `rounded-xl`

18. **`src/pages/admin/AdminHelpEditor.tsx`** (linha 293)
    - DialogContent: `max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto` -> `w-[90%] sm:max-w-2xl sm:w-full rounded-lg max-h-[90vh] overflow-y-auto`
    - DialogFooter -> `div flex gap-2 pt-4`, botoes 40/60 com `rounded-xl`

**Grupo 2 - Dialogs com botao unico (Fechar/Entendi):**

19. **`src/pages/WhatsAppSettings.tsx`**
    - QR Dialog (linha 481): `sm:max-w-md` -> `w-[90%] sm:max-w-md sm:w-full rounded-lg`
    - Access Dialog (linha 615): `sm:max-w-md` -> `w-[90%] sm:max-w-md sm:w-full rounded-lg`, botao Fechar `w-full rounded-xl`

20. **`src/components/settings/WhatsAppTab.tsx`** (linha 404)
    - DialogContent: `sm:max-w-md` -> `w-[90%] sm:max-w-md sm:w-full rounded-lg`

21. **`src/components/pwa/InstallPrompt.tsx`** (linha 74)
    - DialogContent: `sm:max-w-md` -> `w-[90%] sm:max-w-md sm:w-full rounded-lg`
    - Botao Entendi: `w-full rounded-xl`

**Grupo 3 - Dialogs com botao unico ou layout especial (Fechar/visualizacao):**

22. **`src/components/contacts/ImportContactsDialog.tsx`** (linha 291)
    - DialogContent: `sm:max-w-lg` -> `w-[90%] sm:max-w-lg sm:w-full rounded-lg`

23. **`src/components/public/ContactFormDialog.tsx`** (linha 133)
    - DialogContent: `sm:max-w-md` -> `w-[90%] sm:max-w-md sm:w-full rounded-lg`

24. **`src/pages/admin/AdminAudit.tsx`** (linha 242)
    - DialogContent: `max-w-2xl` -> `w-[90%] sm:max-w-2xl sm:w-full rounded-lg`

25. **`src/components/leads/LeadDetailDialog.tsx`** - Roteiro Dialog (linha 2171)
    - DialogContent: `max-w-md` -> `w-[90%] sm:max-w-md sm:w-full rounded-lg`

**Nao alterar (layouts especiais que ja funcionam bem):**
- `LeadDetailDialog` principal (max-w-6xl w-[95vw]) - layout complexo de detalhe
- `PropertyGallery` lightbox (95vw/95vh) - galeria fullscreen
- `MediaViewer` (95vw/95vh) - viewer fullscreen
- `PropertyPreviewDialog` (max-w-5xl) - preview grande
- `PropertyFormDialog` - ja atualizado
- Dialogs ja atualizados com w-[90%] rounded-lg

---

### Resumo da padronizacao

Para cada dialog:
- **DialogContent**: adicionar `w-[90%] sm:w-full rounded-lg`
- **DialogFooter com 2 botoes**: trocar por `<div className="flex gap-2 pt-4">` com botoes `w-[40%] rounded-xl` (Cancelar) e `w-[60%] rounded-xl` (Acao)
- **DialogFooter com 1 botao**: trocar por `<div className="flex gap-2 pt-4">` com botao `w-full rounded-xl`

