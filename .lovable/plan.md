

# Sistema Completo de Temas e Cores para o Site Publico

## Resumo
Implementar um sistema robusto de personalizacao visual do site publico, incluindo: escolha entre tema claro/escuro, cores de fundo e fonte configuraveis, e uso efetivo da cor de destaque (accent) que hoje existe no banco mas nao e utilizada em nenhuma pagina publica.

## Problema Atual
1. **Cor de destaque (`accent_color`)**: Existe no banco e na pagina de configuracoes, mas NAO e utilizada em nenhuma pagina do site publico -- apenas `primary_color` e `secondary_color` sao usadas
2. **Tema fixo escuro**: O site publico esta hardcoded com fundo `#0D0D0D`, texto branco e backgrounds `bg-white`/`bg-gray-50` nas secoes de conteudo -- nao ha opcao de tema claro
3. **Sem controle de cor de fonte/fundo**: O usuario nao pode personalizar a cor de fundo das secoes de conteudo nem a cor dos textos

## Solucao

### 1. Migration SQL - Novos campos
Adicionar 3 novas colunas na tabela `organization_sites`:
- `site_theme` (text, default `'dark'`) - Tema: `'dark'` ou `'light'`
- `background_color` (text, default `'#0D0D0D'`) - Cor de fundo principal
- `text_color` (text, default `'#FFFFFF'`) - Cor da fonte principal

### 2. Interfaces TypeScript
Atualizar as interfaces em:
- `src/hooks/use-organization-site.ts` (`OrganizationSite`)
- `src/hooks/use-public-site.ts` (`PublicSiteConfig`)

Adicionar os 3 novos campos em cada interface.

### 3. Pagina de Configuracoes (`src/pages/SiteSettings.tsx`)
Na aba "Aparencia", na secao de Cores, adicionar:

- **Seletor de Tema**: Toggle ou select com opcoes "Claro" e "Escuro"
- **Cor de Fundo**: Color picker (muda automaticamente para `#FFFFFF` no tema claro ou `#0D0D0D` no escuro ao trocar tema, mas permite ajuste manual)
- **Cor da Fonte**: Color picker (muda automaticamente para `#1A1A1A` no tema claro ou `#FFFFFF` no escuro)
- Manter os 3 existentes: Cor Principal, Cor Secundaria, Cor de Destaque

Preview atualizado mostrando como ficam os botoes e textos com as cores escolhidas.

### 4. Mapeadores de dados
Atualizar `mapSiteDataToConfig` nos 3 arquivos:
- `src/contexts/PublicSiteContext.tsx`
- `src/pages/public/PublishedSiteWrapper.tsx`
- `src/pages/public/PreviewSiteWrapper.tsx`

### 5. Layout do Site Publico (`src/pages/public/PublicSiteLayout.tsx`)
Substituir cores hardcoded por valores dinamicos do `siteConfig`:
- `bg-[#0D0D0D]` --> `style={{ backgroundColor: siteConfig.background_color }}`
- `text-white` --> `style={{ color: siteConfig.text_color }}`
- `border-white/10` --> opacidade relativa a cor do texto
- Header glassmorphism: adaptar para tema claro (fundo preto/branco semi-transparente conforme tema)
- Footer: usar `secondary_color` (ja faz isso) + `text_color`

### 6. Paginas do site publico - Remover cores hardcoded
Atualizar os seguintes arquivos para usar cores dinamicas via `siteConfig`:

- **`PublicHome.tsx`**: Substituir `bg-[#0D0D0D]`, `bg-white`, `bg-gray-50`, `text-gray-900` por cores do config. Usar `accent_color` nos badges de "Destaque" e "Exclusivos"
- **`PublicProperties.tsx`**: Backgrounds e textos dinamicos
- **`PublicPropertyDetail.tsx`**: Backgrounds e textos dinamicos
- **`PublicAbout.tsx`**: Backgrounds e textos dinamicos
- **`PublicContact.tsx`**: Backgrounds e textos dinamicos
- **`PublicFavorites.tsx`**: Backgrounds e textos dinamicos

### 7. Uso da Cor de Destaque (`accent_color`)
Aplicar `accent_color` em elementos especificos do site:
- Badges de "Destaque" nos imoveis
- Tags de tipo de imovel
- Hover states em links
- Bordas de cards em destaque
- Icones de features (quartos, vagas, etc)
- Separadores visuais e detalhes decorativos

Isso diferencia visualmente elementos de destaque dos elementos de navegacao/acao (que usam `primary_color`).

### 8. `resolve_site_domain` (funcao SQL)
Adicionar os 3 novos campos (`site_theme`, `background_color`, `text_color`) ao `jsonb_build_object` retornado.

## Detalhes Tecnicos

### Estrutura de Cores Final
| Campo | Uso no Site | Exemplo Tema Escuro | Exemplo Tema Claro |
|-------|-------------|--------------------|--------------------|
| `background_color` | Fundo principal, secoes | `#0D0D0D` | `#FFFFFF` |
| `text_color` | Textos, paragrafos | `#FFFFFF` | `#1A1A1A` |
| `primary_color` | Botoes CTA, links nav, headers de secao | `#F97316` | `#F97316` |
| `secondary_color` | Footer, header fundo, secoes alternadas | `#1E293B` | `#F8FAFC` |
| `accent_color` | Badges destaque, tags, icones, detalhes | `#3B82F6` | `#3B82F6` |

### Secoes alternadas
Para criar ritmo visual, as secoes do site alternam entre `background_color` e uma variacao sutil (ex: no tema claro `bg-gray-50`, no escuro `bg-white/5`). Isso sera calculado dinamicamente com base no tema escolhido.

### Arquivos modificados (total: ~12 arquivos)
1. Migration SQL (1 arquivo)
2. `use-organization-site.ts`
3. `use-public-site.ts`
4. `SiteSettings.tsx`
5. `PublicSiteContext.tsx`
6. `PublishedSiteWrapper.tsx`
7. `PreviewSiteWrapper.tsx`
8. `PublicSiteLayout.tsx`
9. `PublicHome.tsx`
10. `PublicProperties.tsx`
11. `PublicContact.tsx`
12. `PublicAbout.tsx`
13. `PublicPropertyDetail.tsx`
14. `PublicFavorites.tsx`
15. `resolve_site_domain` (funcao SQL)

