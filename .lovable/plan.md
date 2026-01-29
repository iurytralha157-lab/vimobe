
# Plano Completo: Evolução do Site Público Imobiliário

## Visão Geral
Este plano cobre a revisão e aprimoramento completo do site público, incluindo sistema de cores dinâmico, filtros avançados, cadastro de localidades, formulário de contato com popup, e integração com distribuição de leads.

---

## Fase 1: Sistema de Cores Dinâmico

### Problema Atual
As cores personalizáveis (principal, secundária, destaque) configuradas em "Meu Site" não estão sendo aplicadas. O site usa cores hardcoded (#C4A052 dourado).

### Solução
Substituir todas as cores hardcoded pelo sistema de cores do siteConfig:

**Arquivos a modificar:**
- `src/pages/public/PublicSiteLayout.tsx` - Header, footer e links
- `src/pages/public/PublicHome.tsx` - Badges, botões, seções
- `src/pages/public/PublicProperties.tsx` - Filtros e cards
- `src/pages/public/PublicPropertyDetail.tsx` - Detalhes e formulário
- `src/pages/public/PublicContact.tsx` - Página de contato
- `src/pages/public/PublicAbout.tsx` - Página sobre
- `src/pages/public/PublicMap.tsx` - Marcadores do mapa

**Mapeamento de cores:**
- `primary_color` - Botões de ação, badges, links hover, ícones
- `secondary_color` - Backgrounds de seções, footer
- `accent_color` - Destaques secundários, bordas

---

## Fase 2: Sistema de Filtros Avançados

### Filtros Básicos (Sempre Visíveis)
- Cidade (select)
- Bairro (select - carregado da API)
- Faixa de Valor (slider ou inputs min/max)

### Filtros Expandidos ("Mais Filtros")
- Tipo de Imóvel
- Finalidade (Venda/Aluguel)
- Quartos (1+, 2+, 3+, 4+)
- Suítes
- Banheiros
- Vagas
- Área (m²) min/max
- Mobília (Sim/Não)
- Aceita Pet (Sim/Não)
- Condomínio (select - futuro)

### Alterações Necessárias

**1. Hook `use-public-site.ts`:**
- Adicionar novos parâmetros de filtro
- Criar hook `usePublicNeighborhoods` para buscar bairros

**2. Edge Function `public-site-data`:**
- Adicionar endpoint `neighborhoods` para listar bairros únicos
- Adicionar filtros: finalidade, suites, banheiros, vagas, mobilia, regra_pet, area

**3. Página `PublicProperties.tsx`:**
- Interface de filtros colapsável
- Seção básica sempre visível
- Botão "Mais Filtros" expande filtros adicionais
- URL reflete todos os filtros ativos

---

## Fase 3: Navegação com Filtros Pré-Aplicados

### Header Atualizado
```
HOME | BUSCAR MAPA | IMÓVEIS | APARTAMENTOS | CASAS | ALUGUEL | CONTATO
```

### Lógica de Links
- **IMÓVEIS** - `/imoveis` (sem filtros)
- **APARTAMENTOS** - `/imoveis?tipo=Apartamento`
- **CASAS** - `/imoveis?tipo=Casa`
- **ALUGUEL** - `/imoveis?finalidade=aluguel`

Os links do header serão atualizados para incluir esses filtros pré-configurados, mantendo suporte ao modo preview com `?org=ID`.

---

## Fase 4: Página do Mapa Funcional

### Problema Atual
O mapa usa posições aleatórias pois não há coordenadas nos imóveis.

### Solução Imediata
1. Adicionar colunas `latitude` e `longitude` na tabela `properties`
2. Usar geocodificação manual ou futura integração com API
3. Exibir apenas imóveis com coordenadas no mapa
4. Centro do mapa baseado na média das coordenadas ou cidade principal

### Melhorias Visuais
- Marcadores com cor primária do site
- Popup com card do imóvel e botão "Ver Detalhes"
- Cluster de marcadores quando muitos próximos

---

## Fase 5: Sistema de Cadastro de Localidades

### Novas Tabelas no Banco de Dados

```sql
-- Cidades cadastradas
CREATE TABLE property_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  uf TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bairros cadastrados
CREATE TABLE property_neighborhoods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  city_id UUID REFERENCES property_cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Condomínios cadastrados
CREATE TABLE property_condominiums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  city_id UUID REFERENCES property_cities(id),
  neighborhood_id UUID REFERENCES property_neighborhoods(id),
  name TEXT NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Atualizar properties para referenciar
ALTER TABLE properties 
  ADD COLUMN city_id UUID REFERENCES property_cities(id),
  ADD COLUMN neighborhood_id UUID REFERENCES property_neighborhoods(id),
  ADD COLUMN condominium_id UUID REFERENCES property_condominiums(id);
```

### Interface de Administração
Nova aba em **Gestão CRM** ou ao lado de **Imóveis**:
- Aba "Cidades" - CRUD de cidades
- Aba "Bairros" - CRUD de bairros (vinculados a cidades)
- Aba "Condomínios" - CRUD de condomínios

### Formulário de Imóvel Atualizado
Selects dinâmicos:
- Cidade (carrega cidades cadastradas)
- Bairro (filtra por cidade selecionada)
- Condomínio (filtra por bairro selecionado)

---

## Fase 6: Formulário de Contato com Popup

### Componente `ContactFormDialog.tsx`
Novo componente de dialog/popup reutilizável:

```tsx
<ContactFormDialog
  organizationId={organizationId}
  propertyId={property?.id}
  propertyCode={property?.codigo}
  trigger={<Button>Fale Conosco</Button>}
/>
```

### Campos do Formulário
- Nome (obrigatório)
- Telefone (obrigatório)
- E-mail
- Mensagem (preenchida automaticamente com interesse no imóvel se aplicável)

### Integração
- Substituir links diretos do WhatsApp por formulário + redirecionamento
- Botão flutuante de WhatsApp abre o popup primeiro
- Após envio bem-sucedido, opção de ir para WhatsApp

### Fluxo
1. Usuário clica em "Fale Conosco" ou botão WhatsApp
2. Popup abre com formulário
3. Usuário preenche dados
4. Sistema cria lead via `public-site-contact`
5. Toast de sucesso + opção de abrir WhatsApp

---

## Fase 7: Integração com Distribuição de Leads

### Atualização da Edge Function `public-site-contact`
Após criar o lead:
1. Verificar se existe fila de distribuição com regra `source: website`
2. Se existir, chamar `handle_lead_intake` para distribuição automática
3. Se não existir, lead fica sem atribuição no primeiro estágio

### Regras de Distribuição
Adicionar opção na UI de criação de filas:
- Nova opção de fonte: "Site (Website)"
- Filtro por categoria do imóvel (Venda/Aluguel) já existe

### Notificações
- Lead criado notifica admins com origem "Site"
- Se distribuído, notifica usuário atribuído

---

## Fase 8: Revisão Visual e UX

### Página de Contato
- Manter layout atual que já está bom
- Aplicar cores dinâmicas
- Garantir que formulário funciona corretamente

### Página de Imóveis
- Header com banner configurável
- Filtros básicos sempre visíveis
- Seção "Mais Filtros" colapsável
- Grid responsivo de cards
- Paginação

### Página de Detalhes do Imóvel
- Galeria de imagens funcional
- Formulário de interesse
- Botões de contato (WhatsApp, telefone)
- Características do imóvel

### Página do Mapa
- Mapa fullscreen com imóveis marcados
- Filtros laterais ou overlay
- Cards nos popups dos marcadores

---

## Detalhes Técnicos

### Arquivos a Criar
1. `src/pages/admin/PropertyLocations.tsx` - Gestão de localidades
2. `src/components/public/ContactFormDialog.tsx` - Popup de contato
3. `src/hooks/use-property-locations.ts` - Hook para localidades
4. `src/hooks/use-public-neighborhoods.ts` - Bairros para site público

### Arquivos a Modificar
1. `src/pages/public/PublicSiteLayout.tsx` - Header com novos links
2. `src/pages/public/PublicProperties.tsx` - Filtros avançados
3. `src/pages/public/PublicMap.tsx` - Mapa funcional
4. `src/pages/public/PublicPropertyDetail.tsx` - Popup de contato
5. `src/pages/public/PublicContact.tsx` - Cores dinâmicas
6. `src/pages/public/PublicHome.tsx` - Cores dinâmicas
7. `src/hooks/use-public-site.ts` - Novos endpoints
8. `supabase/functions/public-site-data/index.ts` - Novos filtros e endpoints
9. `supabase/functions/public-site-contact/index.ts` - Integração com distribuição
10. `src/components/properties/PropertyFormDialog.tsx` - Selects de localidades

### Migrations SQL
1. Criar tabelas de localidades
2. Adicionar colunas de referência em properties
3. Adicionar colunas latitude/longitude em properties

---

## Ordem de Implementação Sugerida

1. **Sistema de Cores** - Impacto visual imediato
2. **Filtros Avançados** - Funcionalidade crítica
3. **Navegação com Filtros** - UX do header
4. **Popup de Contato** - Captura de leads
5. **Integração Distribuição** - Automação
6. **Sistema de Localidades** - Backend + Admin
7. **Mapa Funcional** - Requer coordenadas

---

## Garantias de Não-Interferência no CRM

- Todas as alterações no site público usam contexto isolado (`PublicContext`)
- Edge functions públicas operam com `service_role` apenas para leitura
- Leads criados seguem fluxo padrão existente
- Rotas do site são completamente separadas (`/site/previsualização/*`)
- Nenhuma alteração em componentes do CRM principal
