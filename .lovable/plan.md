
# Feature Flags e Modo Manutenção no Painel Super Admin

## Estratégia: Reutilizar `system_settings.value` (sem migration)

A tabela `system_settings` já tem um campo `value` do tipo `jsonb` com o registro `key = 'global'`. Basta adicionar novos campos nesse JSON:
- `maintenance_mode: boolean` — ativa o banner de manutenção
- `maintenance_message: string` — mensagem personalizada do banner
- `feature_flags: { [key: string]: boolean }` — objeto com flags globais

Isso evita uma nova tabela e mantém o padrão já estabelecido no código.

---

## Arquivos a modificar

### 1. `src/pages/admin/AdminSettings.tsx`

Adicionar **dois novos Cards** ao final da página (antes do Card de "Forçar Atualização"):

**Card A: Modo Manutenção**
- Switch para ativar/desativar
- Campo de texto para mensagem personalizada
- Preview do banner em tempo real
- Botão salvar que grava `maintenance_mode` e `maintenance_message` no campo `value` via `updateSettingsValue`

**Card B: Feature Flags**
- Lista de flags com Switch por linha
- Flags iniciais:
  - `multi_pipeline` — Múltiplos Pipelines (experimental)
  - `telecom_module` — Módulo Telecom
  - `ai_assistant` — Assistente de IA (beta)
  - `advanced_reports` — Relatórios Avançados
- Botão "Salvar Flags" que grava o objeto `feature_flags` no campo `value`

Novos states necessários:
```tsx
const [maintenanceMode, setMaintenanceMode] = useState(false);
const [maintenanceMessage, setMaintenanceMessage] = useState('');
const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
const [savingMaintenance, setSavingMaintenance] = useState(false);
const [savingFlags, setSavingFlags] = useState(false);
```

Atualizar `fetchSettings` e `SystemSettingsValue` para incluir os novos campos.

### 2. `src/hooks/use-system-settings.ts`

Adicionar os novos campos ao parse do `value`:
```ts
maintenance_mode: value.maintenance_mode || false,
maintenance_message: value.maintenance_message || '',
feature_flags: value.feature_flags || {},
```

### 3. `src/components/layout/AppLayout.tsx`

Adicionar o componente `MaintenanceBanner` que:
- Usa `useSystemSettings()` para ler `maintenance_mode` e `maintenance_message`
- Só exibe se `maintenance_mode === true` **E** o usuário não for `super_admin` ou `admin`
- Mostra um banner vermelho/amarelo fixo no topo com a mensagem configurada
- Não pode ser dispensado (diferente do `AnnouncementBanner`)

### 4. `src/hooks/use-feature-flags.ts` (novo arquivo)

Hook auxiliar que retorna as feature flags globais:
```ts
export function useFeatureFlags() {
  const { data: settings } = useSystemSettings();
  return settings?.feature_flags || {};
}
```

---

## Comportamento do Banner de Manutenção

| Usuário | Vê o banner? |
|---|---|
| `super_admin` | ❌ Nunca (pode continuar usando) |
| `admin` | ❌ Nunca (admin da org continua operando) |
| `user` (role comum) | ✅ Sempre que manutenção ativa |

O banner será **laranja/amarelo**, aparece no topo da tela (abaixo do header), com a mensagem configurada e um ícone de ferramenta. Não tem botão de fechar.

---

## Fluxo de dados

```
AdminSettings → system_settings.value.maintenance_mode = true
                system_settings.value.feature_flags = { multi_pipeline: true, ... }

AppLayout → useSystemSettings() → lê maintenance_mode
         → se true + user não-admin → exibe MaintenanceBanner

useFeatureFlags() → lê feature_flags do system_settings
                 → qualquer componente pode usar para condicional de feature
```

---

## Detalhes técnicos

- Os campos novos são adicionados ao JSON `value` via a função `updateSettingsValue` já existente — zero mudança de schema
- `useSystemSettings` tem `staleTime: 5min` — o banner de manutenção aparece em até 5 minutos para usuários que já estão na tela. Para ativação imediata, o admin pode usar o "Forçar Atualização Global" já existente
- O hook `useFeatureFlags` é leve e pode ser importado em qualquer componente no futuro
- Nenhum migration SQL necessário

---

## Resumo dos arquivos

| Arquivo | Ação |
|---|---|
| `src/pages/admin/AdminSettings.tsx` | Adicionar 2 Cards: Modo Manutenção + Feature Flags |
| `src/hooks/use-system-settings.ts` | Adicionar 3 campos ao parse do value |
| `src/components/layout/AppLayout.tsx` | Adicionar `MaintenanceBanner` inline |
| `src/hooks/use-feature-flags.ts` | Criar hook auxiliar |
