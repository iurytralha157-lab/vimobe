

# Renomear aba "Equipe" para "Usuarios" nas Configuracoes

## Problema
A aba "Equipe" nas Configuracoes causa confusao porque ja existe uma pagina separada de Equipes no sistema. O conteudo dessa aba e sobre gerenciamento de usuarios (adicionar, editar roles, ativar/desativar), nao sobre equipes.

## Solucao

Alterar o label da aba de "Equipe" para "Usuarios" no arquivo `src/pages/Settings.tsx`.

### Detalhes Tecnicos

**Arquivo: `src/pages/Settings.tsx` (linha ~50)**

Alterar:
```
{ value: 'team', label: 'Equipe', icon: Users },
```
Para:
```
{ value: 'team', label: 'Usuários', icon: Users },
```

Apenas o label visual muda. O `value` interno permanece `'team'` para nao quebrar nenhuma referencia.

