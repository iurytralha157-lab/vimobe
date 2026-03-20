

# Enhanced Campaign Performance Widget — Full Filter Integration + Missing Data

## What's Already Working
- Campaign hierarchy (Campaign > Adset > Ad) with lead counts
- Spend, CPL, and creative previews
- Sales tracking (won_count) per campaign
- Meta API sync edge function

## What's Missing (User's Request)
1. **Dashboard filters not applied**: Team, User, and Source filters are ignored — only date range is used
2. **No sales revenue per campaign**: `won_count` exists but `valor_interesse` (deal value) is not tracked per campaign
3. **Impressions/Reach not shown in UI**: Data is fetched but not displayed (user wants "visualizações")
4. **No organization filter on lead_meta query**: Could return cross-org data in edge cases

## Plan

### File: `src/hooks/use-campaign-insights.ts`

1. **Apply all dashboard filters** to the leads query (lines 111-116):
   - Add `teamId` filter: fetch team member IDs and filter `assigned_user_id` 
   - Add `userId` filter: filter `assigned_user_id`
   - Add `source` filter: filter by lead source
   - Add `organization_id` filter to lead_meta query

2. **Fetch deal value (valor_interesse)** alongside `deal_status` in the leads query, then aggregate `totalRevenue` and per-campaign revenue from won leads

3. **Add to summary**: `totalImpressions`, `totalReach`, `totalRevenue` (sum of `valor_interesse` from won leads)

4. **Add to CampaignAggregated/AdAggregated interfaces**: `revenue` field for won deal values

### File: `src/components/dashboard/CampaignPerformanceWidget.tsx`

1. **Add KPI cards** for: Impressões, Alcance, Receita (VGV from won deals)
2. **Add "Vendas" and "Receita" columns** to campaign table (alongside Leads, Gasto, CPL)
3. **Show impressions per campaign** in an expandable or tooltip

### No database changes needed
All required data already exists in `leads` (valor_interesse, deal_status, assigned_user_id, source) and `lead_meta` tables.

### Technical Detail
The key fix is in the leads batch query (hook line 111):
```typescript
// Current: only filters by date
.select("id, deal_status")

// New: also fetch valor_interesse + apply team/user/source filters  
.select("id, deal_status, valor_interesse, assigned_user_id, source")
.eq("organization_id", organizationId)
// + conditional .in("assigned_user_id", teamMemberIds) for team filter
// + conditional .eq("assigned_user_id", userId) for user filter  
// + conditional .eq("source", source) for source filter
```

