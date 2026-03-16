

# Fix Vista Sync - API Field Name Errors

## Root Cause

The Edge Function logs show the exact error from Vista API:
```
"A tabela Foto não está disponível para este método"
```

Our code uses `{"Foto": [...]}` (uppercase) in the fields array, but the Vista `imoveis/listar` endpoint requires `{"fotos": [...]}` (lowercase). The API rejects the entire request with HTTP 400 because of this invalid field reference.

## What the working WordPress plugin does differently

From the uploaded `Plugin_Api.txt`:
1. Uses flat field names: `'Fotos','fotos','FotoDestaque','Foto'` -- no nested object for `listar`
2. Uses `Dormitorio` (singular), not `Dormitorios`
3. Appends `&showtotal=1` to get pagination metadata
4. Uses separate photo extraction logic from the flat response
5. Field names: `Titulo` not `TituloSite`, `AreaUtil` not `AreaPrivativa`, `Banheiros` not `BanheiroSocialQtd`

## Fix in `supabase/functions/vista-sync/index.ts`

### 1. Fix the fields array
Change from:
```js
{"Foto": ["Foto", "FotoPequena", "Destaque"]}
```
To (matching Vista documentation):
```js
{"fotos": ["Foto", "FotoPequena", "Destaque"]}
```

Also fix field names to match what works in the WP plugin:
- `Dormitorios` -> `Dormitorio`
- `BanheiroSocialQtd` -> `Banheiros`
- `AreaPrivativa` -> `AreaUtil`
- `TituloSite` -> `Titulo`
- Add `showtotal=1` parameter
- Add `FotoDestaque` as a standalone field (keep it as fallback)

### 2. Fix photo parsing
Update the photo extraction to handle lowercase `fotos` key in response (matching what the API actually returns).

### 3. Fix field mapping in property data builder
- `item.Dormitorios` -> `item.Dormitorio`
- `item.BanheiroSocialQtd` -> `item.Banheiros`  
- `item.AreaPrivativa` -> `item.AreaUtil`
- `item.TituloSite` -> `item.Titulo`

### 4. Add `showtotal=1` and `sslverify` equivalent
The WP plugin uses `showtotal=1` to get total count for pagination. Add this parameter.

### File to modify
- `supabase/functions/vista-sync/index.ts`

