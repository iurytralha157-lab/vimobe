

# Fix: Property Limit, Photo Gallery Sync, and Property Code Prefixes

## 3 Issues to Fix

### 1. Property listing limited to 200
In `src/hooks/use-properties.ts` line 26, the query has `.limit(200)`. This hard cap prevents showing more than 200 properties.

**Fix**: Remove the `.limit(200)` or increase it to 1000 (Supabase default max). For large catalogs, increase to 1000 and add pagination later if needed.

**File**: `src/hooks/use-properties.ts`

### 2. Imoview sync not pulling photo gallery
The edge function `imoview-sync` already attempts to fetch detail photos (lines 160-186), but:
- The detail endpoint URL and method may not match Loft/Imoview's actual API
- The `fotos` field IS being written to `propertyData` (line 235), so photos should be saved if the API returns them

**Fix**: Improve the photo extraction logic to handle more response formats (e.g., `detail.urlFotos`, `detail.galerias`, nested arrays). Also ensure the listing response itself is checked for photo URLs (many APIs return photo arrays in the listing, not just the detail endpoint).

**File**: `supabase/functions/imoview-sync/index.ts`

### 3. Property code prefixes too limited
Currently `generatePropertyCode()` only handles 4 types: Casa→CA, Cobertura→CB, Comercial→CO, everything else→AP.

**Fix**: Expand the prefix map to cover all property types properly:

| Type | Prefix |
|------|--------|
| Casa | CA |
| Apartamento | AP |
| Cobertura | AP (is apartment) |
| Kitnet | AP or CA (apartment variant) |
| Flat | AP |
| Comercial | CO |
| Galpão | GA |
| Terreno | TR |
| Sítio | SI |
| Fazenda | FA |
| Other/custom | IM (generic) |

**File**: `src/hooks/use-properties.ts` — update `generatePropertyCode()`

### Build Error
The build errors shown are **pre-existing** bundle size warnings (5.3MB chunk). They are not caused by recent changes. The builds complete successfully but may exceed a size limit check. No action needed for the current fixes.

## Technical Details

### File: `src/hooks/use-properties.ts`
- Line 26: Change `.limit(200)` to `.limit(1000)`
- Lines 60-63: Expand the prefix mapping to a dictionary covering all property types

### File: `supabase/functions/imoview-sync/index.ts`
- Lines 160-186: Enhance photo extraction to also check the listing item itself for photo arrays (`item.fotos`, `item.imagens`, `item.urlFotos`, `item.galeria`)
- If listing already has photos, skip the per-item detail API call (saves time and avoids rate limiting)
- Add more field name patterns for photo URLs in the detail response

