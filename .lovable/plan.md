

# Fix Vista Software Integration - Properties Not Importing

## Root Cause Found

After analyzing the edge function logs and database schema, I identified the exact problem:

**The `properties` table has a `code` column that is `NOT NULL` with no default value, but the Vista sync function never provides a `code` when inserting new properties.** Every single insert silently fails with a constraint violation error. The sync_log from the last attempt confirms: `errors: ["API error page 1: 404"]` (from March 3rd), and more recent attempts likely fail on the insert step.

The API connection itself works fine - the logs show the Vista API returning 50 properties per page across 5 pages successfully.

## Additional Issues Found

1. **No `code` generation**: The main `useCreateProperty` hook has a `generatePropertyCode()` function, but the edge function doesn't replicate this logic
2. **Photos not fully imported**: The Vista API supports a nested `fotos` field to get the full gallery, but the current code only grabs `FotoDestaque` (single image)
3. **Edge function timeout risk**: Processing 250+ properties with individual DB queries can exceed the function timeout

## Plan

### 1. Fix the Edge Function (`supabase/functions/vista-sync/index.ts`)

**Generate property code on insert:**
- Before inserting, query `property_sequences` table to get/increment the next code (same logic as `generatePropertyCode()` in `use-properties.ts`)
- Map Vista `Categoria` to the proper prefix (CA, CB, CO, AP)
- Set the `code` field on every new property insert

**Improve photo import:**
- Add nested `fotos` field to the API request: `{"Foto": ["Foto", "FotoPequena", "Destaque"]}`
- Parse the photo gallery from response and populate the `fotos` JSONB column
- Keep `FotoDestaque` as `imagem_principal` fallback

**Add better error logging:**
- Log individual upsert errors to console so they appear in edge function logs
- Include the actual DB error message in the sync response

### 2. Batch DB Operations

- Use batch inserts (groups of 10) instead of individual inserts to reduce timeout risk
- Keep the select-then-insert/update pattern but batch the selects

### Files to modify:
- `supabase/functions/vista-sync/index.ts` (main fix)

