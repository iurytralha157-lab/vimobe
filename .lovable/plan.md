
## Revisão Completa da Página de Automações

### Diagnóstico Geral

Analisei todos os arquivos da página (`Automations.tsx`, `AutomationList.tsx`, `FollowUpTemplates.tsx`, `FollowUpBuilder.tsx`, `FollowUpBuilderEdit.tsx`, `ExecutionHistory.tsx`, `nodes/`, `use-automations.ts`) e o banco de dados. Encontrei **11 problemas** distribuídos em UX, lógica e organização.

---

### Problemas Encontrados

**1. Automações criadas ficam INATIVAS por padrão (bug crítico)**
No `useCreateAutomation`, o campo `is_active` é sempre `false` ao criar. O usuário cria uma automação, ela vai para lista como "Inativa" e ele precisa ativar manualmente — sem nenhum aviso de que isso é necessário. Deve criar como `true` por padrão e/ou mostrar um aviso imediato.

**2. A aba "Modelos" abre primeiro — mas deveria ser "Minhas Automações"**
A lógica atual define `activeTab: 'templates'` como padrão. Usuários que já têm automações criadas sempre abrem na aba errada. Deveria verificar se existem automações e abrir na aba `automations` quando houver.

**3. Templates fixos e limitados ao mercado imobiliário**
Os 3 templates em `FollowUpTemplates.tsx` são hardcoded e todos marcados como "Imobiliário". Usuários de outros segmentos (Telecom, etc.) veem templates que não fazem sentido para eles.

**4. Botão "Criar do Zero" está perdido e sem destaque**
Na aba de modelos, o botão principal de criação (`Criar do Zero`) é `variant="outline"` ao lado dos templates — sem nenhum destaque. A CTA principal da página deveria ser mais visível.

**5. O canvas ReactFlow ocupa toda a tela no mobile — inutilizável**
No mobile, o editor visual (`FollowUpBuilder` e `FollowUpBuilderEdit`) renderiza o canvas ReactFlow em tela cheia sem adaptação. O painel lateral esquerdo (configuração) fica escondido, tornando impossível configurar gatilho, sessão WhatsApp, etc.

**6. Ativação da automação exige navegar para outra tela**
Para ativar uma automação recém-criada, o usuário precisa: criar → voltar para lista → encontrar o card → usar o switch. Não há confirmação de ativação no fim do fluxo de criação.

**7. Informação de "quando dispara" está genérica nos cards**
Na `AutomationList`, o card mostra apenas o rótulo do trigger (ex: "Lead Mudou de Etapa") mas não mostra **qual** pipeline/etapa/tag. Dois cards com o mesmo gatilho são indistinguíveis.

**8. Histórico sem filtro por automação**
A aba "Histórico" mostra todas as execuções misturadas. Com múltiplas automações ativas, fica impossível saber qual automação causou qual execução sem abrir cada item.

**9. Nó de mensagem não mostra número do dia corretamente no editor de edição**
No `FollowUpBuilderEdit`, ao carregar nós existentes do banco, o campo `day` não é restaurado (linha 139: `data: { message: nodeConfig.message || '' }` — falta `day`). O nó sempre mostra "Dia 1" ao editar.

**10. Duplicação massiva de código entre `FollowUpBuilder` e `FollowUpBuilderEdit`**
Os dois arquivos têm ~800 linhas cada e compartilham 90% do código (estados, handlers, UI do painel, lógica de save). Isso significa que qualquer correção precisa ser feita em dois lugares.

**11. Aba "Modelos" não indica quais templates já foram usados**
Não há nenhuma indicação visual de quais templates o usuário já transformou em automações.

---

### O Que Vamos Melhorar

**Correções de bug (prioridade alta):**
- Corrigir o campo `day` que não carrega ao editar automações existentes
- Criar automações como `is_active: true` por padrão (ou adicionar toggle no final do wizard)
- Abrir na aba `automations` quando o usuário já tiver automações

**UX do canvas (prioridade alta):**
- Mostrar a config (gatilho, sessão, pipeline) como um painel deslizante no mobile em vez do layout de 3 colunas
- Adicionar um passo de confirmação/ativação ao concluir a criação

**Cards de automação mais informativos:**
- Exibir no card o contexto real do gatilho (pipeline + etapa, ou nome da tag)
- Adicionar filtro por automação no histórico de execuções

**Templates e criação:**
- Mover o botão "Criar do Zero" para um local mais proeminente (hero card separado no topo)
- Adicionar badge de "Já usado" nos templates que já geraram automações

**Limpeza de código:**
- Extrair a lógica comum de `FollowUpBuilder` e `FollowUpBuilderEdit` para um hook `useFollowUpBuilderState` — reduz de ~1700 para ~1000 linhas e elimina duplicação

---

### Arquivos Modificados

| Arquivo | O que muda |
|---|---|
| `src/pages/Automations.tsx` | Aba padrão inteligente (automations se já tem itens) |
| `src/components/automations/AutomationList.tsx` | Cards com contexto real do gatilho |
| `src/components/automations/FollowUpTemplates.tsx` | CTA "Criar do Zero" em destaque, badge "Já usado" |
| `src/components/automations/FollowUpBuilder.tsx` | Fix mobile, step de ativação ao concluir, `is_active: true` |
| `src/components/automations/FollowUpBuilderEdit.tsx` | Fix campo `day` ao carregar nós, remoção de código duplicado |
| `src/components/automations/ExecutionHistory.tsx` | Filtro por automação |
| `src/hooks/use-automations.ts` | `is_active: true` por padrão ao criar |

### Resumo Visual da Melhoria nos Cards

```text
ANTES:
┌─────────────────────────────────────────┐
│ 🔀  Follow-up 10 Dias           [Ativa] │
│     Lead Mudou de Etapa                  │
│     Último run: há 3 dias               │
└─────────────────────────────────────────┘

DEPOIS:
┌─────────────────────────────────────────┐
│ 🔀  Follow-up 10 Dias           [Ativa] │
│     Lead Mudou de Etapa                  │
│     📍 Pipeline: Vendas → Etapa: Base   │
│     Último run: há 3 dias • 12 concluídas│
└─────────────────────────────────────────┘
```
