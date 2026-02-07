
# Redesign da Página de Configurações

## Resumo das Mudanças

Reorganização completa das abas de configurações para melhor UX: juntar informações relacionadas, usar layouts 50/50 e automatizar a sincronização de fotos do WhatsApp.

---

## 1. Nova Aba "Conta" (junção Perfil + Empresa)

### Layout Lado a Lado (50% cada)
- **Coluna esquerda**: Perfil do usuário (avatar, nome, dados pessoais)
- **Coluna direita**: Dados da empresa (nome, CNPJ, endereço da empresa)
- A seção de **Senha** permanece embaixo, ocupando largura total

### Estrutura Visual
```text
┌─────────────────────────────────────────────────────────────┐
│                        Minha Conta                          │
├────────────────────────────┬────────────────────────────────┤
│      MEU PERFIL            │         MINHA EMPRESA          │
│  [Avatar] Nome, Email      │   Nome da Empresa              │
│  CPF, Telefone, WhatsApp   │   CNPJ, Razão Social           │
│  Endereço pessoal          │   Endereço da empresa          │
│  Idioma                    │   Contato, Website             │
│  [Salvar]                  │   Comissão padrão              │
│                            │   [Salvar] (só admin)          │
├────────────────────────────┴────────────────────────────────┤
│                      ALTERAR SENHA                          │
│       Nova senha                Confirmar senha             │
│                          [Alterar]                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Nova Aba "Equipe" (junção Usuários + Funções)

### Layout Lado a Lado (50% cada)
- **Coluna esquerda**: Lista de usuários com ações (criar, editar role, ativar/desativar, excluir)
- **Coluna direita**: Funções/cargos personalizados (criar, editar permissões)

### Estrutura Visual
```text
┌─────────────────────────────────────────────────────────────┐
│                         Equipe                              │
├────────────────────────────┬────────────────────────────────┤
│       USUÁRIOS             │         FUNÇÕES                │
│  [+ Novo Usuário]          │   [+ Nova Função]              │
│                            │                                │
│  ┌──────────────────────┐  │   ┌────────────────────────┐   │
│  │ Avatar  João Silva   │  │   │ Gerente (cor verde)    │   │
│  │ Admin ▼  Ativo ⏽    │  │   │ 12 permissões          │   │
│  └──────────────────────┘  │   │ [Editar] [Excluir]     │   │
│  ┌──────────────────────┐  │   └────────────────────────┘   │
│  │ Avatar  Maria        │  │   ┌────────────────────────┐   │
│  │ User ▼  Vendedor ▼  │  │   │ Vendedor (cor azul)    │   │
│  └──────────────────────┘  │   │ 8 permissões           │   │
│                            │   └────────────────────────┘   │
└────────────────────────────┴────────────────────────────────┘
```

### Visibilidade da Coluna Funções
- Apenas **admins** veem a coluna de Funções
- Usuários comuns veem apenas a lista de colegas (sem edição)

---

## 3. WhatsApp - Sincronização Automática de Fotos

### Implementação
- Quando uma **nova mensagem** chega via webhook (`evolution-webhook`), se a conversa não tem foto de perfil, buscar automaticamente
- Remover o botão manual "Sincronizar Fotos" da interface
- A sincronização acontece de forma assíncrona para não bloquear o processamento da mensagem

### Alteração no Webhook
No arquivo `supabase/functions/evolution-webhook/index.ts`, após processar uma mensagem, verificar:
1. A conversa tem `contact_picture = null`?
2. Se sim, chamar `fetchProfilePictureUrl` e atualizar

---

## 4. Reorganização das Abas

### Antes (6-7 abas)
1. Meu Perfil
2. Empresa
3. Usuários
4. Funções (admin)
5. Webhooks
6. Meta
7. WhatsApp

### Depois (4-5 abas)
1. **Conta** (Perfil + Empresa lado a lado)
2. **Equipe** (Usuários + Funções lado a lado)
3. Webhooks
4. Meta
5. WhatsApp (sem botão de sync manual)

---

## Arquivos a Serem Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Settings.tsx` | Reorganizar abas, remover "profile", "organization", "users", "roles" e adicionar "account" e "team" |
| `src/components/settings/AccountTab.tsx` | **Novo arquivo** - Layout 50/50 com perfil à esquerda e empresa à direita |
| `src/components/settings/TeamTab.tsx` | **Novo arquivo** - Layout 50/50 com usuários à esquerda e funções à direita |
| `src/components/settings/WhatsAppTab.tsx` | Remover botão "Sincronizar Fotos" |
| `supabase/functions/evolution-webhook/index.ts` | Adicionar auto-sync de foto de perfil quando não existe |

---

## Detalhes Técnicos

### AccountTab.tsx
- Usar `grid grid-cols-1 lg:grid-cols-2 gap-6` para layout responsivo
- Cada coluna é um Card independente
- Seção de senha fica em um Card abaixo com `col-span-full`

### TeamTab.tsx  
- Layout similar ao AccountTab
- A coluna de funções só renderiza se `profile?.role === 'admin' || isSuperAdmin`
- Se não for admin, a coluna de usuários ocupa 100%

### Auto-sync de Fotos
- Executar a busca de foto em `setTimeout` para não bloquear
- Adicionar flag `picture_fetched_at` na conversa para evitar tentativas repetidas
- Limite de 1 tentativa por conversa (se falhar, não tentar novamente automaticamente)
