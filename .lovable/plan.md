

# Plano: Corrigir Contador de Leads na Configuração do Meta

## Problema

O contador de leads recebidos está sempre mostrando **0** na página de configuração do Meta, mesmo com leads sendo recebidos corretamente.

## Causa Raiz

Há 3 pontos que precisam ser corrigidos:

| Local | Problema |
|-------|----------|
| Interface TypeScript | Campo `leads_received` não existe |
| Settings.tsx (linha 42) | Valor fixo: `const totalMetaLeadsReceived = 0` |
| MetaIntegrationSettings.tsx (linha 317) | Não exibe o valor real do banco |

## Solução

### 1. Adicionar campo na interface

**Arquivo**: `src/hooks/use-meta-integration.ts`

Adicionar o campo `leads_received` na interface `MetaIntegration`:

```typescript
export interface MetaIntegration {
  // ... campos existentes
  leads_received: number | null;  // Novo campo
}
```

### 2. Calcular soma dos leads

**Arquivo**: `src/pages/Settings.tsx`

Alterar linha 42 de:
```typescript
const totalMetaLeadsReceived = 0;
```

Para:
```typescript
const totalMetaLeadsReceived = metaIntegrations.reduce(
  (sum, integration) => sum + (integration.leads_received || 0),
  0
);
```

### 3. Exibir contador por página

**Arquivo**: `src/components/integrations/MetaIntegrationSettings.tsx`

Alterar linha 317 de:
```jsx
<span>{meta.leadsReceived}</span>
```

Para:
```jsx
<span>{integration.leads_received || 0} {meta.leadsReceived}</span>
```

## Resultado Esperado

- **Página de Configurações (tab Meta)**: Mostrará o total de leads recebidos de todas as páginas
- **Página de Configuração Detalhada**: Mostrará o contador individual por página conectada

## Seção Técnica

### Arquivos Modificados

| Arquivo | Linha | Mudança |
|---------|-------|---------|
| `src/hooks/use-meta-integration.ts` | 19 | Adicionar `leads_received: number \| null;` |
| `src/pages/Settings.tsx` | 42 | Calcular soma dinâmica |
| `src/components/integrations/MetaIntegrationSettings.tsx` | 317 | Exibir `integration.leads_received` |

