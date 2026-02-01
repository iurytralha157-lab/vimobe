
# Análise: Sistema de Domínios do Site Imobiliário

## Como Funciona Atualmente

### 1. Estrutura do Banco de Dados
A tabela `organization_sites` já possui os campos necessários:
- `subdomain` - para subdomínios VIMOB (ex: `minhaempresa.vimob.com.br`)
- `custom_domain` - para domínios próprios (ex: `www.minhaempresa.com.br`)
- `domain_verified` - flag de verificação DNS
- `domain_verified_at` - data da verificação

### 2. Fluxo de Resolução de Domínio
A edge function `resolve-site-domain` recebe um hostname e:
1. Busca por `custom_domain` verificado
2. Se não encontrar, busca por `subdomain`
3. Retorna a configuração do site

### 3. Verificação DNS
A edge function `verify-domain-dns` usa a API do Google DNS para verificar se o domínio aponta para o IP `185.158.133.1` (IP do Lovable).

---

## O Problema

O sistema tem a lógica pronta, **mas não funciona na prática** porque:

1. **O domínio `vimob.com.br` não está configurado para resolver subdomínios** - Não adianta o usuário definir `minhaempresa` como subdomínio se `minhaempresa.vimob.com.br` não está apontando para o Lovable.

2. **O site público só funciona em modo preview** - Atualmente, só funciona via `/site/preview?org=ID`. Não há rota pública que funcione em domínio externo.

3. **O PublicSiteContext ignora domínios Lovable** - O código atual pula a resolução para domínios `lovable.app`, `lovable.dev`, etc.

---

## Solução Proposta

### Opção A: Subdomínios via Seu Domínio Personalizado (Recomendado)

Como você usa `vimob.bettercompany.com.br` como domínio do CRM, podemos criar uma estrutura assim:

| Tipo | URL | Uso |
|------|-----|-----|
| CRM | `vimob.bettercompany.com.br` | Sistema principal |
| Sites | `sites.vimob.com.br/minhaempresa` | Sites publicados |
| Preview | `vimob.bettercompany.com.br/site/preview?org=ID` | Preview interno |

**Funcionamento:**
1. Usuário configura o site no CRM
2. Define um "slug" (ex: `minhaempresa`)
3. Site fica disponível em `sites.vimob.com.br/minhaempresa`
4. Quando quiser, aponta seu domínio próprio para Lovable

### Opção B: Subdomínios Dinâmicos (Requer DNS Wildcard)

Para usar `minhaempresa.vimob.com.br`:
1. Configurar DNS wildcard `*.vimob.com.br → 185.158.133.1`
2. Adicionar `*.vimob.com.br` no painel do Lovable
3. O sistema já está preparado para resolver

---

## Implementação Proposta

### Parte 1: Rota de Sites Publicados

Criar rota `/sites/:slug/*` que:
1. Busca a organização pelo slug (subdomínio)
2. Carrega a configuração do site
3. Renderiza o site público

```
/sites/minhaempresa           → Home
/sites/minhaempresa/imoveis   → Listagem
/sites/minhaempresa/imovel/AP001 → Detalhe
```

### Parte 2: Atualizar Configurações de Domínio

Na página de configurações, mostrar:
- **Link do Site Publicado**: `https://vimob.bettercompany.com.br/sites/minhaempresa`
- **Botão Copiar Link**
- **Instruções para domínio próprio** (manter as atuais)

### Parte 3: Resolver Domínios Próprios

Para clientes que apontem seu domínio:
1. Usuário configura DNS: `www.cliente.com.br → 185.158.133.1`
2. Adiciona `www.cliente.com.br` no campo "Domínio Próprio"
3. Sistema verifica o DNS
4. Quando verificado, o site funciona no domínio do cliente

**Limitação**: Para domínios próprios funcionarem, precisam ser adicionados no painel do Lovable como domínios customizados. Isso é uma limitação da plataforma.

---

## Resumo da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         ACESSO AO SITE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  OPÇÃO 1: Preview (desenvolvimento)                             │
│  └─ /site/preview?org=UUID                                      │
│                                                                 │
│  OPÇÃO 2: Site Publicado via Slug (imediato)                    │
│  └─ /sites/minhaempresa                                         │
│  └─ https://vimob.bettercompany.com.br/sites/minhaempresa       │
│                                                                 │
│  OPÇÃO 3: Domínio Próprio (requer verificação DNS)              │
│  └─ https://www.clienteimobiliaria.com.br                       │
│  └─ Requer: registro A → 185.158.133.1                          │
│  └─ Requer: domínio adicionado no painel Lovable                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sobre o Email em Outra Plataforma

Quando o cliente usa email em UOL, Hostinger, etc:
- Ele **NÃO** deve alterar os registros MX (email)
- Ele deve apenas adicionar registros **A** para o site
- As instruções que já mostramos estão corretas:
  - Tipo: A | Nome: @ | Valor: 185.158.133.1
  - Tipo: A | Nome: www | Valor: 185.158.133.1

Isso **não afeta** o email, apenas o site.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/App.tsx` | Adicionar rota `/sites/:slug/*` |
| `src/pages/public/PublishedSiteWrapper.tsx` | **CRIAR** - Similar ao PreviewSiteWrapper mas usa slug |
| `src/pages/SiteSettings.tsx` | Mostrar link do site publicado |
| `src/hooks/use-organization-site.ts` | Adicionar campo slug (reusar subdomain) |

---

## Teste Imediato

Após implementação, você poderá:
1. Definir um slug (ex: `teste`) nas configurações do site
2. Acessar `https://vimob.bettercompany.com.br/sites/teste`
3. Ver o site funcionando imediatamente, sem precisar configurar DNS

Para domínios próprios, ainda seria necessário:
1. Cliente apontar DNS para `185.158.133.1`
2. Adicionar o domínio no painel do Lovable
3. Aguardar verificação

