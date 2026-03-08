

# Filtrar dropdown "Responsável" por permissão no Telecom

## Problema
No dialog "Novo Cliente" (Telecom), o dropdown "Responsável" mostra todos os usuários da organização. Usuários sem permissão adequada deveriam ver apenas seu próprio nome.

## Solução
Filtrar a lista de usuários exibida no dropdown com base nas permissões do usuário logado:

1. **No `CreateLeadDialog.tsx`** (linha ~54 e ~788-794):
   - Importar `useUserPermissions`
   - Criar uma lista filtrada: se o usuário tem `lead_view_all` ou é admin, mostra todos os usuários; caso contrário, mostra apenas o próprio usuário
   - Aplicar essa lista filtrada no `<SelectContent>` do campo "Responsável"

2. **Lógica de filtragem**:
   - `hasPermission('lead_view_all')` → mostra todos
   - Caso contrário → mostra apenas `users.filter(u => u.id === profile.id)`

## Escopo
- Apenas o componente `CreateLeadDialog.tsx` precisa ser alterado
- Nenhuma mudança de backend necessária (a permissão já existe no RBAC)

