
# Plano: Sistema de Tempo de Resposta e Aba de Documentos no Lead

## Visão Geral

Este plano aborda duas funcionalidades importantes:

1. **Tempo de Resposta (First Response)** - Metrificar o tempo desde a entrada do lead até a primeira ação do corretor
2. **Aba de Documentos** - Permitir upload e armazenamento de arquivos no card do lead

---

## FUNCIONALIDADE 1: Tempo de Resposta

### Contexto Atual

Já existe infraestrutura parcialmente construída:
- Edge Function `calculate-first-response` pronta para calcular e salvar os dados
- Hook `use-lead-timeline.ts` com placeholders para métricas (retornando valores vazios)
- KPICards exibe "Tempo Resp." mas com valor "--"
- Tabela `leads` tem apenas `first_touch_at`, faltam as colunas de first response

### O Que Falta

| Componente | Status | Ação |
|------------|--------|------|
| Colunas no banco (leads) | Faltando | Adicionar colunas |
| Colunas no banco (pipelines) | Faltando | Adicionar configurações |
| Gatilhos de ação | Faltando | Implementar nos botões |
| Hooks de métricas | Placeholders | Implementar queries reais |
| Dashboard | Visual pronto | Conectar dados reais |
| Performance Corretor | Visual pronto | Conectar dados reais |

---

### Fase 1: Estrutura de Banco de Dados

Adicionar colunas na tabela `leads`:

```text
first_response_at          TIMESTAMPTZ
first_response_seconds     INTEGER
first_response_channel     TEXT        -- 'whatsapp', 'phone', 'email'
first_response_actor_user_id UUID
first_response_is_automation BOOLEAN DEFAULT FALSE
first_touch_seconds        INTEGER
first_touch_channel        TEXT
first_touch_actor_user_id  UUID
```

Adicionar colunas na tabela `pipelines` (configuração):

```text
first_response_start                TEXT DEFAULT 'lead_created'  -- ou 'lead_assigned'
include_automation_in_first_response BOOLEAN DEFAULT TRUE
```

---

### Fase 2: Gatilhos nas Ações do Corretor

Implementar chamadas ao `calculate-first-response` em 3 pontos:

**WhatsApp (já implementado no message-sender):**
- Quando o corretor envia a primeira mensagem via chat flutuante
- A Edge Function `message-sender` já chama `calculate-first-response`

**Telefone (novo gatilho):**
- Quando o corretor clica no botão "Ligar" no LeadDetailDialog ou LeadCard
- Componentes: `LeadDetailDialog.tsx` (linha 536) e `LeadCard.tsx` (linha 97-101)

**Email (novo gatilho):**
- Quando o corretor clica no botão "Email" 
- Componentes: `LeadDetailDialog.tsx` (linha 545-548) e `LeadCard.tsx` (linha 110-116)

**Implementação dos gatilhos:**

```text
Para cada ação (phone/email):
1. Buscar organization_id e lead_id do contexto
2. Verificar se lead já tem first_response_at (evitar dupla contagem)
3. Chamar Edge Function calculate-first-response com:
   - lead_id
   - channel: 'phone' ou 'email'
   - actor_user_id: ID do corretor logado
   - is_automation: false
   - organization_id
4. Prosseguir com a ação original (abrir tel: ou gmail)
```

---

### Fase 3: Implementar Hooks de Métricas

Atualizar `use-lead-timeline.ts`:

**useFirstResponseMetrics:**
- Query na tabela `leads` filtrando por período
- Calcular média, mediana, % dentro do SLA
- Usar `first_response_seconds` como fonte de dados

**useFirstResponseRanking:**
- Agrupar por `first_response_actor_user_id`
- Calcular média por corretor
- Retornar ranking ordenado pelo melhor tempo

---

### Fase 4: Conectar Dashboard

**KPICards - Tempo de Resposta:**
- Atualizar `useEnhancedDashboardStats` para calcular média de `first_response_seconds`
- Formatar usando `formatResponseTime()` já existente

**Performance de Corretores:**
- O hook `use-broker-performance.ts` já busca tempo de resposta via `activities`
- Atualizar para usar `first_response_seconds` direto da tabela `leads`
- Mais preciso e performático

---

### Fase 5: Configuração por Pipeline (Opcional)

Permitir que cada pipeline defina:
- Quando o timer começa: "Quando lead entra" vs "Quando lead é atribuído"
- Se automações contam como primeira resposta

