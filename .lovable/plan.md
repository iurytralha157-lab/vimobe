
# Fix: VGV Column Sum and Decimal Formatting

## Problems identified

### Problem 1 — Column VGV badge may not show sum of all leads

The column header badge uses `stageVGVMap` from `useStageVGV`, which queries **all leads in the pipeline** (no date filter). However, the image shows R$40.4M in the column header even though there are two leads of R$40.4M each — the expected value would be R$80.8M.

Looking at `useStageVGV` in `src/hooks/use-vgv.ts` (line 178), the query fetches `valor_interesse` and sums it per stage correctly. The real bug here is that the column header VGV uses `openVGV` (which excludes `won` and `lost` leads), but the **filteredStages** (visible cards) may include leads with `deal_status = 'won'`. If those leads count as "won", their VGV is excluded from `openVGV`.

Actually, re-reading the code: the column VGV badge shows `openVGV` (leads that are not won/lost). If both tete002 and tete003 have `deal_status = 'open'`, they should both count and the total should be 80.8M.

The more likely cause: the column header VGV comes from `useStageVGV` which queries the **database directly** (all leads), but `filteredStages` applies a **date filter**. The column header VGV uses the **unfiltered DB query**, and if only one lead is within the date filter but both exist in DB, only one would appear in the cards but the VGV would show the full database sum.

Wait, looking again at the screenshot: column shows R$40.4M and there are 2 cards (tete002 and tete003) both showing R$40.4M each. The sum should be R$80.8M.

The real issue: `useStageVGV` does NOT filter by the date preset selected in the pipeline. It queries ALL leads in the pipeline. But filteredStages applies date filtering client-side. So the VGV badge and visible cards can be out of sync.

**Best fix**: Calculate the VGV directly from `filteredStages` leads instead of from the separate `useStageVGV` hook. This ensures the badge reflects exactly what's visible, summing only the filtered leads' `valor_interesse`.

### Problem 2 — Decimal separator uses dot instead of comma (pt-BR)

Both `formatCompactCurrency` (column badge) and `formatCurrency` (lead card badge) use JavaScript's `.toFixed()` which always outputs a dot as decimal separator regardless of locale. In pt-BR, `40.4M` should be `40,4M`.

**Fix**: Replace `.toFixed(1)` with locale-aware formatting using `toLocaleString('pt-BR', { maximumFractionDigits: 1 })`.

Also, for thousands: currently shows `R$80K` (no decimals). Better to show `R$80,8K` when there's a meaningful decimal.

---

## Solution

### Fix 1 — Compute VGV from `filteredStages` (not from separate hook)

Instead of using `useStageVGV` (which ignores date/user filters), compute the VGV badge value directly from the already-filtered `filteredStages`:

```ts
// In Pipelines.tsx, replace stageVGVMap with a computed map from filteredStages
const stageVGVMap = useMemo(() => {
  const map = new Map<string, { openVGV: number }>();
  for (const stage of filteredStages) {
    let openVGV = 0;
    for (const lead of stage.leads || []) {
      if (lead.deal_status !== 'won' && lead.deal_status !== 'lost') {
        openVGV += lead.valor_interesse || 
                   lead.interest_property?.preco || 
                   lead.interest_plan?.price || 0;
      }
    }
    if (openVGV > 0) map.set(stage.id, { openVGV });
  }
  return map;
}, [filteredStages]);
```

This removes the dependency on `useStageVGV` from the pipeline view and makes the badge always consistent with what's visible.

### Fix 2 — Fix decimal separator to use comma (pt-BR)

Replace `formatCompactCurrency` in `Pipelines.tsx` (line 81-88):

```ts
const formatCompactCurrency = (value: number): string => {
  if (value >= 1_000_000) {
    const v = value / 1_000_000;
    const formatted = v.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: v % 1 === 0 ? 0 : 1 });
    return `R$${formatted}M`;
  } else if (value >= 1_000) {
    const v = value / 1_000;
    const formatted = v.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 0 });
    return `R$${formatted}K`;
  }
  return `R$${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
};
```

And `formatCurrency` in `LeadCard.tsx` (line 97-104):

```ts
const formatCurrency = (value: number) => {
  if (value >= 1_000_000) {
    const v = value / 1_000_000;
    const formatted = v.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: v % 1 === 0 ? 0 : 1 });
    return `R$${formatted}M`;
  } else if (value >= 1_000) {
    const v = value / 1_000;
    const formatted = v.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 0 });
    return `R$${formatted}K`;
  }
  return `R$${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
};
```

---

## Files to modify

| File | Change |
|---|---|
| `src/pages/Pipelines.tsx` | Replace `stageVGVMap` computation to use `filteredStages` instead of `useStageVGV`; fix `formatCompactCurrency` decimal separator |
| `src/components/leads/LeadCard.tsx` | Fix `formatCurrency` decimal separator |

### Cleanup
Since `useStageVGV` will no longer be needed in `Pipelines.tsx`, remove its import and usage from that file.

---

## Expected results after fix

- Column "Qualificados" with 2 leads of R$40,4M each → badge shows **R$80,8M**
- Individual lead card shows **R$40,4M** (comma instead of dot)
- Thousands: R$500K, R$1,5K etc. using comma as decimal separator
- VGV badge is always in sync with visible filtered leads
