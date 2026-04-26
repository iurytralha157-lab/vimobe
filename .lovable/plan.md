## Diagnóstico do estado atual

Boa notícia: **grande parte da estrutura já existe no código**, mas há lacunas críticas que impedem o funcionamento e expõem riscos de segurança. O que encontrei:

| Item | Status atual | Problema |
|---|---|---|
| Edge Function `public-api` | ✅ Existe (`/properties` e `/properties/:id`) | Valida API key com comparação direta — vulnerável |
| Página pública `/docs/api` (`APIDocs.tsx`) | ✅ Existe e está roteada em `App.tsx` | OK, mas precisa de ajustes (URL real do endpoint + exemplo de resposta) |
| Aba "API Pública" em **Configurações** (`APITab.tsx`) | ✅ Existe e aparece quando `hasModule('api')` é true | **Salva a chave em texto plano** no banco (`key_hash` recebe o `sk_...` cru) |
| Item "API Pública" no dropdown do header | ✅ Existe | OK |
| Módulo `'api'` em `useOrganizationModules` | ✅ Listado como `ModuleName` | OK |
| Toggle do módulo no **Super Admin** (`AdminOrganizationDetail.tsx`) | ✅ Aparece como "API Pública (Imóveis)" na categoria *advanced* | OK |
| Tabela `organization_api_keys` | ❌ **NÃO EXISTE no banco** (migration nunca foi aplicada) | Bloqueador total |
| Módulo `'api'` cadastrado em `organization_modules` de qualquer org | ❌ Nenhuma org tem | Super Admin precisa habilitar |

> Conclusão: o esqueleto foi criado em uma sessão anterior mas nunca foi finalizado/migrado. Vamos completar e endurecer.

---

## O que vou fazer

### 1. Migration — criar tabela `organization_api_keys` (com hash real)

Aplicar nova migration que:

- Cria `public.organization_api_keys` com colunas:
  - `id uuid PK`, `organization_id uuid → organizations(id) ON DELETE CASCADE`
  - `key_hash text NOT NULL UNIQUE` — guardará o **SHA-256 hex** da chave (não a chave em si)
  - `key_prefix text NOT NULL` — primeiros 12 chars (ex.: `sk_live_a1b2`) para o usuário identificar a chave na UI
  - `name text` — apelido (ex.: "Site institucional")
  - `last_used_at timestamptz`, `created_at`, `updated_at`, `created_by uuid`, `revoked_at timestamptz`
- Índices em `organization_id` e `key_hash`
- RLS habilitado, com policies usando função `SECURITY DEFINER` (`has_org_role`) para evitar recursão e ler `organization_members.role IN ('admin','super_admin')`:
  - SELECT, INSERT, DELETE: somente admins da própria organização
  - UPDATE bloqueado (chaves são imutáveis; rotação = criar nova + revogar antiga)
- Trigger `set_updated_at`
- Função utilitária `public.hash_api_key(text) RETURNS text` que retorna `encode(digest(key, 'sha256'),'hex')` (extensão `pgcrypto` já é padrão no Supabase)

### 2. Geração de chave — fluxo seguro (cliente → RPC)

Substituir o INSERT direto do `APITab.tsx` por uma RPC `generate_organization_api_key(p_name text)`:

- Gera bytes aleatórios via `gen_random_bytes(32)` no servidor → chave `sk_live_<64hex>`
- Calcula hash, insere `key_hash = hash`, `key_prefix = substring(chave, 1, 12)`, `created_by = auth.uid()`
- **Retorna a chave em texto plano UMA ÚNICA VEZ** (no JSON de resposta)
- Verifica que o usuário é admin da org (via `has_org_role`)
- A RPC é `SECURITY DEFINER` com `search_path = public`

Atualizar `APITab.tsx`:
- Trocar a geração client-side pela chamada `supabase.rpc('generate_organization_api_key', { p_name })`
- Adicionar campo opcional "Apelido da chave" antes de gerar
- Exibir aviso reforçado: "Esta é a única vez que você verá a chave completa"
- Mostrar `last_used_at` em cada chave listada
- Botão "Revogar" em vez de "Remover" definitivo (UPDATE `revoked_at` bloqueado pela RLS — usaremos DELETE mesmo, mais simples e seguro)

### 3. Endurecer a Edge Function `public-api`

Atualizar `supabase/functions/public-api/index.ts`:

- Receber a chave do header `Authorization: Bearer sk_live_...`
- Calcular `SHA-256` da chave recebida (Web Crypto API do Deno)
- Buscar por `key_hash = <hash>` (não mais comparar texto plano)
- Rejeitar se `revoked_at IS NOT NULL`
- Atualizar `last_used_at = now()` (fire-and-forget)
- Manter checagem do módulo `'api'` em `organization_modules`
- **Garantir isolamento por organização**: todo SELECT em `properties` filtra por `organization_id = keyData.organization_id` (já está, mas vou auditar `/properties/:id` para evitar IDOR — está OK, já filtra)
- Ajustar campos retornados: remover colunas internas/sensíveis (ex.: `created_by`, notas internas se houver) e retornar apenas o que faz sentido publicamente:
  - `id, codigo, titulo, descricao, tipo_de_imovel, finalidade, valor_venda, valor_locacao, valor_condominio, valor_iptu, quartos, suites, banheiros, vagas, area_total, area_util, cidade, bairro, estado, cep, logradouro (sem número), fotos, caracteristicas, status, created_at`
