
# Plano: Melhorar Mensagens de Notificação e Configurar Push Nativo

## Resumo do Diagnóstico

Encontrei os seguintes pontos:

### 1. Mensagens com emoji "🆕" que você quer remover
As notificações são criadas em **3 lugares** com o emoji:

| Local | Título atual |
|-------|-------------|
| `use-lead-notifications.ts` linha 47 | "🆕 Novo lead atribuído a você!" |
| `use-lead-notifications.ts` linha 80 | "🆕 Novo lead na sua equipe!" |
| `use-lead-notifications.ts` linha 110 | "🆕 Novo lead criado" |
| `use-notifications.ts` linha 243 | Toast: "🆕 Novo Lead!" |

### 2. Push Nativo (app fechado)
O sistema de push nativo já está **parcialmente configurado**:
- Tabela `push_tokens` existe (mas está vazia - não há apps nativos registrados)
- Edge Function `send-push-notification` existe
- Trigger no banco já dispara push quando notificação é criada
- Hook `usePushNotifications` já registra tokens

**Por que não funciona com app fechado:**
Push nativo requer compilar o app via Capacitor (Xcode para iOS). No browser, mesmo no celular, só funciona quando o app está aberto.

---

## Solução Proposta

### Etapa 1: Remover emojis e deixar mensagens profissionais

**Arquivo:** `src/hooks/use-lead-notifications.ts`

| Antes | Depois |
|-------|--------|
| "🆕 Novo lead atribuído a você!" | "Novo lead recebido" |
| "🆕 Novo lead na sua equipe!" | "Novo lead na equipe" |
| "🆕 Novo lead criado" | "Novo lead criado" |

**Arquivo:** `src/hooks/use-notifications.ts`

| Antes | Depois |
|-------|--------|
| Toast: "🆕 Novo Lead!" | "Novo Lead Recebido" |

### Etapa 2: Melhorar descrição das notificações

Manter o conteúdo descritivo que você gostou:
- Nome do lead
- Origem (Webhook, Meta, etc.)
- Pipeline (quando aplicável)

Exemplo final:
```
Título: "Novo lead recebido"
Descrição: "João Silva atribuído a você (origem: Webhook, pipeline: Vendas)"
```

---

## Sobre Push Nativo para iOS

Para receber notificações com o app fechado no iPhone, você precisa:

1. **Mac com Xcode** instalado
2. **Conta Apple Developer** ($99/ano)
3. **Configurar APNs** no Firebase Console:
   - Criar chave de autenticação APNs no Apple Developer Portal
   - Upload da chave no Firebase > Configurações > Cloud Messaging
4. **Baixar GoogleService-Info.plist** do Firebase e adicionar ao projeto iOS
5. **Compilar o app via Xcode**

Este é um processo que precisa ser feito localmente no seu Mac. Quando quiser seguir por esse caminho, posso te dar instruções passo a passo detalhadas.

**Alternativa imediata:** Com as notificações Realtime funcionando, você já recebe alertas instantâneos sempre que o app estiver aberto (que é o caso mais comum durante o trabalho).

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/use-lead-notifications.ts` | Remover emojis, ajustar títulos profissionais |
| `src/hooks/use-notifications.ts` | Remover emoji do toast |

---

## Resultado Esperado

Após a implementação:
- Notificações com visual limpo e profissional (sem emojis)
- Títulos claros: "Novo lead recebido", "Novo lead na equipe"
- Descrição mantém todas as informações úteis (nome, origem, pipeline)
- Push nativo pendente de configuração local (iOS/Android)
