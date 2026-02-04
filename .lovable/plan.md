

# Plano: Correção de UI Mobile para Configurações e Gestão

## Problemas Identificados

Analisando as imagens enviadas, identifiquei os seguintes problemas:

| Problema | Página | Causa |
|----------|--------|-------|
| 1. Menu de tabs só com ícones | Configurações | `<span className="hidden sm:inline">` esconde os textos no mobile, ficando apenas ícones confusos |
| 2. Tabs cortadas/quebradas | Gestão | A `TabsList` não tem scroll horizontal, tabs de "Equipes" e "Pipelines" ficam fora da tela |
| 3. Conteúdo flutuando | Gestão | Cards de equipe aparecem parcialmente visíveis no canto da tela |

---

## Solução Proposta

### Abordagem: Select no Mobile

Para ambas as páginas, vou implementar um padrão consistente:
- **Desktop:** Tabs horizontais como estão hoje
- **Mobile:** `Select` (dropdown) que mostra a opção selecionada por extenso

```text
ANTES (Mobile):
┌─────────────────────────────────┐
│ [📷] [🏢] [👥] [🛡️] [📘] [🌐] [📱] │  ← Ícones confusos
└─────────────────────────────────┘

DEPOIS (Mobile):
┌─────────────────────────────────┐
│  📷 Meu Perfil               ▼  │  ← Select claro
└─────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Settings.tsx` | Substituir tabs por Select no mobile |
| `src/pages/CRMManagement.tsx` | Substituir tabs por Select no mobile |

---

## Implementação Detalhada

### 1. Settings.tsx - Select Mobile

```typescript
import { useIsMobile } from '@/hooks/use-mobile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// No componente:
const isMobile = useIsMobile();
const [activeTab, setActiveTab] = useState('profile');

// Definir lista de tabs com ícones e labels
const settingsTabs = [
  { value: 'profile', label: t.settings.myProfile, icon: Camera },
  { value: 'organization', label: t.settings.company, icon: Building2 },
  { value: 'users', label: t.settings.usersTab, icon: Users },
  // ... condicionais para roles, webhooks, etc
];

// Renderização:
{isMobile ? (
  <Select value={activeTab} onValueChange={setActiveTab}>
    <SelectTrigger className="w-full">
      <SelectValue>
        <div className="flex items-center gap-2">
          {CurrentIcon && <CurrentIcon className="h-4 w-4" />}
          <span>{currentLabel}</span>
        </div>
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      {settingsTabs.map(tab => (
        <SelectItem key={tab.value} value={tab.value}>
          <div className="flex items-center gap-2">
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </div>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
) : (
  <TabsList>
    {/* Tabs desktop como estão */}
  </TabsList>
)}
```

### 2. CRMManagement.tsx - Select Mobile

A mesma abordagem, mas com as tabs específicas de Gestão:

```typescript
const managementTabs = [
  { value: 'teams', label: 'Equipes', icon: Users },
  { value: 'pipelines', label: 'Pipelines', icon: GitBranch },
  { value: 'distribution', label: 'Distribuição', icon: Shuffle },
  { value: 'pool', label: 'Bolsão', icon: Timer },
  { value: 'tags', label: 'Tags', icon: Tags },
];

{isMobile ? (
  <Select value={activeTab} onValueChange={setActiveTab}>
    <SelectTrigger className="w-full">
      <SelectValue>
        <div className="flex items-center gap-2">
          {CurrentIcon && <CurrentIcon className="h-4 w-4" />}
          <span>{currentLabel}</span>
        </div>
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      {managementTabs.map(tab => (
        <SelectItem key={tab.value} value={tab.value}>
          <div className="flex items-center gap-2">
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </div>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
) : (
  <TabsList>
    {/* Tabs como estão */}
  </TabsList>
)}
```

---

## Resultado Visual Esperado

### Configurações (Mobile)
```text
┌─────────────────────────────────┐
│ ≡  Configurações          🌙 🔔 │
├─────────────────────────────────┤
│  📷 Meu Perfil               ▼  │  ← Select dropdown
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │       Meu Perfil          │  │
│  │  Gerencie suas informações│  │
│  │        pessoais           │  │
│  │                           │  │
│  │  [Foto]  André Rocha      │  │
│  │  ...                      │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Gestão (Mobile)
```text
┌─────────────────────────────────┐
│ ≡  Gestão                 🌙 🔔 │
├─────────────────────────────────┤
│  👥 Equipes                  ▼  │  ← Select dropdown
├─────────────────────────────────┤
│  Equipes                        │
│  2 equipes · 5 membros          │
│        [+ Nova Equipe]          │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 👥 Time Comercial         │  │
│  │ 3 membros · 👑 André      │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

---

## Seção Técnica

### Por que Select ao invés de Scroll Horizontal?

1. **Clareza:** O usuário vê exatamente a seção atual
2. **Acessibilidade:** Evita scroll acidental e swipe conflicts
3. **Consistência:** Padrão comum em apps mobile (iOS usa muito)
4. **Espaço:** Libera área vertical para o conteúdo

### Lógica de Tabs Condicionais (Settings)

A página de Settings tem tabs que aparecem condicionalmente baseado em:
- `profile?.role === 'admin'` → mostra aba "Funções"
- `hasWebhooksModule` → mostra aba "Webhooks"
- `hasWordpressModule` → mostra aba "WordPress"
- `hasWhatsAppModule` → mostra aba "WhatsApp"

A lista de tabs será construída dinamicamente com `useMemo` para refletir essas condições.

### Mudança Controlada de Tabs

O componente `Tabs` do Radix aceita `value` e `onValueChange`, então posso controlar o estado externamente:

```typescript
<Tabs value={activeTab} onValueChange={setActiveTab}>
  {/* O Select ou TabsList alteram o mesmo estado */}
  {isMobile ? <Select ... /> : <TabsList ... />}
  
  <TabsContent value="profile">...</TabsContent>
  {/* ... */}
</Tabs>
```

