

# Auditoria e Plano: Push Notifications Remotas (iOS/Android)

## 1. Resultado da Auditoria

### O que já existe (Backend 95% pronto!)

| Componente | Status | Detalhes |
|------------|--------|----------|
| **Tabela `push_tokens`** | ✅ Existe | Armazena tokens por user/organization/platform |
| **Edge Function `send-push-notification`** | ✅ Existe | Usa FCM HTTP v1 API corretamente |
| **Secret `FIREBASE_SERVICE_ACCOUNT`** | ✅ Configurado | JSON do Service Account está no Supabase |
| **Trigger automático** | ✅ Existe | `trigger_push_on_notification_insert` dispara push ao inserir notification |
| **Hook `usePushNotifications`** | ✅ Existe | Pede permissão, registra token, salva no banco |
| **Inicialização no App** | ✅ Existe | `AppLayout.tsx` chama `usePushNotifications()` |
| **Capacitor Push** | ✅ Instalado | `@capacitor/push-notifications` no package.json |

### Diagnóstico: Por que não funciona com app fechado?

```text
+------------------+     +------------------+     +------------------+
|   Lead Created   | --> | Notification DB  | --> | Trigger pg_net   |
|   (webhook/app)  |     | INSERT           |     | HTTP POST        |
+------------------+     +------------------+     +------------------+
                                                          |
                                                          v
                                            +---------------------------+
                                            | send-push-notification    |
                                            | Edge Function             |
                                            +---------------------------+
                                                          |
                                                          v
                                            +---------------------------+
                                            | Firebase Cloud Messaging  |
                                            | FCM HTTP v1 API           |
                                            +---------------------------+
                                                          |
                                                          v
                                            +---------------------------+
                                            | APNs (Apple) / FCM (And)  |
                                            +---------------------------+
                                                          |
                                                          v
                                            +---------------------------+
                                            | Push no dispositivo       | ❌ FALHA AQUI
                                            +---------------------------+
```

**O problema NÃO está no código, está na configuração externa:**

1. **iOS requer configuração APNs no Firebase** - Sem isso, o Firebase não consegue enviar para iPhones
2. **O projeto Capacitor não foi buildado localmente** - `capacitor.config.ts` não existe no projeto
3. **Nenhum token registrado** - A tabela `push_tokens` está vazia (nenhum dispositivo se registrou ainda)

---

## 2. O que você PRECISA fazer (configuração externa)

### Passo 1: Criar projeto Firebase (se ainda não existe)

1. Acesse **console.firebase.google.com**
2. Clique **"Adicionar projeto"**
3. Nome: `vimob-crm`
4. Desative Analytics (não precisa)
5. Clique **"Criar projeto"**

### Passo 2: Adicionar App iOS no Firebase

1. No console Firebase, clique no ícone **iOS (maçã)**
2. **Bundle ID**: `app.lovable.106c422f8c2149a5968a18f4ac50cb74`
3. **Apelido**: `Vimob iOS`
4. Baixe o arquivo `GoogleService-Info.plist`
5. **Guarde esse arquivo** - vai usar no Xcode

### Passo 3: Configurar APNs no Firebase (CRÍTICO para iOS)

Você precisa de uma conta Apple Developer ($99/ano) e Mac com Xcode.

**No Apple Developer Portal (developer.apple.com):**

1. Acesse **Certificates, Identifiers & Profiles**
2. Vá em **Keys** → clique **"+"**
3. Nome: `Vimob Push Key`
4. Marque **"Apple Push Notifications service (APNs)"**
5. Clique **Continue** → **Register**
6. **IMPORTANTE:** Baixe o arquivo `.p8` (só pode baixar UMA vez!)
7. Anote o **Key ID** (10 caracteres, ex: `ABC123DEFG`)
8. Anote o **Team ID** (aparece no canto superior direito, ex: `XYZ789`)

**No Firebase Console:**

1. Vá em **Configurações do projeto** (ícone engrenagem)
2. Aba **"Cloud Messaging"**
3. Na seção **"Apple app configuration"**, clique **"Upload"**
4. Faça upload do arquivo `.p8`
5. Preencha o **Key ID** e **Team ID**

### Passo 4: Gerar Service Account (se ainda não fez)

