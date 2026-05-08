O usuário relatou dois problemas: o scroll dentro da lista de atribuição de leads não está funcionando corretamente e a atualização visual da atribuição é lenta (falta de feedback imediato).

### 1. Correção do Scroll
O problema do scroll geralmente ocorre quando o componente `Command` (da biblioteca `cmdk`) é usado dentro de um `Popover` ou `Dialog` sem a configuração correta de eventos, ou devido ao `CommandList` não lidar bem com o scroll nativo em certos contextos.
- Vou ajustar o `CommandList` e garantir que o container tenha as propriedades de scroll corretas.
- Vou remover a div de busca personalizada que adicionei manualmente e usar o `CommandInput` nativo que já inclui o ícone, evitando conflitos de layout.

### 2. Atribuição Instantânea (UI Otimista)
Atualmente, o sistema espera a resposta do banco de dados e o refetch dos dados para atualizar o nome e avatar do responsável. Isso causa a percepção de lentidão.
- Vou implementar uma **Atualização Otimista (Optimistic UI)**: assim que o usuário clica em um novo responsável, o estado local do lead será atualizado imediatamente na interface, enquanto a requisição acontece em segundo plano.
- Vou adicionar um estado de transição visual (loading sutil) no avatar do responsável para indicar que a alteração está sendo processada, mas já mostrando o novo nome/foto.

### Detalhes Técnicos

**Componente: LeadDetailDialog.tsx**
- Criar um estado local `localLead` inicializado com o `lead` recebido via props.
- Sincronizar o `localLead` quando a prop `lead` mudar (mas apenas se não houver uma operação em curso).
- No `handleAssignUser`:
    1. Identificar o usuário selecionado na lista `allUsers`.
    2. Atualizar o `localLead` imediatamente com o novo objeto `assignee` e `assigned_user_id`.
    3. Chamar a mutação do Supabase.
    4. Em caso de erro, reverter para o estado original.
- No JSX, usar o `localLead` para exibir o nome e avatar do responsável no cabeçalho e na seção de detalhes.

**Correção da Interface:**
- Simplificar o uso do `Command` removendo wrappers desnecessários que podem estar bloqueando o scroll.
- Garantir que o `PopoverContent` não tenha `overflow-hidden` se o `CommandList` precisar gerenciar o scroll.
