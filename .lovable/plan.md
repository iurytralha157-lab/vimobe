
# Melhorar exibicao de features nos cards e formulario

## Problema atual

1. **Cards do site publico**: Nem todos os cards mostram quartos, banheiros, vagas e metros quadrados de forma consistente. Em PublicHome, falta banheiros. Em RelatedProperties, faltam banheiros e vagas.
2. **Logica de exibicao**: Os cards usam `property.quartos && (...)` que oculta o valor quando e `0`. Se o imovel tem 0 quartos (ex: studio, sala comercial), nada aparece.
3. **Suites vs Quartos**: Quando o imovel nao tem suites, a referencia pede mostrar quartos normalmente. Quando tem suites, mostrar suites no lugar.
4. **Formulario**: O campo de quartos e um input livre. Precisa aceitar `0` como valor valido.

## Mudancas planejadas

### 1. Cards do site publico - Padronizar features

Em todos os 3 arquivos de cards (PublicProperties, PublicHome, RelatedProperties), a linha de features vai mostrar:

- **Quartos ou Suites**: Se tiver suites > 0, mostra suites (com icone de cama). Senao, mostra quartos (incluindo 0).
- **Banheiros**: Sempre que disponivel (incluindo 0).
- **Vagas**: Sempre que disponivel (incluindo 0).
- **Metros quadrados**: area_util ou area_total, o que estiver preenchido.

A logica de exibicao muda de `property.quartos &&` (que esconde 0) para `property.quartos != null` (que mostra 0).

### 2. Formulario de imoveis - Aceitar 0 quartos

No `PropertyFormDialog.tsx`, trocar o campo de quartos de `type="number"` livre para um `Select` com opcoes de 0 a 10+, permitindo selecionar explicitamente 0 quartos.

### 3. Edge function - RelatedProperties

Atualizar a query de imoveis relacionados em `public-site-data` para incluir `banheiros`, `vagas` e `suites` no select.

## Arquivos afetados

- `src/pages/public/PublicProperties.tsx` - Adicionar Bath import, logica suites vs quartos, exibir 0
- `src/pages/public/PublicHome.tsx` - Adicionar Bath import nos featured e all, logica suites vs quartos, exibir 0
- `src/components/public/property-detail/RelatedProperties.tsx` - Adicionar Bath, Car imports, campos na interface, exibir banheiros e vagas
- `src/components/properties/PropertyFormDialog.tsx` - Trocar input de quartos por Select com opcao 0
- `supabase/functions/public-site-data/index.ts` - Adicionar banheiros, vagas, suites na query de related

## Detalhes tecnicos

### Logica de exibicao (aplicada em todos os cards)

```text
// Quartos ou Suites
if suites != null && suites > 0:
  mostrar icone Bed + suites + "suites"
else if quartos != null:
  mostrar icone Bed + quartos

// Banheiros
if banheiros != null:
  mostrar icone Bath + banheiros

// Vagas
if vagas != null:
  mostrar icone Car + vagas

// Area
if area_util || area_total:
  mostrar icone Maximize + valor + "m2"
```

### Formulario - Select de quartos

Opcoes: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10+

### Edge function - Query related

Mudar de:
```text
select('id, code, title, preco, tipo_de_imovel, quartos, area_util, bairro, cidade, imagem_principal')
```
Para:
```text
select('id, code, title, preco, tipo_de_imovel, quartos, suites, banheiros, vagas, area_util, bairro, cidade, imagem_principal')
```
