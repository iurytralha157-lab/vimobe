

# Plano: Tour Guiado de Onboarding para Novos Clientes

## Contexto

Você quer substituir o checklist estático atual (que aparece toda vez no dashboard) por um **tour guiado interativo** que:

1. Aparece apenas para **usuários novos** (primeira vez no sistema)
2. Mostra as páginas importantes com **popups apontando onde clicar**
3. Ensina a **cadastrar usuários** e **configurar WhatsApp**
4. Tem um botão "Dispensar ajuda" que **nunca mais mostra**
5. É **leve e não intrusivo**

---

## O que será feito

| Ação | Descrição |
|------|-----------|
| Remover | OnboardingChecklist do Dashboard |
| Criar | Componente de Tour Guiado com popups |
| Criar | Hook para gerenciar estado do tour |
| Adicionar | Campo `onboarding_completed` no banco |
| Integrar | Tour no AppLayout |

---

## Fluxo do Usuário

```text
1. Usuário faz login pela primeira vez
           ↓
2. Sistema detecta: onboarding_completed = false
           ↓
3. Modal de boas-vindas aparece
   "Olá! Vamos te mostrar como usar o sistema?"
   [Começar Tour] [Dispensar]
           ↓
4. Se "Começar Tour":
   - Passo 1: Highlight na Sidebar → "Aqui você navega pelo sistema"
   - Passo 2: Aponta para Configurações → "Clique aqui para adicionar usuários"
   - Passo 3: Aponta para WhatsApp → "Configure seu WhatsApp aqui"
   - Passo 4: Finaliza → "Pronto! Explore o sistema"
           ↓
5. Se "Dispensar" (em qualquer momento):
   - Marca onboarding_completed = true
   - Nunca mais aparece
```

---

## Passos do Tour

| Passo | Elemento Alvo | Título | Descrição |
|-------|---------------|--------|-----------|
| 1 | Sidebar | Navegação | "Use o menu lateral para acessar todas as funcionalidades do CRM" |
| 2 | Dashboard link | Dashboard | "Aqui você vê os indicadores principais do seu negócio" |
| 3 | Pipelines link | Pipeline | "Gerencie seus leads e oportunidades visualmente" |
| 4 | Settings link | Configurações | "Adicione usuários e configure sua equipe aqui" |
| 5 | WhatsApp link (se módulo ativo) | WhatsApp | "Conecte seu WhatsApp para atender clientes" |

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/onboarding/GuidedTour.tsx` | Criar | Componente principal do tour |
| `src/components/onboarding/TourStep.tsx` | Criar | Popup individual de cada passo |
| `src/hooks/use-onboarding-tour.ts` | Criar | Hook para gerenciar estado do tour |
| `src/components/layout/AppLayout.tsx` | Modificar | Adicionar GuidedTour |
| `src/pages/Dashboard.tsx` | Modificar | Remover OnboardingChecklist |
| SQL Migration | Adicionar | Coluna `onboarding_completed` na tabela users |

---

## UI do Tour

### Modal de Boas-vindas (Passo inicial)

```text
┌─────────────────────────────────────────┐
│                                         │
│          🎉 Bem-vindo ao Vimob!         │
│                                         │
│   Vamos te mostrar como configurar      │
│   seu CRM em poucos passos.             │
│                                         │
│   [Começar Tour]  [Não, obrigado]       │
│                                         │
└─────────────────────────────────────────┘
```

### Popup de Passo (Apontando para elemento)

```text
                    ┌──────────────────────────────────────┐
   ┌────────────────│  📍 Configurações                    │
   │ Dashboard      │                                      │
   │ Pipelines      │  Clique aqui para adicionar novos    │
   │ Conversas      │  usuários à sua equipe.              │
   │ Contatos       │                                      │
   │                │  [Anterior] [Próximo] [Pular tudo]   │
   │ ► Configurações└──────────────────────────────────────┘
   │ Ajuda          
   └────────────────
```

---

## Implementação Técnica

### 1. Adicionar coluna no banco

```sql
ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
```

### 2. Hook use-onboarding-tour.ts

```typescript
export function useOnboardingTour() {
  const { profile, refreshProfile } = useAuth();
  
  // Verificar se deve mostrar o tour
  const shouldShowTour = profile && !profile.onboarding_completed;
  
  // Estado local do tour
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  
  // Marcar como concluído
  const completeTour = async () => {
    await supabase.from('users')
      .update({ onboarding_completed: true })
      .eq('id', profile.id);
    await refreshProfile();
  };
  
  // Dispensar tour
  const dismissTour = async () => {
    await completeTour();
    setIsActive(false);
  };
  
  return {
    shouldShowTour,
    isActive,
    currentStep,
    startTour: () => setIsActive(true),
    nextStep: () => setCurrentStep(s => s + 1),
    prevStep: () => setCurrentStep(s => Math.max(0, s - 1)),
    dismissTour,
    completeTour,
  };
}
```

### 3. Componente GuidedTour.tsx

O componente vai:
- Mostrar modal de boas-vindas se `shouldShowTour` e não `isActive`
- Quando ativo, renderizar `TourStep` posicionado próximo ao elemento alvo
- Usar CSS para destacar o elemento (spotlight effect)
- Navegação: Anterior, Próximo, Pular

### 4. Posicionamento do Popup

Usar `getBoundingClientRect()` do elemento alvo para posicionar o popup:

```typescript
const tourSteps = [
  {
    target: '[data-tour="sidebar"]',
    title: 'Menu de Navegação',
    description: 'Use o menu para acessar todas as funcionalidades',
    position: 'right',
  },
  {
    target: '[data-tour="settings"]',
    title: 'Configurações',
    description: 'Adicione usuários e configure sua equipe aqui',
    position: 'right',
  },
  // ...
];
```

### 5. Remover OnboardingChecklist

No Dashboard.tsx, simplesmente remover a linha:
```tsx
// REMOVER:
<OnboardingChecklist />
```

---

## Diferenças do Sistema Atual

| Aspecto | Antes (Checklist) | Depois (Tour) |
|---------|-------------------|---------------|
| Quando aparece | Sempre no dashboard | Só primeira vez |
| Persistência | localStorage (pode resetar) | Banco de dados |
| Interatividade | Lista de tarefas | Popups guiados |
| Dispensar | Temporário (pode voltar) | Permanente |
| Localização | Dentro do dashboard | Overlay global |

---

## Resultado Visual Esperado

O tour terá:
- **Overlay escuro** cobrindo a tela (exceto elemento destacado)
- **Popup com seta** apontando para o elemento
- **Botões de navegação** claros
- **Animações suaves** entre passos
- **Design consistente** com o resto do app (cores, fontes)

