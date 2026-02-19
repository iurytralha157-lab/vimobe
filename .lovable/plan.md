
# Correção de Segurança: Impersonação sem Alterar o Banco de Dados

## Diagnóstico do problema atual

### Fluxo atual (inseguro)
```text
startImpersonate(orgId)
  → supabase.from('users').update({ organization_id: orgId })   ← gravado no banco!
  → localStorage.setItem('impersonating', ...)
  → fetchProfile() → lê organization_id do banco

stopImpersonate()
  → supabase.from('users').update({ organization_id: null })    ← restaura no banco
  → localStorage.removeItem('impersonating')
```

**Cenários de falha:**
- Aba fechada sem clicar "Voltar" → `organization_id` fica errado no banco para sempre
- `localStorage` limpo manualmente → banner some, mas banco ainda tem `organization_id` errada
- Crash do browser durante impersonação → super admin "preso" em outra org
- RLS bypassa pela `organization_id` da tabela `users` → escritas acidentais na org errada

### Fluxo proposto (seguro — só localStorage)
```text
startImpersonate(orgId)
  → NÃO toca o banco
  → localStorage.setItem('impersonating', ...)
  → fetchProfile() → lê organization_id DO BANCO (original do super admin)
                   → sobrepõe organization com a org impersonada (só em memória)

stopImpersonate()
  → NÃO toca o banco
  → localStorage.removeItem('impersonating')
  → recarrega profile normalmente → usa organization_id original do banco

Recovery no startup
  → se há 'impersonating' no localStorage → carrega org impersonada na memória
  → se NÃO há 'impersonating' no localStorage mas super admin tem organization_id ≠ null no banco:
      → não faz nada (era o comportamento antigo, agora não acontece mais)
```

---

## Arquivos a modificar

### `src/contexts/AuthContext.tsx` — mudança principal

#### 1. Remover a escrita no banco de `startImpersonate`

**Antes (linhas 130-153):**
```ts
const startImpersonate = async (orgId: string, orgName: string) => {
  if (user) {
    await supabase
      .from('users')
      .update({ organization_id: orgId })   // ← REMOVER
      .eq('id', user.id);
    logAuditAction('impersonate_start', ...).catch(console.error);
  }
  const impersonateSession = { orgId, orgName };
  setImpersonating(impersonateSession);
  localStorage.setItem('impersonating', JSON.stringify(impersonateSession));
  if (user) await fetchProfile(user.id);
};
```

**Depois:**
```ts
const startImpersonate = async (orgId: string, orgName: string) => {
  if (!user) return;

  // Log auditoria
  logAuditAction('impersonate_start', 'organization', orgId, undefined, {
    org_name: orgName,
    started_at: new Date().toISOString()
  }).catch(console.error);

  const impersonateSession: ImpersonateSession = { orgId, orgName };

  // Persist no localStorage ANTES de setar o estado
  // para que fetchProfile() já leia o impersonating correto
  localStorage.setItem('impersonating', JSON.stringify(impersonateSession));
  setImpersonating(impersonateSession);

  // Buscar e setar a org impersonada em memória (sem tocar o banco)
  const { data: orgData } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (orgData) setOrganization(orgData as Organization);
};
```

#### 2. Remover a escrita no banco de `stopImpersonate`

**Antes (linhas 155-179):**
```ts
const stopImpersonate = async () => {
  if (user && impersonating) {
    logAuditAction('impersonate_stop', ...).catch(console.error);
  }
  if (user) {
    await supabase
      .from('users')
      .update({ organization_id: null })   // ← REMOVER
      .eq('id', user.id);
  }
  setImpersonating(null);
  localStorage.removeItem('impersonating');
  setOrganization(null);
  if (user) await fetchProfile(user.id);
};
```

**Depois:**
```ts
const stopImpersonate = async () => {
  if (user && impersonating) {
    logAuditAction('impersonate_stop', 'organization', impersonating.orgId, undefined, {
      org_name: impersonating.orgName,
      stopped_at: new Date().toISOString()
    }).catch(console.error);
  }

  setImpersonating(null);
  localStorage.removeItem('impersonating');
  setOrganization(null); // limpa org impersonada imediatamente

  // Recarregar org original do super admin (usando organization_id real do banco)
  if (user) await fetchProfile(user.id);
};
```

#### 3. Ajuste no `fetchProfile` — ler impersonating do localStorage diretamente

O `fetchProfile` usa `impersonating?.orgId` para decidir qual org buscar. Como o state React e o localStorage podem estar em momentos diferentes durante a inicialização, a leitura precisa ser explícita do localStorage:

**Antes (linha 108):**
```ts
const orgIdToFetch = impersonating?.orgId || profileData.organization_id;
```

**Depois (lê diretamente do localStorage para evitar stale closure):**
```ts
// Ler do localStorage para garantir que o valor está atualizado,
// mesmo durante o startup onde o estado React ainda pode ser null
const storedImpersonating = localStorage.getItem('impersonating');
const activeImpersonation: ImpersonateSession | null = storedImpersonating
  ? JSON.parse(storedImpersonating)
  : null;

const orgIdToFetch = activeImpersonation?.orgId || profileData.organization_id;
```

#### 4. Recovery automático no startup

O código de startup (`getSession().then(...)`) já chama `fetchProfile`, que com a mudança acima já vai ler o `localStorage` e carregar a org impersonada corretamente. O recovery é automático — sem código extra necessário.

**Comportamento de recovery:**
- App abre com `impersonating` no localStorage → `fetchProfile` detecta, carrega org impersonada em memória → banner aparece → tudo funciona
- App abre sem `impersonating` no localStorage → carrega org real do banco → sem impersonação → comportamento normal

---

## Impacto nas páginas que chamam `startImpersonate`

`AdminOrganizations.tsx` e `AdminOrganizationDetail.tsx` não precisam de mudanças — a assinatura de `startImpersonate(orgId, orgName)` permanece idêntica. Apenas o que acontece internamente muda.

---

## Resumo das mudanças

| Ponto | Antes | Depois |
|---|---|---|
| `startImpersonate` | Escreve `organization_id` no banco | Só salva no localStorage e busca org em memória |
| `stopImpersonate` | Restaura `organization_id = null` no banco | Só remove do localStorage e recarrega perfil |
| `fetchProfile` | Usa state `impersonating` (pode estar desatualizado) | Lê diretamente do `localStorage` (sempre atualizado) |
| Crash/fechamento de aba | Super admin fica com `organization_id` errado no banco | Sem efeito — banco nunca foi alterado |
| Recovery no startup | Nenhum | Automático via `localStorage` + `fetchProfile` |
| RLS no banco | Chamadas com `organization_id` errada possível | Sem risco — `organization_id` do super admin nunca muda |

**Arquivo modificado:** apenas `src/contexts/AuthContext.tsx` (3 funções internas).
