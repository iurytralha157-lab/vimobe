# Integração Vista CRM - Importar Imóveis Automaticamente

## Resumo

Criar uma integração completa com a API da Vista Software para que clientes possam conectar suas contas Vista e importar imóveis diretamente para o CRM, incluindo fotos, valores, descrição, endereço e filtrando imóveis inativos.

## Como vai funcionar para o cliente

1. dentro da página de configuração do site vai ter uma aba "Integrações" com opções futuramente vamos ter integrações com outros sistemas, então vamos ter um botão "Importar da Vista")
2. O cliente informa apenas **2 dados**: a URL da API Vista dele (ex: `http://suaempresa.vistahost.com.br/`) e a **chave de API**
3. Ao clicar em "Conectar", o sistema valida os dados fazendo uma chamada de teste
4. Depois de conectado, o cliente clica em "Sincronizar Imóveis" e o sistema puxa tudo automaticamente
5. O cliente pode re-sincronizar quando quiser para pegar imóveis novos

---

## Etapas de Implementação

### 1. Tabela de configuração da integração Vista

Criar tabela `vista_integrations` para armazenar as credenciais de cada organização:

- `id`, `organization_id`, `api_url`, `api_key`, `is_active`, `last_sync_at`, `total_synced`, `created_at`
- RLS: apenas membros da organização podem ler/editar

### 2. Edge Function `vista-sync` (backend)

Uma edge function que faz todo o trabalho pesado:

- **Modo "test"**: valida a conexão chamando `/imoveis/listar` com paginação mínima
- **Modo "sync"**: busca todos os imóveis da Vista com paginação automática (50 por página)

**Campos que serão buscados da API Vista:**

```text
Codigo, Categoria (tipo_de_imovel), Finalidade (tipo_de_negocio), Status,
ValorVenda, ValorLocacao, Dormitorio (quartos), Suite (suites),
BanheiroSocialQtd (banheiros), Vagas, AreaUtil, AreaTotal,
Endereco, Numero, Complemento, Bairro, Cidade, UF, CEP,
Descricao, FotoDestaque (imagem_principal), Latitude, Longitude,
Condominio (valor), IPTU, AnoConstrucao, Andar,
fotos (array de fotos para galeria)
```

**Mapeamento Vista -> CRM:**


| Campo Vista                | Campo CRM                                     |
| -------------------------- | --------------------------------------------- |
| Codigo                     | code (prefixo "VT" + codigo)                  |
| Categoria                  | tipo_de_imovel                                |
| Finalidade                 | tipo_de_negocio                               |
| Status (Ativo/Inativo)     | status (ativo/inativo) -- **filtra inativos** |
| ValorVenda ou ValorLocacao | preco                                         |
| Dormitorio                 | quartos                                       |
| Suite                      | suites                                        |
| BanheiroSocialQtd          | banheiros                                     |
| Vagas                      | vagas                                         |
| AreaUtil / AreaTotal       | area_util / area_total                        |
| Endereco, Numero, etc      | endereco, numero, bairro, cidade, uf, cep     |
| Descricao                  | descricao                                     |
| FotoDestaque               | imagem_principal                              |
| fotos[].Foto               | fotos (array de URLs)                         |
| Latitude / Longitude       | latitude / longitude                          |
| Condominio                 | condominio                                    |
| IPTU                       | iptu                                          |
| AnoConstrucao              | ano_construcao                                |
| Andar                      | andar                                         |


**Regras de negócio:**

- Imóveis com Status diferente de "Ativo" sao ignorados por padrao (parametro configuravel)
- Usa `upsert` baseado no `code` (VT + Codigo) para evitar duplicatas na re-sincronização
- Fotos ficam como URLs externas da Vista (não faz download para storage, para ser rápido)
- Paginação automática: busca 50 por página até acabar

### 3. Interface no frontend

Adicionar na página de **Imóveis** (`Properties.tsx`) um botão "Importar da Vista" que abre um dialog com:

- **Se não configurado**: formulário pedindo URL da API e Chave
- **Se configurado**: botão "Sincronizar Agora" com progresso e resultado
- Mostra última sincronização e total importado

---

## Detalhes Técnicos

### Tabela SQL (migração)

```sql
CREATE TABLE vista_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  api_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  import_inactive BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  total_synced INTEGER DEFAULT 0,
  sync_log JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id)
);

-- RLS
ALTER TABLE vista_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own org vista integration"
ON vista_integrations FOR ALL
USING (user_belongs_to_organization(organization_id));

-- Coluna extra na properties para rastrear origem
ALTER TABLE properties ADD COLUMN IF NOT EXISTS vista_codigo TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_vista_codigo_org 
  ON properties(organization_id, vista_codigo) WHERE vista_codigo IS NOT NULL;
```

### Edge Function `vista-sync`

- Recebe: `{ action: "test" | "sync", organization_id }`
- Lê credenciais da tabela `vista_integrations`
- Chama a API Vista com paginação
- Faz upsert dos imóveis no banco
- Atualiza `last_sync_at` e `total_synced`

### Componente Frontend

- `VistaImportDialog.tsx` - Dialog com setup e sincronização
- `use-vista-integration.ts` - Hook para CRUD da configuração e trigger do sync

### Arquivos que serão criados/modificados


| Arquivo                                           | Ação                        |
| ------------------------------------------------- | --------------------------- |
| `supabase/functions/vista-sync/index.ts`          | Criar                       |
| `src/components/properties/VistaImportDialog.tsx` | Criar                       |
| `src/hooks/use-vista-integration.ts`              | Criar                       |
| `src/pages/Properties.tsx`                        | Modificar (adicionar botão) |
| Migração SQL                                      | Criar tabela + coluna       |
