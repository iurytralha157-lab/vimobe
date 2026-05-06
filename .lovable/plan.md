O sistema está processando leads do Meta normalmente até o final do dia 04/05 (anteontem). Identifiquei que leads foram gerados para as três organizações mencionadas nesse período:

- **Nexo Imóveis (Fernando):** Último lead do Meta em 04/05 às 22:12.
- **Rede Nardo (RE/MAX):** Último lead do Meta em 04/05 às 22:13.
- **Visioria (Daniel Thomaz):** Último lead do Meta em 04/05 às 20:23.

A ausência de leads nas últimas 36 horas (dia 05/05 e hoje) parece estar relacionada à **falta de novos disparos vindos do próprio Meta (Facebook/Instagram)**, e não a uma falha interna do sistema, dado que:
1. As integrações aparecem como "Conectadas" no banco de dados.
2. Não há registros de erros recentes de integração (last_error está vazio).
3. Outras formas de entrada (como WhatsApp) continuam gerando centenas de leads normalmente hoje (308 leads via WhatsApp em 05/05).

Vou realizar uma manutenção preventiva para garantir que qualquer barreira técnica seja removida:

1. **Re-sincronização de Webhooks:** Forçar uma atualização das configurações de webhook para essas contas para garantir que o Meta tenha o caminho correto para enviar os dados.
2. **Verificação de Tokens:** Validar se os tokens de acesso ainda possuem as permissões necessárias para buscar leads em tempo real.
3. **Logs de Diagnóstico:** Ativar um log temporário mais detalhado na função `meta-webhook` para capturar qualquer tentativa frustrada de envio pelo Meta que possa estar sendo ignorada silenciosamente.

**Recomendação para o usuário:**
Peça aos clientes para verificarem se suas campanhas no Gerenciador de Anúncios do Meta ainda estão ativas e se não há notificações de "Token Expirado" ou "Configuração de Webhook pendente" na página do Facebook.
