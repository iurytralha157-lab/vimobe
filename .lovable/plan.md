
# Correção: Registrar Tempo de Resposta nos Botões de WhatsApp

## Problema

Ao clicar nos botões de ação rápida (telefone, WhatsApp, email), o sistema deveria registrar o "tempo de primeira resposta" do lead. Atualmente:

- Telefone: registra corretamente
- Email: registra corretamente
- **WhatsApp: NAO registra** (em nenhum lugar)

Isso ocorre em **2 componentes**: o card do lead no pipeline e o dialog de detalhes do lead.

---

## Correções

### Arquivo 1: `src/components/leads/LeadCard.tsx`

No `handleWhatsAppClick` (linha 113-119), adicionar a chamada `recordFirstResponse` antes de abrir o chat:

```text
const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.phone) {
      // NOVO: Registrar first response
      recordFirstResponse({
        leadId: lead.id,
        organizationId: lead.organization_id || profile?.organization_id || '',
        channel: 'whatsapp',
        actorUserId: profile?.id || null,
        firstResponseAt: lead.first_response_at,
      });
      openNewChat(lead.phone, lead.name);
    }
  };
```

### Arquivo 2: `src/components/leads/LeadDetailDialog.tsx`

Existem **3 pontos** onde o WhatsApp eh aberto sem registrar tempo de resposta:

1. **Botao "Chat" principal** (linha ~551) - `openNewChat`
2. **Botao "Chat" secundario** (linha ~1468) - `openNewChat`
3. **Tarefa com mensagem recomendada** (linhas ~344, ~360) - `openNewChatWithMessage`

Para cada um, adicionar a chamada `recordFirstResponse` com channel `'whatsapp'` antes do `openNewChat`/`openNewChatWithMessage`.

---

## Resumo

| Local | Componente | Acao |
|---|---|---|
| LeadCard.tsx | handleWhatsAppClick | Adicionar recordFirstResponse |
| LeadDetailDialog.tsx | Botao Chat (2 locais) | Adicionar recordFirstResponse |
| LeadDetailDialog.tsx | Tarefa com mensagem (2 locais) | Adicionar recordFirstResponse |

Apenas 2 arquivos alterados. Sem mudancas no banco ou edge functions - a edge function `calculate-first-response` ja suporta o channel `whatsapp` corretamente.
