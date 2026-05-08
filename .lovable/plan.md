Eu identifiquei os problemas relatados na aba de Gestão (Equipes e Escala).

### Problemas Identificados:
1.  **Escala não salva (reseta para o padrão)**: Ao desativar a escala de um membro para determinados dias (ex: desmarcar Segunda-feira), o sistema deleta o registro no banco de dados. Ao reabrir a configuração, como não existe registro para aquele dia, o sistema aplica o padrão automático (Segunda a Sexta), fazendo parecer que a alteração não foi salva.
2.  **Membros inativos aparecendo**: A listagem de equipes e a seleção de novos membros não estão filtrando usuários desativados (`is_active: false`), o que faz com que pessoas que não fazem mais parte do CRM continuem aparecendo na gestão.

### Soluções Propostas:
1.  **Ajuste na Escala**:
    *   Alterar o salvamento para manter os registros de todos os dias da semana, salvando explicitamente o status `is_active: false` quando o dia for desmarcado.
    *   Corrigir a lógica de carregamento para que, caso um registro não exista, ele não assuma automaticamente o padrão de "Segunda a Sexta" se o usuário já tiver outras configurações de escala.
2.  **Filtro de Membros**:
    *   Atualizar a busca de equipes para filtrar apenas membros ativos.
    *   Atualizar a seleção de membros (ao criar/editar equipe) para mostrar apenas usuários ativos no sistema.
    *   Garantir que usuários deletados ou sem vínculo válido com o CRM não apareçam nas listagens.

### Detalhes Técnicos:
*   **Hooks**: Atualização em `use-member-availability.ts`, `use-teams.ts` e `use-users.ts` para incluir filtros de `is_active` e persistência correta de status desativado.
*   **Componentes**: Ajuste em `MemberAvailabilityDialog.tsx` para tratar corretamente a ausência de registros sem recorrer a valores padrão de "Segunda a Sexta".
*   **Database**: As tabelas `member_availability` e `users` já possuem os campos necessários (`is_active`), sendo apenas necessário ajustar as queries.