1. No Firebase Console → **Configurações** → **Contas de serviço**
2. Clique **"Gerar nova chave privada"**
3. Baixe o JSON
4. Atualize o secret `FIREBASE_SERVICE_ACCOUNT` no Supabase se necessário

### Passo 5: Configurar App Android (bônus)

1. No Firebase Console, clique no ícone **Android**
2. **Package name**: `app.lovable.106c422f8c2149a5968a18f4ac50cb74`
3. Baixe `google-services.json`
4. **Guarde esse arquivo** - vai usar no Android Studio

---

## 3. O que EU vou fazer (melhorias no código)

### 3.1 Melhorar o payload APNs para iOS

O payload atual não tem `alert` explícito que é necessário para notificações visíveis no iOS com app fechado.

**Mudança na Edge Function:**

```javascript
apns: {
  headers: {
    "apns-priority": "10",
    "apns-push-type": "alert",
  },
  payload: {
    aps: {
      alert: {
        title: title,
        body: body,
      },
      sound: "default",
      badge: 1,
      "mutable-content": 1,
      "content-available": 1,
    },
  },
},
```

### 3.2 Adicionar logging melhorado

Para facilitar debug de problemas de push.

### 3.3 Criar `capacitor.config.ts`

Arquivo de configuração necessário para build nativo.

---

## 4. Arquivos que serão modificados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/send-push-notification/index.ts` | Modificar | Melhorar payload APNs para iOS |
| `capacitor.config.ts` | Criar | Configuração Capacitor com hot-reload |

---

## 5. Checklist de Testes

Após toda a configuração estar completa:

| Cenário | Como testar |
|---------|-------------|
| ✅ App em **foreground** | Crie um lead via webhook, notificação aparece in-app |
| ✅ App em **background** | Minimize o app, crie um lead, push aparece na barra de status |
| ✅ App **fechado** (killed) | Force close no app, crie um lead, push aparece |
| ✅ iPhone **bloqueado** | Bloqueie a tela, crie um lead, push aparece na lock screen |
| ⚠️ **Modo Foco** ativo | Depende das configurações do usuário no iOS |
| ⚠️ **Permissões negadas** | Se o usuário negou, não recebe push |

---

## 6. Resumo do Status

```text
╔═══════════════════════════════════════════════════════════════╗
║                    PUSH NOTIFICATIONS STATUS                   ║
╠═══════════════════════════════════════════════════════════════╣
║  Backend (Edge Function)     ✅ PRONTO                        ║
║  Tabela push_tokens          ✅ PRONTO                        ║
║  Trigger automático          ✅ PRONTO                        ║
║  Firebase Service Account    ✅ CONFIGURADO                   ║
║  Hook usePushNotifications   ✅ PRONTO                        ║
║  Capacitor instalado         ✅ PRONTO                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Firebase Project            ❌ VOCÊ PRECISA CRIAR            ║
║  APNs Auth Key (.p8)         ❌ VOCÊ PRECISA CONFIGURAR       ║
║  App build local (Xcode)     ❌ VOCÊ PRECISA FAZER            ║
║  Token registrado            ❌ NENHUM DISPOSITIVO AINDA      ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## Seção Técnica

### Payload FCM correto para iOS (tela bloqueada)

Para que push funcione com iPhone bloqueado, o payload precisa:

1. **Campo `notification`** - obrigatório para exibição automática
2. **APNs headers** - `apns-push-type: alert` e `apns-priority: 10`
3. **APS alert object** - com `title` e `body` explícitos
4. **mutable-content: 1** - permite extensões de notificação

### Fluxo de Push Remoto

```text
1. Lead criado (webhook/app)
       ↓
2. Trigger insere em `notifications`
       ↓
3. Trigger `trigger_push_on_notification_insert` executa
       ↓
4. pg_net faz POST para `send-push-notification`
       ↓
5. Edge Function busca tokens do usuário
       ↓
6. Edge Function gera access_token Firebase (JWT RS256)
       ↓
7. POST para FCM HTTP v1 API
       ↓
8. Firebase envia para APNs (iOS) ou FCM (Android)
       ↓
9. Push aparece no dispositivo
```

### Capacidades iOS necessárias (Xcode)

No arquivo `.entitlements` e no Xcode:

- **Push Notifications** capability
- **Background Modes** → Remote notifications
- **aps-environment**: `production` (ou `development` para testes)

