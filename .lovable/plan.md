
# Limpeza de Arquivos Órfãos

## Resumo

Exclusão de dois arquivos que não são mais utilizados após a consolidação das abas de configurações.

---

## Arquivos a Excluir

| Arquivo | Motivo |
|---------|--------|
| `src/components/settings/ProfileTab.tsx` | Funcionalidade migrada para `AccountTab.tsx` (coluna esquerda) |
| `src/components/settings/OrganizationTab.tsx` | Funcionalidade migrada para `AccountTab.tsx` (coluna direita) |

---

## Verificação Realizada

- Busca por imports: **0 resultados** para ambos os arquivos
- `Settings.tsx` agora importa apenas:
  - `AccountTab` (contém Profile + Organization)
  - `TeamTab` (contém Users + Roles)
  - `WebhooksTab`
  - `WhatsAppTab`

---

## Ação

Excluir os dois arquivos órfãos para manter o codebase limpo e evitar confusão.
