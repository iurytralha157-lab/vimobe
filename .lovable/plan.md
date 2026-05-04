# Plano: Separar completamente o Site Público do CRM

## Diagnóstico do problema

Hoje, ao abrir um site público, o usuário não está realmente abrindo "só o site" — ele carrega o app inteiro do CRM antes. Isso explica:

1. **Tela branca com spinner laranja antes da home aparecer**
   O spinner é o `PageLoader` do `AuthProvider`/`ProtectedRoute`. Mesmo nas rotas públicas (`/sites/:slug/*`), o app monta `<AuthProvider>` em `App.tsx`, que tenta resolver sessão Supabase antes de renderizar qualquer coisa.

2. **Guia de configuração aparecendo**
   `<SetupGuideDialog />` é renderizado dentro de `AppRoutes`, que envolve TODAS as rotas — inclusive `/sites/:slug/*`. Mesmo banners (`AnnouncementBanner`, `ImpersonateBanner`, `TrialExpiredModal`, `MetricsPanel`) são montados na árvore pública.

3. **Domínio personalizado caindo no app do CRM**
   `isCustomDomain()` em `App.tsx` exclui qualquer host com `vettercompany.com.br`. Como `vimob.vettercompany.com.br` é o domínio padrão dos sites publicados em subdomínio, ele cai no ramo do CRM, com `AuthProvider`, em vez do ramo público.

4. **Pré-carregamento do CRM no site**
   `preloadCoreCrmPages` (Dashboard/Pipelines/Contacts/Conversations) é chamado quando há usuário logado, e bundles do CRM ficam disponíveis na mesma sessão. O bundle inicial do site também acaba arrastando providers e código do CRM.

5. **Bundle único compartilhado**
   `App.tsx` importa `PublicSiteProvider` + páginas públicas no mesmo entrypoint do CRM. Vite empacota tudo junto: o público sempre baixa código do CRM (Auth, Toaster, Tooltip, ThemeProvider, useSystemBranding, etc.).

## Objetivo

Site público (subdomínio `*.vimob.vettercompany.com.br`, domínio personalizado, e rotas `/sites/:slug/*` quando acessadas diretamente) abre **instantâneo**, com layout aparecendo imediatamente, sem spinner laranja, sem providers do CRM, sem dialogs do guia, banners ou modais administrativos.

## Mudanças

### 1. Detecção de "modo público" mais cedo (antes do React montar AuthProvider)

Em `App.tsx`, criar uma função `isPublicSiteRequest()` que retorna `true` quando:
- O hostname é um domínio customizado (não-Lovable, não-localhost), **ou**
- O hostname é um subdomínio publicado (ex.: `nardo.vimob.vettercompany.com.br` — qualquer subdomínio sob `vimob.vettercompany.com.br` que NÃO seja o app principal `vimob`), **ou**
- O `pathname` começa com `/sites/` (rota de site publicado por slug).

Hoje a regra trata `vettercompany.com.br` sempre como CRM — vamos inverter: o app principal é apenas `vimob.vettercompany.com.br` exato (ou previews `id-preview--*.lovable.app` / `vimobe.lovable.app`); qualquer outro host é público.

### 2. Rotas públicas fora do `AuthProvider`

Mover as rotas públicas para um componente irmão (`PublicAppRoot`) que **não usa** `AuthProvider` nem nenhum hook do CRM. Estrutura nova em `App.tsx`:

```text
<QueryClientProvider>
  <ThemeProvider>
    <TooltipProvider>
      <BrowserRouter>
        {isPublicSiteRequest()
          ? <PublicAppRoot />        // Site: sem AuthProvider, sem CRM
          : <CrmAppRoot />}          // CRM: AuthProvider + AppRoutes
      </BrowserRouter>
    </TooltipProvider>
  </ThemeProvider>
</QueryClientProvider>
```

`PublicAppRoot` monta apenas:
- `<LanguageProvider>` (leve)
- `<ScrollToTop />`
- `<Toaster />`/`<Sonner />` (sem dependência de auth)
- `<Routes>` cobrindo:
  - `/sites/:slug/*` → `PublishedSiteWrapper`
  - `/site/preview/*` → continua só dentro do CRM (não público)
  - `/` (em domínio customizado/subdomínio) → `CustomDomainRoutes`

