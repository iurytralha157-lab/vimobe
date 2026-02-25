
# Migrar Fotos do WordPress Automaticamente

## Contexto
- O site **queroumimovel.com.br** esta online e com todas as fotos acessiveis
- Existem **23 imoveis** da organizacao "Carlos Minami" no banco, todos SEM fotos (`imagem_principal = null`, `fotos = []`)
- A edge function `migrate-wp-images` ja existe, mas precisa de um mapeamento manual `property_id -> wp_page_url`

## Estrategia

Criar uma **nova edge function `auto-migrate-wp-images`** que faz tudo automaticamente:

1. Busca todos os imoveis da organizacao Minami sem fotos
2. Para cada imovel, gera a URL provavel do WordPress baseada no titulo (o WP usa slugs derivados do titulo)
3. Acessa a pagina individual do imovel no WordPress
4. Faz scraping das imagens full-size (ignorando thumbnails e logos)
5. Baixa cada imagem e faz upload para o Supabase Storage
6. Atualiza o banco com `imagem_principal` e `fotos`

### Mapeamento Titulo -> URL

Os titulos no banco batem com as URLs do WordPress. Exemplos encontrados:

| Titulo no Banco | URL no WordPress |
|---|---|
| Helbor Alegria Patteo Mogilar | /imoveis/helbor-alegria/ |
| Condominio Mosaico Essence - Cod Fab01 | /imoveis/condominio-mosaico-essence-em-mogi-das-cruzes-cod-fab01/ |
| Condominio Real Park - Aruja/SP - PQ Ilha Grande | /imoveis/casa-condominio-real-park-aruja-sp-casa-pq-ilha-grande-cod-atra_109613/ |

Como os titulos NAO correspondem exatamente aos slugs, a funcao vai:
1. Primeiro, buscar a pagina de listagem (`/imoveis/`) e extrair TODOS os links de imoveis
2. Para cada imovel no banco, tentar encontrar a URL mais similar por fuzzy matching do titulo
3. Entrar na pagina do imovel e baixar as fotos

### Arquivo: `supabase/functions/auto-migrate-wp-images/index.ts`

Nova edge function que:
- Recebe apenas `organization_id` (sem necessidade de mapeamento manual)
- Faz crawling automatico do site WP para descobrir todas as paginas de imoveis
- Usa fuzzy matching para mapear titulos do banco com URLs do WP
- Baixa e faz upload das imagens para o storage `properties`
- Atualiza `imagem_principal` e `fotos` no banco
- Retorna relatorio detalhado do resultado

### Arquivo: `supabase/config.toml`

Adicionar configuracao da nova funcao com `verify_jwt = false`.

### Execucao

Apos deploy, chamar a funcao via curl passando apenas:
```json
{
  "organization_id": "30933022-a796-435e-8579-b1a02f70a822",
  "wp_base_url": "https://queroumimovel.com.br"
}
```

## Detalhes Tecnicos

### Fuzzy Matching
- Normalizar ambos os textos (remover acentos, lowercase, remover caracteres especiais)
- Comparar tokens comuns entre titulo do banco e texto do link WP
- Usar score de similaridade (% de tokens em comum)
- Threshold minimo de 60% para aceitar o match

### Scraping de Imagens
- Reutilizar a logica ja existente em `migrate-wp-images` para extrair imagens do `wp-content/uploads`
- Filtrar thumbnails (padroes `-NNNxNNN.ext`)
- Filtrar logos e elementos do site
- Limitar galeria a 15 fotos por imovel

### Storage
- Path: `orgs/{org_id}/properties/{property_id}/main.{ext}` e `gallery-{i}.{ext}`
- Bucket: `properties` (ja existente)
- Upsert para nao duplicar
