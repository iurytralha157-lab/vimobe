
## Resolver IDs para Nomes nas Regras da Fila

### Problema

No componente `RulesManager.tsx`, a função `renderMatchDescription` só resolve nomes para tags. Para todos os outros tipos de condição (`webhook`, `meta_form`, `whatsapp_session`, `source`, `interest_property`, `interest_plan`, `campaign_contains`, `city`, `website_category`), exibe o valor bruto — que é um UUID ou string de ID.

### Causa raiz

A regra é salva com `match_value` como uma string de IDs separados por vírgula (ex: `450fb731-9e8a-4de5-8bb1-54eac611340f`). O componente não faz lookup desses IDs nos dados disponíveis.

### Solução

Atualizar `RulesManager.tsx` para:

1. Importar todos os hooks necessários: `useWebhooks`, `useWhatsAppSessions`, `useMetaIntegrations`, `useMetaFormConfigs`, `useProperties`, `useServicePlans`, `usePipelines`
2. Criar um mapeamento de ID → nome para cada tipo de recurso
3. Reescrever `renderMatchDescription` com um `switch` completo que resolve cada tipo para um label legível

### Mapeamento de cada tipo

| `match_type` | Valor armazenado | Resolução |
|---|---|---|
| `source` | `meta_ads`, `whatsapp`, etc. | Tabela estática `SOURCE_LABELS` |
| `webhook` | UUID(s) do webhook | `webhooks.find(w => w.id === id)?.name` |
| `whatsapp_session` | UUID(s) da sessão | `sessions.find(s => s.id === id)?.display_name` |
| `meta_form` | ID(s) numérico do form | `metaFormConfigs.find(f => f.form_id === id)?.form_name` |
| `website_category` | `venda`, `locacao`, etc. | Tabela estática `CATEGORY_LABELS` |
| `campaign_contains` | Texto livre | Exibir diretamente |
| `tag` | UUID(s) da tag | `tags.find(t => t.id === id)?.name` |
| `city` | Texto(s) | Exibir diretamente |
| `interest_property` | UUID do imóvel | `properties.find(p => p.id === id)?.code + title` |
| `interest_plan` | UUID do plano | `plans.find(p => p.id === id)?.name` |

### Lógica de display

O `match_value` é uma string com valores separados por vírgula. Para cada tipo, o componente:
1. Faz `.split(',').map(v => v.trim())` para extrair IDs
2. Faz o lookup em cada coleção
3. Exibe badges com ícone + nome legível (ou fallback para o próprio valor se não encontrado)

### Arquivos modificados

#### `src/components/round-robin/RulesManager.tsx`

Adicionar imports:
```ts
import { useWebhooks } from '@/hooks/use-webhooks';
import { useWhatsAppSessions } from '@/hooks/use-whatsapp-sessions';
import { useMetaIntegrations } from '@/hooks/use-meta-integration';
import { useMetaFormConfigs } from '@/hooks/use-meta-forms';
import { useProperties } from '@/hooks/use-properties';
import { useServicePlans } from '@/hooks/use-service-plans';
import { usePipelines } from '@/hooks/use-stages';
import { MessageSquare, Webhook, Globe, Tag, MapPin, Home, Megaphone, FileText } from 'lucide-react';
```

Adicionar tabelas estáticas de resolução:
```ts
const SOURCE_LABELS: Record<string, string> = {
  meta_ads: 'Meta Ads', facebook: 'Facebook', instagram: 'Instagram',
  whatsapp: 'WhatsApp', webhook: 'Webhook', website: 'Website',
  meta: 'Meta', manual: 'Manual', site: 'Site',
};
const CATEGORY_LABELS: Record<string, string> = {
  venda: 'Venda', locacao: 'Locação', lancamento: 'Lançamento',
};
```

Reescrever `renderMatchDescription` com switch completo:
```ts
const renderMatchDescription = (rule: RoundRobinRule) => {
  const rawValues = rule.match_value || '';
  const values = rawValues.split(',').map(v => v.trim()).filter(Boolean);

  switch (rule.match_type) {
    case 'source':
      return <div className="flex flex-wrap gap-1">
        {values.map(v => <Badge key={v} variant="outline">🌐 {SOURCE_LABELS[v] || v}</Badge>)}
      </div>;

    case 'webhook':
      return <div className="flex flex-wrap gap-1">
        {values.map(v => {
          const wh = webhooks.find(w => w.id === v);
          return <Badge key={v} variant="outline" className="gap-1">
            <Webhook className="h-3 w-3" />{wh?.name || 'Webhook desconhecido'}
          </Badge>;
        })}
      </div>;

    case 'whatsapp_session':
      return <div className="flex flex-wrap gap-1">
        {values.map(v => {
          const s = sessions.find(s => s.id === v);
          return <Badge key={v} variant="outline" className="gap-1">
            <MessageSquare className="h-3 w-3" />{s?.display_name || s?.phone_number || 'Sessão desconhecida'}
          </Badge>;
        })}
      </div>;

    case 'meta_form':
      return <div className="flex flex-wrap gap-1">
        {values.map(v => {
          const f = metaFormConfigs.find(f => f.form_id === v);
          return <Badge key={v} variant="outline" className="gap-1">
            <FileText className="h-3 w-3" />{f?.form_name || 'Formulário'}
          </Badge>;
        })}
      </div>;

    case 'tag':
      return <div className="flex flex-wrap gap-1">
        {values.map(v => {
          const tag = tags.find(t => t.id === v);
          return tag ? <Badge key={v} variant="outline" style={{ borderColor: tag.color, color: tag.color }}>
            🏷️ {tag.name}
          </Badge> : null;
        })}
      </div>;

    case 'interest_property':
      return <div className="flex flex-wrap gap-1">
        {values.map(v => {
          const prop = properties.find(p => p.id === v);
          return <Badge key={v} variant="outline" className="gap-1">
            <Home className="h-3 w-3" />{prop ? `${prop.code} - ${prop.title || prop.bairro}` : 'Imóvel'}
          </Badge>;
        })}
      </div>;

    case 'interest_plan':
      return <div className="flex flex-wrap gap-1">
        {values.map(v => {
          const plan = plans.find(p => p.id === v);
          return <Badge key={v} variant="outline" className="gap-1">
            📋 {plan?.name || 'Plano'}
          </Badge>;
        })}
      </div>;

    case 'website_category':
      return <div className="flex flex-wrap gap-1">
        {values.map(v => <Badge key={v} variant="outline" className="gap-1">
          <Globe className="h-3 w-3" />{CATEGORY_LABELS[v] || v}
        </Badge>)}
      </div>;

    case 'campaign_contains':
      return <Badge variant="outline" className="gap-1">
        <Megaphone className="h-3 w-3" />Campanha contém: "{rawValues}"
      </Badge>;

    case 'city':
      return <div className="flex flex-wrap gap-1">
        {values.map(v => <Badge key={v} variant="outline" className="gap-1">
          <MapPin className="h-3 w-3" />{v}
        </Badge>)}
      </div>;

    default:
      return <Badge variant="outline">{rule.match_type}: {rawValues}</Badge>;
  }
};
```

### Resultado esperado

**Antes:**
```
webhook: 450fb731-9e8a-4de5-8bb1-54eac611340f
meta_form: 869470169067078,180712...
```

**Depois:**
```
🔗 Meu Webhook Facebook
📝 Formulário Landing Page Alphaville
```

### Resumo

| Arquivo | Mudança |
|---|---|
| `src/components/round-robin/RulesManager.tsx` | Adiciona hooks de lookup + reescreve `renderMatchDescription` com switch completo |
