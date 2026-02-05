
# Plano de Correção: Exibição de Comissões

## Problema Identificado

A página de Comissões está mostrando "Nenhuma comissão encontrada" porque o **mapeamento de status das abas está invertido/incorreto**:

| Aba | Filtro Atual | Deveria Ser | Descrição |
|-----|-------------|-------------|-----------|
| **Pendentes** | `approved` | `forecast` | Comissões pendentes de aprovação |
| Histórico | `paid` | `paid` | OK |
| **Previsão** | `forecast` | `approved` | Comissões aprovadas aguardando pgto |

A comissão criada tem `status = 'forecast'`, mas a aba "Pendentes" busca por `status = 'approved'`.

## Solução Proposta

Corrigir o mapeamento de status na página `Commissions.tsx`:

```typescript
// ANTES (incorreto)
const statusMap: Record<string, string | undefined> = {
  pending: 'approved',   // ❌ "Pendentes" filtra "approved"
  history: 'paid',
  forecast: 'forecast',  // ❌ "Previsão" filtra "forecast"
  rules: undefined,
};

// DEPOIS (correto)
const statusMap: Record<string, string | undefined> = {
  pending: 'forecast',   // ✅ "Pendentes" = aguardando aprovação
  history: 'paid',       // ✅ "Histórico" = já pagos
  forecast: 'approved',  // ✅ "Previsão" = aprovados aguardando pagamento
  rules: undefined,
};
```

## Arquivo a Alterar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Commissions.tsx` | Linha ~224-229: corrigir o mapeamento de status |

## Resultado Esperado

Após a correção:
- **Aba "Pendentes"**: mostrará a comissão de R$ 12.500 (status `forecast`)
- **Aba "Previsão"**: mostrará comissões aprovadas aguardando pagamento
- **Aba "Histórico"**: mostrará comissões já pagas

## Benefícios

1. Semântica correta das abas
2. Fluxo intuitivo: Pendentes → Aprovar → Previsão de Pagamento → Pagar → Histórico
3. A comissão do lead teste aparecerá corretamente na aba "Pendentes"
