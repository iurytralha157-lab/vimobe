## Plano

1. Ajustar apenas `src/components/shared/SharedFilters.tsx`.
2. Manter o `Popover` controlado com `filtersOpen`, para ele não fechar/recriar durante a digitação.
3. Garantir que o campo de busca use `localSearch` local com debounce de 300ms antes de chamar `onSearchChange`.
4. Sincronizar `localSearch` com `searchQuery` externo somente quando forem diferentes, evitando re-render desnecessário.
5. Não alterar filtros, layout, queries, páginas, permissões ou qualquer outro arquivo.
6. Validar que o arquivo compila sem erro após a alteração.