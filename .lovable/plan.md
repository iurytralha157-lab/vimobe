
## Consolidar Redistribuição dentro da aba Distribuição

### O que será feito

**1. Remover a aba "Redistribuição"** do menu de navegação em `CRMManagement.tsx`

**2. Mover a lógica de redistribuição para dentro do formulário de fila** (`DistributionQueueEditor.tsx`) — na seção "Configurações Avançadas", onde já existe o toggle "Ativar redistribuição?". Quando ativado, exibirá:
- Tempo máximo para primeiro contato (minutos)
- Quantidade máxima de tentativas de redistribuição
- Explicação visual dos canais monitorados (WhatsApp, Telefone, E-mail)

**3. Salvar as configurações de redistribuição por fila** — os campos `pool_enabled`, `pool_timeout_minutes` e `pool_max_redistributions` já existem na tabela `pipelines`. A fila está vinculada a um `target_pipeline_id`, então ao salvar a fila com redistribuição ativa, o sistema atualiza o pipeline correspondente com essas configurações.

**4. Na aba Distribuição**, adicionar um pequeno painel colapsável de status da redistribuição (quantidade de leads aguardando contato + histórico rápido) para não perder visibilidade. Esses dados vêm das mesmas queries que hoje existem no `PoolTab.tsx`.

---

### Fluxo do usuário após a mudança

```text
Gestão → Distribuição → [Card da fila] → Editar → Configurações Avançadas
  └─ "Ativar redistribuição?" [Switch OFF → ON]
       ├─ Tempo máximo para 1º contato: [10] minutos
       ├─ Quantas vezes tentar outro corretor: [3] vezes
       └─ Monitorado via: 💬 WhatsApp  📞 Telefone  ✉️ E-mail
```

---

### Arquivos modificados

#### 1. `src/pages/CRMManagement.tsx`
- Remover o item `{ value: 'pool', label: 'Redistribuição', icon: Timer }` do array `managementTabs`
- Remover o `TabsContent value="pool"` e o import de `PoolTab`
- Remover o item `pool` do objeto `tabIntros`
- Remover o import do ícone `Timer`

#### 2. `src/components/round-robin/DistributionQueueEditor.tsx`
- Expandir a interface `QueueSettings` para incluir:
  ```ts
  redistribution_timeout_minutes?: number;
  redistribution_max_attempts?: number;
  ```
- Na seção **Configurações Avançadas**, logo abaixo do Switch "Ativar redistribuição?", renderizar condicionalmente (quando `enable_redistribution = true`) dois campos:
  - **Input numérico** "Tempo máximo para primeiro contato" (1–120 minutos)
  - **Input numérico** "Quantas vezes tentar outro corretor" (1–10 vezes)
  - **Linha informativa** com ícones de WhatsApp, Telefone e E-mail explicando o que conta como "contato"
- Inicializar valores padrão: `redistribution_timeout_minutes: 10`, `redistribution_max_attempts: 3`
- Carregar valores existentes a partir do `queue.settings` no `useEffect`

#### 3. `src/hooks/use-create-queue-advanced.ts`
- No `mutationFn` de criação/atualização, quando `settings.enable_redistribution = true`, executar também um `UPDATE` na tabela `pipelines` com:
  ```ts
  pool_enabled: true,
  pool_timeout_minutes: settings.redistribution_timeout_minutes,
  pool_max_redistributions: settings.redistribution_max_attempts
  ```
- Quando `enable_redistribution = false`, setar `pool_enabled: false` no pipeline correspondente

#### 4. `src/components/crm-management/DistributionTab.tsx`
- Adicionar um pequeno painel de status colapsável ao final da página (acima do editor) com:
  - Contagem de leads aguardando 1º contato (`first_response_at IS NULL`)
  - Botão "Executar verificação agora" (chama edge function `pool-checker`)
  - Lista resumida (últimas 5 redistribuições do histórico)
- Isso preserva a visibilidade operacional sem precisar de uma aba separada

---

### Por que salvar no pipeline e não só no `settings` da fila?

A edge function `pool-checker` lê diretamente das colunas `pool_enabled`, `pool_timeout_minutes` e `pool_max_redistributions` da tabela `pipelines`. Para não refatorar a edge function, o approach mais seguro é: ao ativar redistribuição em uma fila, sincronizar as configurações no pipeline vinculado — que é exatamente o que o `pool-checker` já monitora.

---

### Resumo das mudanças

| Arquivo | Mudança |
|---|---|
| `src/pages/CRMManagement.tsx` | Remove aba "Redistribuição" |
| `src/components/round-robin/DistributionQueueEditor.tsx` | Expande seção Avançada com campos de tempo e tentativas |
| `src/hooks/use-create-queue-advanced.ts` | Sincroniza configurações de pool no pipeline ao salvar |
| `src/components/crm-management/DistributionTab.tsx` | Adiciona painel de status de redistribuição |
