
# Filtro de Categorias na Página de Notificações

## Objetivo
Adicionar um filtro por categoria na página de notificações para permitir que os usuários separem facilmente notificações de WhatsApp, Leads e outras categorias.

## Categorias Propostas

| Categoria | Tipos Incluídos | Ícone |
|-----------|-----------------|-------|
| Todas | Todos os tipos | Bell |
| Leads | `lead`, `new_lead` | UserPlus |
| WhatsApp | `message`, `whatsapp` | MessageCircle |
| Sistema | `warning`, `automation`, `system`, `info` | Settings |
| Financeiro | `commission`, `contract` | DollarSign |
| Tarefas | `task` | CheckSquare |

## Interface do Usuário

```text
┌─────────────────────────────────────────────────────────────────┐
│  🔔 Notificações                                                │
│  Você tem 5 notificações não lidas                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Filtro por Categoria:                                          │
│  ┌──────┬───────┬──────────┬─────────┬────────────┬────────┐   │
│  │ Todas│ Leads │ WhatsApp │ Sistema │ Financeiro │ Tarefas│   │
│  │ (50) │ (1571)│  (148)   │  (182)  │    (5)     │  (0)   │   │
│  └──────┴───────┴──────────┴─────────┴────────────┴────────┘   │
│                                                                 │
│  Status: [ Todas ] [ Não lidas (5) ]                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 👤 Novo Lead: João Silva                                │   │
│  │    Origem: Meta Ads - Campanha Verão                    │   │
│  │    há 2 minutos                            [✓ Marcar]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Arquivos a Modificar

### 1. `src/pages/Notifications.tsx`

**Mudanças:**
- Adicionar import do ícone `MessageCircle` e `Settings` do lucide-react
- Criar estado `categoryFilter` com valor padrão `'all'`
- Adicionar mapeamento de categorias para tipos
- Adicionar componente de filtro de categorias (usando Tabs ou Badges clicáveis)
- Modificar a lógica de filtragem para combinar status (lidas/não lidas) + categoria
- Adicionar ícone WhatsApp no mapeamento `typeIcons`
- Adicionar label "WhatsApp" no mapeamento `typeLabels`

**Novo código:**
```typescript
// Categorias de notificação
const notificationCategories = {
  all: { label: 'Todas', types: null, icon: Bell },
  leads: { label: 'Leads', types: ['lead', 'new_lead'], icon: UserPlus },
  whatsapp: { label: 'WhatsApp', types: ['message', 'whatsapp'], icon: MessageCircle },
  system: { label: 'Sistema', types: ['warning', 'automation', 'system', 'info'], icon: Settings },
  financial: { label: 'Financeiro', types: ['commission', 'contract'], icon: DollarSign },
  tasks: { label: 'Tarefas', types: ['task'], icon: CheckSquare },
};

// Estado adicional
const [categoryFilter, setCategoryFilter] = useState<keyof typeof notificationCategories>('all');

// Lógica de filtragem combinada
const filteredNotifications = notifications.filter(n => {
  // Filtro de status (lidas/não lidas)
  if (filter === 'unread' && n.is_read) return false;
  
  // Filtro de categoria
  const category = notificationCategories[categoryFilter];
  if (category.types && !category.types.includes(n.type)) return false;
  
  return true;
});
```

## Detalhes de Implementação

### Design Responsivo
- Em desktop: filtros de categoria em linha horizontal
- Em mobile: scroll horizontal nos filtros ou dropdown

### Contadores por Categoria
- Exibir contador de notificações não lidas por categoria
- Esconder categorias com 0 notificações (opcional)

### Comportamento
- Ao selecionar categoria, mantém o filtro de status atual
- Reset para "Todas" ao clicar no header da página
- Navegação via URL params (opcional para deep linking)

## Benefícios

1. **Organização**: Usuários podem focar em um tipo específico de notificação
2. **Produtividade**: Separar notificações de WhatsApp (alto volume) das de leads (alta prioridade)
3. **UX Melhorada**: Visual claro com contadores por categoria
