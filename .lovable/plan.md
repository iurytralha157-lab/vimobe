

## Migrar ai-agent-responder para Lovable AI Gateway

Substituir as chamadas diretas a OpenAI e Gemini por uma unica chamada ao Lovable AI Gateway, usando a `LOVABLE_API_KEY` ja configurada.

### O que muda

- **Remove**: funcoes `callOpenAI()` e `callGemini()` (cerca de 70 linhas)
- **Remove**: leitura de `OPENAI_API_KEY` e `GEMINI_API_KEY`
- **Remove**: logica de selecao de provider (`agent.ai_provider`)
- **Adiciona**: funcao unica `callLovableAI()` que chama `https://ai.gateway.lovable.dev/v1/chat/completions`
- **Modelo**: `google/gemini-3-flash-preview` (rapido e economico)
- **Tratamento de erros**: captura erros 429 (rate limit) e 402 (creditos esgotados) com logs claros

### Logica preservada (sem alteracao)

- Busca do agente ativo por sessao/organizacao
- Verificacao de handoff (palavras-chave + limite de mensagens)
- Historico de mensagens (ultimas 20)
- Contexto do lead (nome, telefone, cidade, etc.)
- Catalogo de imoveis e planos de servico
- System prompt customizavel por agente
- Insercao na outbox + disparo do message-sender
- Rastreamento em ai_agent_conversations

### Detalhes tecnicos

**Arquivo:** `supabase/functions/ai-agent-responder/index.ts`

1. **Linhas 16-17** - Remover leitura de `OPENAI_API_KEY` e `GEMINI_API_KEY`, adicionar `LOVABLE_API_KEY`

2. **Linhas 226-242** - Substituir bloco de selecao de provider por chamada unica:
```typescript
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
if (!LOVABLE_API_KEY) {
  return new Response(
    JSON.stringify({ success: false, error: "LOVABLE_API_KEY not configured" }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
aiResponse = await callLovableAI(LOVABLE_API_KEY, fullSystemPrompt, chatHistory, message);
```

3. **Linhas 289-358** - Remover `callOpenAI()` e `callGemini()`, adicionar:
```typescript
async function callLovableAI(
  apiKey: string,
  systemPrompt: string,
  history: { role: string; content: string }[],
  userMessage: string
): Promise<string> {
  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userMessage },
  ];

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (response.status === 429) {
    throw new Error("Rate limit exceeded - too many requests");
  }
  if (response.status === 402) {
    throw new Error("Payment required - AI credits exhausted");
  }
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Lovable AI error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
```

### Resultado

- **1 unica API** em vez de 2 (OpenAI + Gemini)
- **0 chaves externas** necessarias (usa LOVABLE_API_KEY ja existente)
- **Codigo ~40 linhas menor**
- Campo `ai_provider` na tabela `ai_agents` deixa de ser usado (pode ser ignorado, sem necessidade de migracao)

