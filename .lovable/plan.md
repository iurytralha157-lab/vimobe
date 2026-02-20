
## Remover Simulador de Distribuição

### O que será removido

3 arquivos/referências a limpar:

**Arquivo deletado:**
- `src/components/round-robin/TestRuleDialog.tsx` — componente do dialog de simulação
- `src/hooks/use-test-round-robin.ts` — hook morto (já continha apenas um `console.warn`)

**Arquivo editado — `src/components/crm-management/DistributionTab.tsx`:**
- Linha 45: remover `import { TestRuleDialog }`
- Linha 24: remover `Play` do import de ícones (se não usado em outro lugar)
- Linha 81: remover `const [testDialogOpen, setTestDialogOpen] = useState(false)`
- Linhas 130–132: remover o botão "Testar" do header
- Linhas 386–390: remover o bloco `<TestRuleDialog ... />`

### Impacto

Nenhum outro arquivo usa `TestRuleDialog` ou `use-test-round-robin`. A remoção é segura e não quebra nada.

### Arquivos Modificados

| Arquivo | Ação |
|---|---|
| `src/components/crm-management/DistributionTab.tsx` | Remover import, estado, botão e dialog |
| `src/components/round-robin/TestRuleDialog.tsx` | Deletar arquivo |
| `src/hooks/use-test-round-robin.ts` | Deletar arquivo |
