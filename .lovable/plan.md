
# Bottom Navigation Nativa para Mobile

## Visao Geral

Substituir o menu hamburger lateral (Sheet) por uma **bottom tab bar fixa** no estilo de apps nativos (iOS/Android), mostrando 4 abas principais + botao central de acao rapida. Os itens restantes ficam acessiveis via um menu "Mais" na ultima aba.

## Layout Visual

```text
+------------------------------------------+
|  Header (titulo + notificacoes + avatar)  |
+------------------------------------------+
|                                          |
|           Conteudo da pagina             |
|                                          |
|                                          |
+------------------------------------------+
|                                          |
| [Dashboard] [Pipelines] [+] [Conversas] [Mais] |
|   icone       icone    FAB    icone     icone   |
|   label       label          label     label    |
+------------------------------------------+
```

- 4 abas fixas nos cantos: Dashboard, Pipelines, Conversas, Mais
- Botao central elevado (FAB) para acao rapida (criar lead)
- A aba "Mais" abre um Sheet com todos os outros itens (incluindo Financeiro, Imoveis, Agenda, Gestao, Configuracoes, Ajuda, etc.)
- As abas respeitam modulos e permissoes: se WhatsApp esta desabilitado, "Conversas" nao aparece; se CRM esta desabilitado, "Pipelines" nao aparece
- Aba ativa destacada com cor primary e indicador visual

## Detalhes Tecnicos

### Arquivos a criar
- `src/components/layout/MobileBottomNav.tsx` -- componente da bottom bar

### Arquivos a modificar
- `src/components/layout/AppLayout.tsx` -- adicionar `MobileBottomNav` no layout mobile e ajustar padding-bottom do main para nao ficar escondido atras da barra
- `src/components/layout/AppHeader.tsx` -- remover o `MobileSidebar` do header (o hamburger menu nao sera mais necessario)
- `src/components/layout/MobileSidebar.tsx` -- manter o arquivo (o Sheet sera reutilizado pelo botao "Mais" da bottom nav)

### MobileBottomNav.tsx

**Estrutura:**
- Barra fixa no bottom com `fixed bottom-0 left-0 right-0 z-50` e `pb-[env(safe-area-inset-bottom)]` para suporte a iPhones com notch
- Background `bg-card/95 backdrop-blur-lg border-t border-border`
- 5 slots: 4 abas + 1 FAB central

**Abas principais (dinamicas com modulos/permissoes):**
1. Dashboard (sempre visivel)
2. Pipelines (se modulo `crm` habilitado)
3. FAB central -- botao circular elevado para criar lead
4. Conversas (se modulo `whatsapp` habilitado)
5. Mais -- abre Sheet lateral com todos os outros menus

Se um modulo nao esta habilitado, a aba e substituida pela proxima disponivel na lista de prioridade:
- Contatos, Agenda, Imoveis, Financeiro (nessa ordem)

**Botao "Mais":**
- Abre o Sheet existente do `MobileSidebar` (reutiliza toda a logica de filtragem por modulos/permissoes/role)
- Mostra todos os itens de navegacao exceto os que ja estao na bottom bar

**FAB central (Criar Lead):**
- Botao circular com icone `Plus`, elevado acima da barra
- Abre o `CreateLeadDialog` existente
- Visivel apenas se modulo `crm` esta habilitado

**Indicador de aba ativa:**
- Icone e label com cor `text-primary` quando ativo
- Pequeno dot ou barra acima do icone ativo
- Icones e labels inativos em `text-muted-foreground`

### Modificacoes no AppLayout.tsx

- Renderizar `<MobileBottomNav />` apos o `<main>` quando `isMobile === true`
- Adicionar `pb-16 lg:pb-0` ao `<main>` para compensar a altura da bottom bar no mobile
- Remover import do MobileSidebar do header no mobile (a navegacao agora esta no bottom)

### Modificacoes no AppHeader.tsx

- Remover a linha `{isMobile && <MobileSidebar />}` -- o hamburger menu nao sera mais exibido
- O header mobile ficara mais limpo: apenas titulo + acoes (notificacoes, tema, avatar)

### Acessibilidade e UX

- Labels curtos abaixo dos icones (max 10 caracteres)
- Haptic feedback visual no tap (scale animation)
- Transicao suave entre abas com `transition-colors duration-200`
- Badge de contagem no icone de Conversas (unread messages) usando o hook `useUnreadNotificationsCount` ou similar
- Safe area padding para dispositivos com barra de navegacao gestual

### Traducoes

Todas as labels ja existem no i18n (`t.nav.dashboard`, `t.nav.pipelines`, `t.nav.conversations`). A aba "Mais" precisa de uma nova chave: `t.nav.more` = "Mais".
