

# Creative Performance Ranking + Sales Attribution

## What we're building

Two tabs inside the existing Campaign Performance card:
1. **Campanhas** (current view, unchanged)
2. **Criativos** (new) -- Top creatives ranked by a weighted score

### Scoring System
- Each **lead** = 1 point
- Each **sale** (deal_status = 'won') = 10 points
- Score = leads_count + (won_count * 10)
- Ranked by score descending, showing top creatives with their preview thumbnail

### Data needed for sales attribution
The hook already fetches `lead_id` per ad. We need to also fetch `deal_status` from the `leads` table (already queried in batches for date filtering). We'll extend that query to also select `deal_status` so we can count won leads per ad/campaign/adset.

## Technical changes

### 1. Hook: `use-campaign-insights.ts`
- In the batch leads query (line ~94), add `deal_status` to the select: `.select("id, deal_status")`
- Track won lead IDs in a `Set<string>` alongside valid lead IDs
- Add `won_count` to `AdAggregated`, `AdsetAggregated`, `CampaignAggregated` interfaces
- Count won leads per ad/adset/campaign during hierarchy building
- Add a new `topCreatives` array to the return: flatten all ads, compute `score = leads_count + (won_count * 10)`, sort desc, take top 10
- Add `totalWon` to the summary object

### 2. Widget: `CampaignPerformanceWidget.tsx`
- Add Tabs component (Campanhas | Criativos) inside the card
- **Campanhas tab**: existing campaign table (no changes)
- **Criativos tab**: New ranked list showing:
  - Position medal/number (1st, 2nd, 3rd with gold/silver/bronze)
  - Creative thumbnail (reuse `CreativePreview` component)
  - Ad name + campaign name (smaller, secondary)
  - Leads count, Won count, Score
  - Progress bar showing relative score vs #1
- Add KPI for "Vendas" (total won) in the KPI row

### Files to modify
- `src/hooks/use-campaign-insights.ts` -- extend data model with won_count + topCreatives
- `src/components/dashboard/CampaignPerformanceWidget.tsx` -- add tabs + creative ranking view

