
# WhatsApp Central de Notificacoes (Super Admin)

## Resumo
Adicionar no painel Super Admin a configuracao de uma instancia WhatsApp central (Evolution API) que envia notificacoes para usuarios de TODAS as organizacoes que nao possuem sua propria sessao de notificacao configurada. Sem duplicidade de mensagens.

## Logica de prioridade
1. Se a organizacao tem uma `whatsapp_session` com `is_notification_session = true` e `status = connected` --> usa a sessao da propria organizacao (comportamento atual)
2. Se NAO tem --> usa a sessao global configurada pelo Super Admin via `system_settings`

## Etapas

### 1. Adicionar campos no `system_settings` (sem migration)
Aproveitar o campo JSON `value` da tabela `system_settings` que ja existe. Adicionar novas chaves:
- `notification_instance_name`: nome da instancia no Evolution API (ex: "vetor-notifications")
- `notification_instance_connected`: boolean de status

Nenhuma migration necessaria -- o campo `value` ja e JSONB flexivel.

### 2. Novo Card no AdminSettings (Super Admin)
Adicionar um card "WhatsApp de Notificacoes" na pagina `src/pages/admin/AdminSettings.tsx` com:
- Campo para nome da instancia Evolution API
- Botao "Verificar Conexao" que chama a Evolution API via uma edge function para validar status
- Botao "Conectar" que gera QR code (similar ao fluxo existente de sessoes)
- Indicador de status (conectado/desconectado)
- Explicacao: "Este WhatsApp sera usado para enviar notificacoes para organizacoes que nao possuem WhatsApp proprio configurado."

**Abordagem simplificada**: Como a Evolution API ja esta configurada via secrets (`EVOLUTION_API_URL`, `EVOLUTION_API_KEY`), o admin so precisa informar o `instance_name` da instancia que ja foi criada no Evolution. O card tera:
- Input para o nome da instancia
- Botao para salvar
- Botao para testar conexao (chama Evolution API GET /instance/connectionState/{instance_name})

### 3. Nova Edge Function: `global-whatsapp-status`
Endpoint simples que recebe `instance_name` e retorna o status da conexao consultando a Evolution API. Usado pelo card do admin para verificar se a instancia esta conectada.

### 4. Modificar Edge Function `whatsapp-notifier`
Alterar a logica atual:
1. Tentar encontrar sessao de notificacao da organizacao (comportamento atual)
2. Se NAO encontrar (ou nao estiver conectada), buscar `system_settings` para pegar o `notification_instance_name` global
3. Se existir e estiver configurado, enviar via essa instancia global
4. Se nenhum dos dois existir, retornar erro silencioso (como ja faz)

### 5. Atualizar interfaces TypeScript
- `SystemSettingsValue` em `use-system-settings.ts` e `AdminSettings.tsx`: adicionar campos `notification_instance_name`

## Detalhes Tecnicos

### Fluxo do `whatsapp-notifier` atualizado:

```text
Recebe: { organization_id, user_id, message }
        |
        v
  Busca sessao de notificacao da org
  (whatsapp_sessions WHERE is_notification_session = true)
        |
    Encontrou e connected?
      /          \
    SIM          NAO
     |             |
  Envia via      Busca system_settings
  sessao org     notification_instance_name
     |             |
   FIM         Tem instancia global?
                /          \
              SIM          NAO
               |             |
            Envia via      Retorna
            instancia      (sem envio)
            global
               |
             FIM
```

### Arquivos criados/modificados:
1. `src/pages/admin/AdminSettings.tsx` -- novo card WhatsApp Notificacoes
2. `src/hooks/use-system-settings.ts` -- novos campos na interface
3. `supabase/functions/whatsapp-notifier/index.ts` -- fallback para instancia global
4. `supabase/functions/global-whatsapp-status/index.ts` -- novo, verificar conexao da instancia
