

# Menu Padrao Automatico ao Criar Site

## Resumo
Quando o site for criado (ou quando a aba Menu for acessada pela primeira vez sem itens), inserir automaticamente os itens de menu padrao: HOME, IMOVEIS, APARTAMENTO, CASA, SOBRE e CONTATO. O admin pode depois excluir, editar ou reordenar qualquer um deles.

## Abordagem
Modificar o hook `useCreateOrganizationSite` para que, apos criar o site com sucesso, tambem insira os itens de menu padrao na tabela `site_menu_items`.

## Itens padrao que serao criados

| Posicao | Label | Tipo | Href |
|---------|-------|------|------|
| 0 | HOME | page | (vazio) |
| 1 | IMOVEIS | page | imoveis |
| 2 | APARTAMENTO | filter | imoveis?tipo=Apartamento |
| 3 | CASA | filter | imoveis?tipo=Casa |
| 4 | SOBRE | page | sobre |
| 5 | CONTATO | page | contato |

## Detalhes Tecnicos

### Arquivo modificado: `src/hooks/use-organization-site.ts`

Na funcao `useCreateOrganizationSite`, no callback `onSuccess`, inserir os 6 itens padrao na tabela `site_menu_items` usando o `organization_id` da organizacao. Isso garante que toda vez que um novo site for criado, o menu ja vem pre-populado.

```typescript
onSuccess: async () => {
  // Seed default menu items
  const defaults = [
    { label: 'HOME', link_type: 'page', href: '', position: 0 },
    { label: 'IMÓVEIS', link_type: 'page', href: 'imoveis', position: 1 },
    { label: 'APARTAMENTO', link_type: 'filter', href: 'imoveis?tipo=Apartamento', position: 2 },
    { label: 'CASA', link_type: 'filter', href: 'imoveis?tipo=Casa', position: 3 },
    { label: 'SOBRE', link_type: 'page', href: 'sobre', position: 4 },
    { label: 'CONTATO', link_type: 'page', href: 'contato', position: 5 },
  ];
  await supabase.from('site_menu_items').insert(
    defaults.map(d => ({ ...d, organization_id: organization.id, open_in_new_tab: false, is_active: true }))
  );
  queryClient.invalidateQueries({ queryKey: ['site-menu-items'] });
  // ...existing toast
}
```

### Para sites ja existentes (sem menu configurado)
Tambem adicionar um botao "Carregar Menu Padrao" no componente `MenuTab.tsx` que aparece apenas quando a lista de itens esta vazia. Ao clicar, insere os mesmos itens padrao. Isso cobre organizacoes que ja criaram o site antes dessa feature existir.

### Arquivos modificados
1. `src/hooks/use-organization-site.ts` -- seed de menu padrao no `onSuccess` do create
2. `src/components/site/MenuTab.tsx` -- botao "Carregar Menu Padrao" quando lista vazia

