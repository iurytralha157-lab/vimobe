

# Plano: Corrigir Visibilidade de Sessões WhatsApp (Privacidade)

## Problema Identificado

O administrador Fernando está com acesso configurado corretamente na sessão "maikson" e é proprietário de "Vendas MCMV", mas não consegue ver as conversas porque há uma inconsistência entre as regras de acesso:

| Componente | Comportamento Atual | Comportamento Esperado |
|------------|---------------------|------------------------|
| `useHasWhatsAppAccess` | Retorna `true` para admins automaticamente | Verificar acesso real (proprietário OU acesso explícito) |
| `useAccessibleSessions` | Retorna apenas sessões com acesso (correto) | ✓ Já está correto |
| RLS `whatsapp_conversations` | Usa `is_admin()` dando acesso total | Verificar proprietário OU acesso explícito |
| RLS `whatsapp_messages` | Provavelmente usa `is_admin()` também | Verificar proprietário OU acesso explícito |

### Regra de Negócio Desejada

1. **Proprietário** da sessão: vê todas as conversas daquela sessão
2. **Usuário com acesso concedido** (checkzinho em "Acessos"): vê as conversas daquela sessão
3. **Admin SEM acesso configurado**: NÃO vê conversas de outras sessões (privacidade)
4. **Super Admin**: mantém acesso total para suporte técnico

---

## Solução

### Mudança 1: Atualizar `use-whatsapp-access.ts`

Remover a exceção automática para admins. O hook deve verificar se o usuário tem acesso real (proprietário OU acesso explícito):

```typescript
// ANTES (linha 17-19)
if (profile.role === 'admin') {
  return true;
}

// DEPOIS - REMOVER essa exceção
// Agora admins também precisam ser proprietários ou ter acesso concedido
```

### Mudança 2: Atualizar RLS de `whatsapp_conversations`

Remover `is_admin()` das policies de SELECT e UPDATE:

```sql
-- Policy: Users can view conversations from accessible sessions
-- ANTES:
(owner_user_id = auth.uid() OR is_admin() OR session_id IN (...))

-- DEPOIS:
(owner_user_id = auth.uid() OR session_id IN (...))
```

### Mudança 3: Atualizar RLS de `whatsapp_messages`

Mesma correção para garantir consistência.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/use-whatsapp-access.ts` | Remover exceção para `role === 'admin'` |
| Nova migration SQL | Atualizar RLS policies de `whatsapp_conversations` e `whatsapp_messages` |

---

## Resultado Esperado

Após a correção, Fernando verá:

- ✅ Conversas da sessão "Vendas MCMV" (proprietário)
- ✅ Conversas da sessão "maikson" (acesso concedido)
- ❌ Conversas de Gabriel, Guilherme, Raquel (sem acesso)

No dropdown "Todos os canais" aparecerá:
- "Vendas MCMV" 
- "maikson"

---

## Seção Técnica

### Por que o problema acontece

O hook `useHasWhatsAppAccess` retorna `true` para admins (linha 17-19), fazendo o FloatingChat aparecer. Porém, o `useAccessibleSessions` corretamente não inclui sessões extras para admins.

A query de conversas usa as sessions acessíveis do hook, mas a RLS do banco tem `OR is_admin()` que não está sendo usado porque a filtragem é feita pelo hook antes.

O resultado é uma tela vazia: o chat abre mas não há sessões nem conversas.

### RLS a ser removida

```sql
-- Remover is_admin() das policies:
-- 1. "Users can view conversations from accessible sessions" (SELECT)
-- 2. "Users can update conversations from accessible sessions" (UPDATE)
```

### Impacto da mudança

- Admins perdem visibilidade automática de todas as conversas
- Admins podem se conceder acesso a qualquer sessão via "Acessos"
- Super Admins mantêm acesso total para suporte técnico
- Privacidade das conversas é preservada conforme solicitado

