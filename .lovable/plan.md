
# Plano: Adicionar Campo de Comissão e Máscara de Moeda no Lead

## Resumo
Vamos melhorar a aba "Negócio" do lead adicionando:
1. **Máscara de moeda** no campo "Valor de interesse" (formatação com separadores de milhares)
2. **Campo de comissão (%)** ao lado do valor de interesse
3. **Preenchimento automático** da comissão quando um imóvel é selecionado (pega o `commission_percentage` do imóvel)
4. **Cálculo do valor da comissão** exibido abaixo (valor de interesse × percentual)

---

## Fluxo do Usuário

```
1. Usuário seleciona imóvel de interesse
   ↓
2. Valor de interesse preenchido automaticamente (preço do imóvel)
   ↓
3. Comissão (%) preenchida automaticamente (do imóvel)
   ↓
4. Card exibe: "Valor da Comissão: R$ X.XXX"
```

**Se não houver imóvel selecionado:** O usuário pode digitar manualmente o valor de interesse e a comissão.

---

## Mudanças no Banco de Dados

Adicionar um novo campo na tabela `leads`:

| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `commission_percentage` | numeric | null | % de comissão do negócio |

---

## Mudanças no Frontend

### 1. LeadDetailDialog.tsx

**Estado do formulário:**
```typescript
const [editForm, setEditForm] = useState({
  // ... campos existentes
  valor_interesse: '',
  commission_percentage: '',  // NOVO
});
```

**Funções de formatação (reutilizando padrão do PropertyFormDialog):**
```typescript
const formatCurrencyDisplay = (value: string): string => {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '');
  if (!numbers) return '';
  return Number(numbers).toLocaleString('pt-BR');
};

const parseCurrencyInput = (value: string): string => {
  return value.replace(/\D/g, '');
};
```

**Ao selecionar imóvel - atualizar comissão também:**
```typescript
const selectedProperty = properties.find(p => p.id === value);
const propertyPrice = selectedProperty?.preco || null;
const propertyCommission = selectedProperty?.commission_percentage || null;

setEditForm({
  ...editForm,
  property_id: newValue,
  valor_interesse: propertyPrice?.toString() || editForm.valor_interesse,
  commission_percentage: propertyCommission?.toString() || editForm.commission_percentage
});
```

**Novo layout na aba Negócio:**
```
┌─────────────────────────────────────────────────────────┐
│ Imóvel de interesse                                      │
│ [Dropdown: Selecionar imóvel]                           │
├────────────────────────────┬────────────────────────────┤
│ Valor de interesse         │ Comissão (%)              │
│ R$ [1.500.000]             │ [5.5] %                   │
└────────────────────────────┴────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 💰 Valor da Comissão: R$ 82.500                         │
│ (5.5% de R$ 1.500.000)                                  │
└─────────────────────────────────────────────────────────┘
```

---

## Hook de Criar Comissão

Atualizar `useCreateCommissionOnWon` para usar a comissão do lead quando disponível:

```typescript
// Se o lead tem commission_percentage, usar esse valor
// Senão, buscar do imóvel como fallback
const commissionPercentage = lead.commission_percentage || property?.commission_percentage || 0;
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| Migração SQL | Adicionar `commission_percentage` na tabela `leads` |
| `src/integrations/supabase/types.ts` | Atualizar tipos (automático após migration) |
| `src/components/leads/LeadDetailDialog.tsx` | Adicionar campo comissão + máscara de moeda |
| `src/hooks/use-create-commission.ts` | Usar comissão do lead quando disponível |
| `src/hooks/use-properties.ts` | Incluir `commission_percentage` no PROPERTY_LIST_FIELDS |

---

## Comportamento Esperado

| Cenário | Valor de Interesse | Comissão (%) | Resultado |
|---------|-------------------|--------------|-----------|
| Imóvel selecionado com preço R$500k e 5% | 500.000 (auto) | 5 (auto) | Comissão: R$ 25.000 |
| Imóvel sem comissão cadastrada | Preço do imóvel (auto) | Vazio (editável) | Usuário define |
| Sem imóvel, valores manuais | 300.000 (manual) | 6 (manual) | Comissão: R$ 18.000 |
| Status "Ganho" | Usa valor do lead | Usa % do lead | Cria registro na tabela commissions |

---

## Detalhes Técnicos

### Migration SQL
```sql
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS commission_percentage numeric DEFAULT NULL;
```

### Campo com Máscara de Moeda
```tsx
<Input 
  value={formatCurrencyDisplay(editForm.valor_interesse)}
  onChange={e => setEditForm({
    ...editForm,
    valor_interesse: parseCurrencyInput(e.target.value)
  })}
  onBlur={() => {
    const value = editForm.valor_interesse ? parseFloat(editForm.valor_interesse) : null;
    updateLead.mutateAsync({ id: lead.id, valor_interesse: value });
  }}
  className="pl-9 rounded-xl"
/>
```

### Card de Valor da Comissão
```tsx
{valorInteresse > 0 && commissionPercentage > 0 && (
  <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
    <p className="text-orange-700 font-bold text-lg">
      Valor da Comissão: R$ {(valorInteresse * commissionPercentage / 100).toLocaleString('pt-BR')}
    </p>
    <p className="text-sm text-orange-600">
      ({commissionPercentage}% de R$ {valorInteresse.toLocaleString('pt-BR')})
    </p>
  </div>
)}
```

---

## Resumo das Mudanças

- **Máscara de moeda**: Valor de interesse formata automaticamente com pontos (ex: 1.500.000)
- **Campo comissão**: Novo campo de % ao lado do valor
- **Auto-preenchimento**: Ao selecionar imóvel, puxa preço E comissão automaticamente
- **Cálculo visual**: Card mostrando o valor calculado da comissão
- **Integração**: Quando o negócio é marcado como "Ganho", usa esses valores para criar a comissão na tabela `commissions`
