

# Igualar altura do grafico de Evolucao com o Funil

## Problema
O card "Evolucao de Negocios" tem uma altura fixa de 250-300px para o grafico, enquanto o Funil ao lado cresce dinamicamente. Isso causa um espaco vazio grande abaixo do grafico quando o funil e maior.

## Solucao
Remover a altura fixa do container do grafico e usar `flex-1` para que ele preencha todo o espaco disponivel do card, acompanhando a altura do funil automaticamente via CSS Grid.

### Arquivo: `src/components/dashboard/DealsEvolutionChart.tsx`

Trocar o container do grafico de:
```
<div className="min-h-[250px] h-[250px] sm:h-[300px]">
```
Para:
```
<div className="flex-1 min-h-[200px]">
```

Isso faz o `ResponsiveContainer` do Recharts preencher toda a altura disponivel, igualando automaticamente com o card do funil ao lado no grid.

