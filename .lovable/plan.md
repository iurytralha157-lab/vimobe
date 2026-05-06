## Mudanças na página "Selecione a organização"

Arquivo: `src/pages/SelectOrganization.tsx`

### 1. Sempre exibir o nome da organização
Hoje os cards usam `truncate` + `font-semibold` mas o nome da primeira org aparece em branco no print. Investigar/garantir:
- Renderizar `org.organization_name` com fallback `"Organização"` se vier vazio/null.
- Remover qualquer condicional que esconda o texto. Aumentar contraste (texto sempre `text-foreground`, sem depender de hover).
- Usar `break-words` em vez de `truncate` para nunca cortar.

### 2. Avatar redondo, laranja com iniciais brancas
Substituir o avatar atual (`rounded-xl`, fallback `bg-primary/10 text-primary`) por:
- `rounded-full` (formato circular padrão do sistema).
- Se `organization_logo` existir → mostrar a logo (também circular, com `object-cover`).
- Caso contrário → fundo `bg-primary` sólido (laranja), texto `text-primary-foreground` (branco), exibindo as **2 primeiras letras** do nome em maiúsculas (ex.: "PL", "OR").

### 3. Substituir o ícone `Building2` do topo pela logo da Vetter (system branding)
Seguir o mesmo padrão da página de Login (`src/pages/Auth.tsx`):
- Importar `useSystemSettings` e `useTheme` (`next-themes`).
- Resolver a logo conforme tema:
  - dark → `logo_url_dark || logo_url_light`
  - light → `logo_url_light || logo_url_dark`
- Renderizar `<img>` com altura ~48–56px, centralizado.
- Fallback para `Building2` apenas se nenhuma logo estiver configurada no painel Super Admin.

### 4. Pequenos ajustes de UX
- Garantir que os badges (Administrador / Usuário) continuem abaixo do nome.
- Manter o card `rounded-2xl` (design system).

### Detalhes técnicos

```tsx
// Helper de iniciais
const getInitials = (name?: string | null) =>
  (name || 'OR')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0])
    .join('')
    .toUpperCase();

// Avatar
<Avatar className="h-12 w-12 rounded-full">
  {org.organization_logo && <AvatarImage src={org.organization_logo} className="object-cover" />}
  <AvatarFallback className="rounded-full bg-primary text-primary-foreground font-bold">
    {getInitials(org.organization_name)}
  </AvatarFallback>
</Avatar>

// Logo no header (mesma lógica do Auth.tsx)
const logoUrl = resolvedTheme === 'dark'
  ? systemSettings?.logo_url_dark || systemSettings?.logo_url_light
  : systemSettings?.logo_url_light || systemSettings?.logo_url_dark;
```

Sem alterações de backend, hooks ou tabelas — apenas presentation na `SelectOrganization.tsx`.