- Adicionar paginação simples: `?page=1&per_page=50` (default 50, max 100)
- Adicionar filtros já previstos: `city`, `neighborhood`, `type`, e mais `purpose` (venda/locação), `min_price`, `max_price`, `bedrooms`
- CORS já está OK (`*`) — mantém, pois é API pública
- Retornar 401/403/404/500 com JSON consistente `{ error, code }`

### 4. Página de docs `/docs/api` (`APIDocs.tsx`)

Atualizar para refletir o endpoint real:

- Trocar `window.location.origin + '/functions/v1/public-api'` pela URL real:
  `https://iemalzlfnbouobyjwlwi.supabase.co/functions/v1/public-api`
- Documentar:
  - Autenticação (header `Authorization: Bearer sk_live_...`)
  - Endpoints `/properties` (com todos os filtros + paginação) e `/properties/:id`
  - Tabela de campos retornados
  - Códigos de erro (401 chave inválida, 403 módulo desativado, 404 não encontrado)
  - Exemplo `curl` e exemplo `fetch` em JS
  - Aviso de privacidade (número do logradouro é omitido — alinhado com a memória `address-privacy-v1`)
- Adicionar exemplo de resposta JSON
- Manter a página acessível publicamente sem autenticação (já está em rota pública)

### 5. Liberação por Super Admin

Já funciona via `AdminOrganizationDetail.tsx` (linha 73 lista `{ name: 'api', label: 'API Pública (Imóveis)' }`). Vou:
- Validar que o toggle realmente faz upsert em `organization_modules` com `module_name='api'`
- Confirmar visualmente o badge "Avançado"

### 6. Gating na UI da organização

Já implementado:
- `APITab` só aparece em `/settings` se `hasModule('api')` (Settings.tsx:96)
- Item "API Pública" no dropdown do AppHeader só aparece se `hasModule('api')` (AppHeader.tsx:262)
- Vou apenas adicionar um link "Ver Documentação Pública" também dentro da `APITab` (já existe via botão) e revisar o copy explicando segurança/uso.

### 7. Documentação dentro da aba (em Configurações)

Reforçar dentro do `APITab.tsx`:
- Card de boas práticas: "Nunca exponha sua chave no frontend. Use sempre via backend."
- Mostrar exemplo curto de uso
- Link grande para `/docs/api`

---

## Garantias de segurança (checklist)

- ✅ Chave nunca é armazenada em texto plano (apenas hash SHA-256)
- ✅ Chave só é exibida ao usuário **uma vez**, no momento da criação
- ✅ Geração é server-side via RPC `SECURITY DEFINER` com `search_path = public`
- ✅ Edge Function valida hash + módulo ativo + organização
- ✅ Isolamento total por `organization_id` em todos os SELECTs
- ✅ RLS bloqueia leitura/criação de chaves de outras orgs (somente admin/super_admin)
- ✅ Endereço sem número (alinhado a memória `address-privacy-v1`)
- ✅ Apenas imóveis com `status = 'disponivel'` retornados na listagem (já está)
- ✅ CORS aberto (correto para API pública), mas autenticação obrigatória em toda rota
- ✅ Documentação alerta a manter chave fora do frontend

---

## Fora do escopo (para depois, se quiser)

- Rate limiting por chave (sugiro adicionar via Cloudflare ou tabela de logs depois)
- Webhooks de eventos (criação/atualização de imóvel notificando o cliente)
- Endpoints de leads, contatos, etc. (você pediu **somente imóveis** por enquanto)
- Versionamento da API (`/v1/`) — podemos adicionar quando houver `/v2`

---

## Arquivos que serão alterados/criados

**Novos:**
- `supabase/migrations/<timestamp>_create_organization_api_keys.sql`

**Modificados:**
- `supabase/functions/public-api/index.ts` (hash + paginação + filtros + sanitização)
- `src/components/settings/APITab.tsx` (RPC + nome da chave + UX de revogação)
- `src/pages/public/APIDocs.tsx` (URL real + exemplos + tabela de campos + erros)

**Sem alteração (já estão prontos):**
- `src/App.tsx` (rota `/docs/api` já existe)
- `src/components/layout/AppHeader.tsx` (item no dropdown já existe)
- `src/pages/Settings.tsx` (aba já existe condicional ao módulo)
- `src/pages/admin/AdminOrganizationDetail.tsx` (toggle do módulo já existe)
- `src/hooks/use-organization-modules.ts` (`'api'` já é tipo válido)

Após aplicar a migration e o Super Admin habilitar o módulo `api` na organização desejada (ex.: Better), a aba "API Pública" aparecerá em **Configurações** e no dropdown do header, permitindo gerar a chave e consumir os imóveis com isolamento garantido por organização.