### 3. Remover overlays do CRM nas rotas públicas

`AnnouncementBanner`, `ImpersonateBanner`, `TrialExpiredModal`, `SetupGuideDialog`, `MetricsPanel`, `IOSInstallGuide`, `BrandingAndPwa` (com `useSystemBranding`), `usePwaUpdate` ficam **somente** em `CrmAppRoot`. Nada disso é montado para o público.

### 4. Code-splitting real do site público

Transformar `PublicAppRoot` em chunk lazy independente:

```ts
const PublicAppRoot = lazy(() => import('./PublicAppRoot'));
```

`./PublicAppRoot.tsx` importa `PublicSiteLayout`, `PublicHome`, `PublicProperties`, etc. Como `CrmAppRoot` deixa de referenciar esses módulos e o público deixa de referenciar `AuthContext`, o bundler separa de fato os dois grafos — o site público não baixa mais o JS do CRM, e vice-versa.

Adicionar `manualChunks` em `vite.config.ts` para garantir um chunk dedicado `public-site` agrupando `src/pages/public/*` + `src/components/public/*` + `src/hooks/use-public-*` + contexts públicos.

### 5. Substituir o spinner por skeleton de layout (LCP perceptual)

`PublishedSiteWrapper` e `CustomDomainRoutes` hoje mostram `<PageLoader />` (spinner laranja) enquanto o `siteConfig` carrega. Trocar por um **skeleton do layout** (header com placeholder do logo, hero com bloco de cor do tema, footer) usando os dados que o navegador já tem:

- Aplicar `background_color` e `primary_color` lidos de `sessionStorage` (cache já existe) na primeira pintura.
- Se não há cache, renderizar o skeleton em cores neutras imediatamente; quando o `siteConfig` chega, hidrata com as cores reais.
- Remover o gating "não renderiza nada até `siteConfig` chegar"; em vez disso, `PublicSiteLayout` deve renderizar a casca (header/menu/hero shell/footer) sem precisar do config — só o conteúdo dinâmico (logo, textos) usa o config quando disponível, com `<Skeleton>` por cima.

### 6. SSR/edge meta já existente continua

`get-worker-config` e o worker de domínio personalizado continuam responsáveis por servir HTML inicial com OG/meta corretos — sem alteração.

### 7. Limpeza de pré-carregamento

`preloadCoreCrmPages` permanece, mas só é referenciado dentro de `CrmAppRoot`. Adicionalmente, em `PublicAppRoot`, fazer um `void import('./pages/public/PublicProperties')` em `requestIdleCallback` para acelerar a próxima navegação dentro do site.

### 8. `PublicSiteContext` continua só para domínio customizado

`PublicSiteProvider` (resolve por hostname) e `PublishedSiteProvider` (resolve por slug) seguem como hoje, mas agora vivem dentro de `PublicAppRoot` — sem `AuthProvider` ao redor.

## Arquivos afetados

- `src/App.tsx` — split em `CrmAppRoot` + carregamento condicional.
- `src/PublicAppRoot.tsx` (novo) — entrypoint do site público.
- `src/pages/public/PublishedSiteWrapper.tsx` — skeleton em vez de spinner; renderizar layout antes do config.
- `src/pages/public/PublicSiteLayout.tsx` — tornar a casca renderizável sem `siteConfig`; usar `<Skeleton>` para logo/textos.
- `src/contexts/PublicSiteContext.tsx` — ajustar gate `isLoading` para não bloquear render.
- `vite.config.ts` — `manualChunks` para isolar bundle público.
- (Nenhuma alteração em edge functions, RLS ou banco.)

## Resultado esperado

- Abrir `https://<sub>.vimob.vettercompany.com.br/` ou um domínio personalizado: HTML pinta header + hero shell **na primeira frame**, sem spinner laranja, sem dialog do guia, sem banner.
- Bundle inicial do site sem `AuthContext`, sem React Query do CRM, sem componentes admin → tempo até interativo significativamente menor.
- CRM e site continuam compartilhando o mesmo repositório/projeto, mas funcionam como dois apps independentes em runtime.
