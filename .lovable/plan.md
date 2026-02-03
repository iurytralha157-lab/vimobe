
# Plano: Implementação de Push Notifications Nativas com Firebase Cloud Messaging

## Resumo Executivo
Implementar sistema de notificações push nativas para iOS e Android usando Firebase Cloud Messaging (FCM), integrando com o sistema existente de notificações do CRM para alertar sobre novos leads, tarefas e eventos financeiros mesmo quando o app está fechado.

---

## Arquitetura Proposta

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         ARQUITETURA FCM                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐     ┌──────────────────┐     ┌────────────────┐  │
│  │   App Mobile │────>│  Supabase DB     │────>│ Edge Function  │  │
│  │  (Capacitor) │     │ push_tokens      │     │ send-push      │  │
│  └──────────────┘     └──────────────────┘     └────────┬───────┘  │
│         │                                               │          │
│         │  Registra Token FCM                           │          │
│         v                                               v          │
│  ┌──────────────┐                              ┌────────────────┐  │
│  │ @capacitor/  │                              │ Firebase FCM   │  │
│  │ push-notif.  │<─────────────────────────────│    API v1      │  │
│  └──────────────┘     Envia Push Notification  └────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Etapas de Implementação

### Etapa 1: Configuração de Segurança (Pré-requisito)
**Importante**: A chave de Service Account que você compartilhou contém uma chave privada sensível que foi exposta. Você deve:

1. Acessar o Console do Firebase > Configurações do Projeto > Contas de serviço
2. Gerar uma nova chave privada
3. Revogar a chave antiga (`4a6f04be7c...`)
4. Adicionar a nova chave como secret no Lovable Cloud

**Secret a ser adicionado:**
- Nome: `FIREBASE_SERVICE_ACCOUNT`
- Valor: JSON completo da nova Service Account Key

---

### Etapa 2: Criar Tabela de Tokens Push (Banco de Dados)
Nova tabela para armazenar tokens de dispositivos:

**Tabela: `push_tokens`**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| user_id | UUID | Referência ao usuário |
| organization_id | UUID | Referência à organização |
| token | TEXT | Token FCM do dispositivo |
| platform | TEXT | 'android', 'ios' ou 'web' |
| device_info | JSONB | Informações do dispositivo |
| is_active | BOOLEAN | Se o token está ativo |
| created_at | TIMESTAMPTZ | Data de criação |
| updated_at | TIMESTAMPTZ | Última atualização |

**Políticas RLS:**
- Usuários podem gerenciar seus próprios tokens
- Service role pode acessar todos (para envio de push)

---

### Etapa 3: Edge Function para Envio de Push (Backend)
Nova Edge Function `send-push-notification`:

**Funcionalidades:**
- Autenticação com Firebase usando Google Auth Library
- Envio de notificações via FCM HTTP v1 API
- Suporte a dados extras (lead_id, tipo, ação)
- Tratamento de tokens inválidos (desativar automaticamente)

**Triggers automáticos:**
- Integração com trigger existente `notify_on_lead_insert`
- Integração com `notification-scheduler` para tarefas/financeiro

---

### Etapa 4: Hook de Push Notifications (Frontend)
Novo hook `src/hooks/use-push-notifications.ts`:

**Responsabilidades:**
1. Verificar se está em ambiente Capacitor
2. Solicitar permissão de push
3. Obter token FCM do dispositivo
4. Registrar/atualizar token no Supabase
5. Configurar listeners para push recebido
6. Navegação ao clicar na notificação

**Comportamento:**
- Só ativa em ambiente nativo (Capacitor)
- Fallback silencioso em ambiente web
- Atualiza token automaticamente ao mudar

---

### Etapa 5: Integração com Sistema Existente
Modificar hooks e triggers existentes:

**Arquivos a modificar:**
- `src/hooks/use-notifications.ts` - Integrar inicialização do push
- `src/components/layout/AppLayout.tsx` - Garantir hook é chamado
- `supabase/functions/notification-scheduler/index.ts` - Adicionar chamada de push

**Lógica de envio:**
```text
Notificação criada no DB
        │
        v
Trigger detecta INSERT
        │
        v
Chama Edge Function send-push
        │
        v
Busca tokens do usuário
        │
        v
Envia via FCM para cada token ativo
```

---

### Etapa 6: Configuração Capacitor (Instruções para você)

Após eu implementar o código, você precisará:

1. **No projeto local (após git pull):**
   ```bash
   npm install @capacitor/push-notifications
   npx cap sync
   ```

2. **Arquivo `google-services.json`:**
   - Copiar para `android/app/google-services.json`

3. **Para iOS (se aplicável):**
   - Configurar APNs no Firebase Console
   - Adicionar `GoogleService-Info.plist` ao projeto Xcode

---

## Prioridades de Notificação Push

| Tipo | Prioridade | Ação ao Clicar |
|------|-----------|----------------|
| Novo Lead | Alta | Abre detalhes do lead |
| Tarefa atrasada | Alta | Abre agenda/lead |
| Conta vencendo | Alta | Abre financeiro |
| Tarefa agendada | Normal | Abre agenda |
| Feature request | Baixa | Abre Central de Ajuda |

---

## Arquivos a Criar/Modificar

**Novos arquivos:**
1. `supabase/migrations/xxx_create_push_tokens.sql` - Tabela e RLS
2. `supabase/functions/send-push-notification/index.ts` - Edge Function
3. `src/hooks/use-push-notifications.ts` - Hook Capacitor
4. `capacitor.config.ts` - Configuração Capacitor (se não existir)

**Arquivos modificados:**
1. `supabase/config.toml` - Adicionar nova função
2. `src/hooks/use-notifications.ts` - Integrar push
3. `src/components/layout/AppLayout.tsx` - Inicializar push
4. `supabase/functions/notification-scheduler/index.ts` - Chamar push
5. `package.json` - Adicionar dependência Capacitor

---

## Próximo Passo Imediato

Antes de implementar, você precisa:

1. **Gerar nova Service Account Key** no Firebase Console (a atual foi exposta)
2. **Clicar no botão que aparecerá** para adicionar o secret `FIREBASE_SERVICE_ACCOUNT`

Confirme quando tiver a nova chave pronta que eu prossigo com a implementação!
