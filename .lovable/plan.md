

# Gerenciador de Menu Dinamico do Site Publico

## Resumo
Criar um sistema completo de gerenciamento de menu para o site publico, permitindo ao admin configurar links para paginas internas, filtros de categoria e URLs externas, com reordenacao via drag-and-drop.

## Etapas de Implementacao

### 1. Criar tabela `site_menu_items` (Migration SQL)

Nova tabela para armazenar os itens de menu por organizacao, com RLS para acesso publico de leitura e gestao restrita a membros da organizacao.

Campos: `id`, `organization_id`, `label`, `link_type` (page/filter/external), `href`, `position`, `open_in_new_tab`, `is_active`, `created_at`.

### 2. Criar hook admin: `src/hooks/use-site-menu.ts`

CRUD completo para gerenciar itens de menu:
- `useSiteMenuItems()` - lista itens ordenados por posicao
- `useCreateMenuItem()` - cria novo item
- `useUpdateMenuItem()` - edita item existente
- `useDeleteMenuItem()` - remove item
- `useReorderMenuItems()` - atualiza posicoes em batch apos drag-and-drop

### 3. Criar hook publico: `src/hooks/use-public-site-menu.ts`

Hook simples que busca itens ativos do menu para uma organizacao (sem autenticacao), usado pelo site publico.

### 4. Adicionar aba "Menu" no SiteSettings

Modificar `src/pages/SiteSettings.tsx`:
- Alterar grid de 5 para 6 colunas nas tabs
- Adicionar nova aba "Menu" com icone `Menu` (lucide)
- Conteudo da aba:
  - Lista de itens com drag-and-drop (`@hello-pangea/dnd`, ja instalado)
  - Cada item mostra label, tipo (badge colorido), botoes de editar/remover
  - Botao "Adicionar Item" abre dialog com formulario:
    - Select de tipo: Pagina Interna / Filtro de Categoria / Link Externo
    - Campos dinamicos conforme o tipo selecionado
    - Para "Pagina Interna": select com Home, Imoveis, Sobre, Contato, Favoritos
    - Para "Filtro de Categoria": select com tipos de imovel cadastrados + Aluguel
    - Para "Link Externo": campos Label + URL + checkbox "Abrir em nova aba"

### 5. Atualizar `PublicSiteLayout.tsx` para menu dinamico

Modificar `src/pages/public/PublicSiteLayout.tsx`:
- Importar `usePublicSiteMenu`
- Se existirem itens configurados no banco, renderizar esses itens no lugar dos arrays `mainNavLinks` e `filterLinks` hardcoded
- Manter fallback para o menu atual caso nenhum item esteja configurado
- Links externos com `open_in_new_tab` usam `<a target="_blank">`
- Links internos continuam usando `<Link>` do react-router

### Arquivos criados/modificados

1. **Migration SQL** - tabela `site_menu_items` + RLS
2. **`src/hooks/use-site-menu.ts`** - CRUD admin (novo)
3. **`src/hooks/use-public-site-menu.ts`** - leitura publica (novo)
4. **`src/pages/SiteSettings.tsx`** - nova aba "Menu" com drag-and-drop
5. **`src/pages/public/PublicSiteLayout.tsx`** - renderizacao dinamica do menu

