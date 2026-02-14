

# Navegacao da notificacao de telefone para Configuracoes

## Resumo

Quando o usuario clicar na notificacao de lembrete de telefone, ele sera redirecionado para a pagina de Configuracoes na aba de perfil (Conta). Hoje, o sistema so redireciona notificacoes que tem um `lead_id` associado. Vamos adicionar uma logica para identificar notificacoes do tipo "atualizar telefone" e navegar para `/settings`.

## Implementacao

### 1. Novo hook `use-phone-reminder.ts`

Criar o hook conforme ja aprovado, com um detalhe adicional: o conteudo da notificacao incluira um marcador identificavel para que os handlers de clique saibam redirecionar corretamente. Usaremos o titulo exato "Atualize seu telefone" como identificador.

### 2. Atualizar `handleNotificationClick` em 3 arquivos

Adicionar uma condicao nos handlers de clique de notificacao: se o titulo da notificacao contem "Atualize seu telefone", navegar para `/settings` (que ja abre na aba Conta/perfil).

Arquivos afetados:
- `src/components/layout/AppHeader.tsx` (dropdown de notificacoes no header)
- `src/pages/Notifications.tsx` (pagina completa de notificacoes)
- `src/components/admin/AdminHeader.tsx` (header do admin)

A logica adicionada em cada handler sera:

```text
if (notification.title?.includes('Atualize seu telefone')) {
  navigate('/settings');
  return;
}
```

### 3. Integracao no `AppLayout.tsx`

Importar e chamar `usePhoneReminder()` no `AppLayoutContent`, junto aos hooks existentes.

## Sequencia de alteracoes

1. Criar `src/hooks/use-phone-reminder.ts`
2. Adicionar chamada do hook em `src/components/layout/AppLayout.tsx`
3. Atualizar handler de clique em `src/components/layout/AppHeader.tsx`
4. Atualizar handler de clique em `src/pages/Notifications.tsx`
5. Atualizar handler de clique em `src/components/admin/AdminHeader.tsx`

