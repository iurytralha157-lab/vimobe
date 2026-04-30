## Ajustes solicitados

### 1. Sininho de notificações (`src/components/layout/NotificationBell.tsx`)
- Aumentar o botão para `h-12 w-12` (igual à cápsula do usuário, padrão dos outros ícones do header).
- O ícone interno permanece `h-5 w-5`.
- Ajustar o badge vermelho: posicionar em `-top-0.5 -right-0.5`, tamanho `h-5 w-5`, com `ring-2 ring-background` para criar o efeito de "destacado em cima do botão" sem cobrir o ícone (o número fica visível no canto, não em cima do desenho do sino).

### 2. Esconder "Instalar App" no desktop
No `src/components/layout/AppSidebar.tsx`, o item `install` aparece para todos. Ajustar o `computedBottomItems` para remover esse item quando não for mobile. Vou:
- Importar `useIsMobile` do `@/hooks/use-mobile`.
- Filtrar dentro do `useMemo` dos `bottomItems`: se `labelKey === 'install'` e `!isMobile`, ocultar.

### 3. Corrigir rota da notificação (404 ao clicar)
A função `handleNotificationClick` redireciona para `/leads?id=...`, rota que não existe (causa 404).
- Trocar para `navigate(`/crm/pipelines?lead=${notification.lead_id}`)`, que é a rota real onde os leads são exibidos no Kanban.

### Detalhes técnicos
```text
Header (desktop):
[OrgSwitcher] [Theme] [Sininho h-12] [User Capsule h-12]
                          ^
                          badge no canto sup-direito
                          com ring no fundo

Sidebar bottomItems:
- mySite (admin)
- settings
- install  <-- só renderiza se isMobile
```

Nenhuma migração de banco é necessária; apenas alterações em componentes React.