---

## FUNCIONALIDADE 2: Aba de Documentos no Lead

### Arquitetura

```text
lead_documents (nova tabela)
├── id UUID
├── organization_id UUID (FK)
├── lead_id UUID (FK)
├── uploaded_by UUID (FK users)
├── file_name TEXT
├── file_type TEXT (mime type)
├── file_size INTEGER
├── storage_path TEXT (caminho no bucket)
├── created_at TIMESTAMPTZ

Storage Bucket: lead-documents (privado)
```

---

### Fase 1: Banco de Dados e Storage

**Nova tabela `lead_documents`:**
- Armazena metadados dos arquivos
- RLS: Apenas quem tem acesso ao lead pode ver/fazer upload

**Novo bucket `lead-documents`:**
- Privado (não público)
- RLS baseado em acesso ao lead

---

### Fase 2: Nova Aba no LeadDetailDialog

Adicionar aba "Documentos" na lista de tabs (junto com Atividades, Agenda, Contato, Negócio, Histórico):

```text
tabs = [
  { id: 'activities', label: 'Atividades', icon: Activity },
  { id: 'schedule', label: 'Agenda', icon: Calendar },
  { id: 'contact', label: 'Contato', icon: Contact },
  { id: 'deal', label: 'Negócio', icon: Handshake },
  { id: 'documents', label: 'Documentos', icon: FileText },  // NOVO
  { id: 'history', label: 'Histórico', icon: History },
]
```

---

### Fase 3: Interface de Documentos

**Componente LeadDocumentsTab:**
- Lista de documentos existentes com:
  - Ícone baseado no tipo (PDF, imagem, áudio)
  - Nome do arquivo
  - Data de upload
  - Quem fez upload
  - Botão de download
  - Botão de visualizar (abre em nova aba ou modal)
  - Botão de excluir (apenas para quem fez upload ou admin)

- Botão de upload:
  - Aceita: PDF, imagens (JPG, PNG, WEBP), áudio, documentos Office
  - Limite: 10MB por arquivo
  - Upload direto para Supabase Storage

---

### Fase 4: Hook de Documentos

Novo hook `use-lead-documents.ts`:

```text
useLeadDocuments(leadId)
- Lista todos os documentos do lead
- Include: quem fez upload (nome, avatar)

useUploadDocument()
- Upload para Storage
- Cria registro na tabela
- Retorna URL assinada

useDeleteDocument()
- Remove do Storage
- Remove da tabela
```

---

## Resumo de Arquivos

### Migrations SQL
| Arquivo | Descrição |
|---------|-----------|
| add_first_response_columns.sql | Colunas em leads e pipelines |
| create_lead_documents.sql | Tabela + bucket + RLS |

### Frontend - Tempo de Resposta
| Arquivo | Mudança |
|---------|---------|
| src/components/leads/LeadDetailDialog.tsx | Adicionar gatilhos em phone/email |
| src/components/leads/LeadCard.tsx | Adicionar gatilhos em phone/email |
| src/hooks/use-lead-timeline.ts | Implementar queries reais |
| src/hooks/use-dashboard-stats.ts | Conectar avgResponseTime real |
| src/hooks/use-broker-performance.ts | Usar first_response_seconds |

### Frontend - Documentos
| Arquivo | Mudança |
|---------|---------|
| src/hooks/use-lead-documents.ts | Novo hook |
| src/components/leads/LeadDocumentsTab.tsx | Novo componente |
| src/components/leads/LeadDetailDialog.tsx | Adicionar aba documentos |

---

## Ordem de Implementação Sugerida

**Bloco 1 - Tempo de Resposta (prioridade)**
1. Migration: adicionar colunas
2. Atualizar gatilhos nos botões
3. Implementar hooks de métricas
4. Conectar Dashboard e Performance

**Bloco 2 - Documentos**
1. Migration: tabela + bucket
2. Criar hook de documentos
3. Criar componente da aba
4. Integrar no LeadDetailDialog

---

## Considerações Técnicas

- **Idempotência**: A Edge Function já verifica se `first_response_at` existe antes de calcular
- **WhatsApp**: Já está integrado no `message-sender`
- **Phone/Email**: Como são ações externas, marcamos no momento do clique (intenção de contato)
- **RLS Documentos**: Segue a mesma lógica de acesso ao lead (assigned_user, team, admin)
- **Storage**: Bucket privado com URLs assinadas para download
