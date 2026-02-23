

# Correcao de Espaçamentos na Pagina de Planos de Servico

## Problema

Os blocos (cards) na pagina de Planos de Servico possuem espaçamentos internos inconsistentes, nao seguindo o padrao de spacing da plataforma.

## Alteracoes

### 1. Cards de Estatisticas (ServicePlans.tsx)

Os 5 cards de estatisticas (Total, PF, PJ, Movel, Adicional) usam apenas `CardHeader` com `pb-2`, sem `CardContent`, deixando o conteudo sem respiro inferior adequado.

**Correcao**: Ajustar o padding do `CardHeader` para `pb-3 pt-4` e adicionar padding horizontal consistente, garantindo espaço interno uniforme.

### 2. PlanCard (PlanCard.tsx)

O card de plano tem `CardHeader className="pb-2"` e `CardContent className="space-y-3"` sem padding inferior explicito.

**Correcao**: Aplicar o padrao de espaçamento interno da plataforma:
- `CardHeader`: manter `pb-3` para separar do conteudo
- `CardContent`: adicionar `px-4 md:px-6 pb-4` seguindo o padrao documentado de spacing interno
- Botoes de acao: ajustar `pt-3` no separador para dar mais respiro

### Arquivos a modificar

1. **`src/pages/ServicePlans.tsx`** -- padding dos stats cards (linhas 119-161)
2. **`src/components/plans/PlanCard.tsx`** -- padding do CardHeader e CardContent (linhas 56, 72)

