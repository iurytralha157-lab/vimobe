
# Plano: Adicionar Gestão de Pipelines por Equipe

## O que você precisa

Você quer restringir o acesso a pipelines baseado em equipes. Por exemplo:
- **Equipe Vendas** → acessa apenas **Pipeline Vendas**
- **Equipe Suporte** → acessa apenas **Pipeline Suporte**

**Boa notícia:** Esta funcionalidade já está 90% pronta! Toda a estrutura de banco de dados e políticas de segurança já existem. Só falta expor a interface na página de Gestão.

---

## O que já funciona

| Componente | Status |
|------------|--------|
| Tabela `team_pipelines` | ✅ Criada |
| Políticas de segurança (RLS) | ✅ Funcionando |
| Componente de UI | ✅ Criado (`TeamPipelinesManager`) |
| Integração na página | ❌ **Falta adicionar** |

---

## Como vai funcionar

1. **Pipelines sem vínculo** = acessíveis a todos os usuários da organização
2. **Pipelines com vínculo** = apenas membros das equipes vinculadas podem ver

### Hierarquia de acesso:
- **Admin**: vê todas as pipelines e leads
- **Líder de equipe**: vê pipelines vinculadas às suas equipes + leads dessas pipelines
- **Membro de equipe**: vê pipelines vinculadas à sua equipe + leads atribuídos a ele
- **Usuário sem equipe**: vê pipelines sem vínculo + leads atribuídos a ele

---

## Solução

Adicionar uma nova aba **"Pipelines"** na página de Gestão, usando o componente `TeamPipelinesManager` que já existe.

A interface mostrará:
- Lista de equipes com suas pipelines vinculadas
- Lista de pipelines indicando se estão "Restritas" ou "Acessíveis a todos"
- Ao clicar numa equipe, abre um diálogo para selecionar quais pipelines ela pode acessar

---

## Seção Técnica

### Arquivo a modificar
`src/pages/CRMManagement.tsx`

### Mudanças

1. **Importar o componente existente:**
```typescript
import { TeamPipelinesManager } from '@/components/teams/TeamPipelinesManager';
```

2. **Adicionar ícone ao import:**
```typescript
import { Shuffle, Users, Timer, Tags, GitBranch } from 'lucide-react';
```

3. **Adicionar nova tab no TabsList:**
```typescript
<TabsTrigger 
  value="pipelines" 
  className="gap-2 px-5 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
>
  <GitBranch className="h-4 w-4" />
  Pipelines
</TabsTrigger>
```

4. **Adicionar conteúdo da tab:**
```typescript
<TabsContent value="pipelines" className="mt-0">
  <TeamPipelinesManager />
</TabsContent>
```

### Resultado Final

A página de **Gestão** terá as seguintes abas:
- Equipes
- **Pipelines** (nova)
- Distribuição
- Bolsão
- Tags

---

## Arquivos afetados

1. `src/pages/CRMManagement.tsx` - Adicionar a aba de Pipelines

Nenhuma alteração de banco de dados é necessária, pois toda a estrutura já existe e funciona.
