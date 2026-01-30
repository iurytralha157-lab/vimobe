
# Plano: Ajustes Finais no Bloco de Contato e Formatação de Valores

## Resumo das Mudanças

Você solicitou várias melhorias que vou agrupar em 4 áreas:

---

## 1. Remover Sombra do Bloco de Preços

**Arquivo:** `src/components/public/property-detail/PropertyPricing.tsx`

**Mudança:**
- Linha 70: Remover `shadow-lg` da classe do Card
- Antes: `<Card className="rounded-2xl border-0 shadow-lg sticky top-24">`
- Depois: `<Card className="rounded-2xl border border-gray-100 sticky top-24">`

---

## 2. Remover "Risquinhos" do Background

Após análise, não encontrei elementos decorativos explícitos no código. Os "risquinhos" podem ser artefatos de renderização do navegador ou elementos visuais da imagem de fundo. Vou adicionar verificação para garantir que não há elementos estranhos no background.

**Verificar se há algum padrão CSS ou elemento SVG** que cause isso no site público. Se necessário, adicionar `background: none` explícito.

---

## 3. Obrigar Formulário Antes de Qualquer Contato

**Arquivo:** `src/components/public/property-detail/PropertyPricing.tsx`

**Mudança no fluxo:**
- Remover os botões diretos de WhatsApp e Telefone
- Deixar APENAS o formulário de contato "Tenho Interesse"
- Após preencher e enviar o formulário, o usuário pode optar por ir ao WhatsApp

**Antes (linha 113-138):**
```tsx
{/* Action Buttons */}
<div className="space-y-3 pt-4">
  {whatsappUrl && (
    <a href={whatsappUrl}...> {/* BOTÃO DIRETO WHATSAPP */}
  )}
  {phoneNumber && (
    <a href={`tel:${phoneNumber}`}...> {/* BOTÃO DIRETO TELEFONE */}
  )}
</div>
```

**Depois:**
```tsx
{/* Contact Form - OBRIGATÓRIO */}
<div className="pt-4">
  <p className="text-sm text-gray-500 mb-3 text-center">
    Preencha o formulário para receber mais informações
  </p>
  <ContactFormDialog
    trigger={
      <Button className="w-full rounded-xl h-14">
        Tenho Interesse
      </Button>
    }
    ...
  />
</div>
```

---

## 4. Formatação de Valores com Separador de Milhares

**Arquivo:** `src/components/properties/PropertyFormDialog.tsx`

**Mudança:**
- Criar função auxiliar para formatar moeda enquanto digita
- Aplicar nos campos: Preço, Condomínio, IPTU, Seguro Incêndio, Taxa de Serviço

**Função de formatação:**
```tsx
const formatCurrencyInput = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  // Converte para número e formata
  const formatted = Number(numbers).toLocaleString('pt-BR');
  return formatted === '0' ? '' : formatted;
};

const parseCurrencyToNumber = (value: string): string => {
  return value.replace(/\./g, '');
};
```

**Exemplo de campo:**
```tsx
<Input 
  placeholder="500.000"
  value={formatCurrencyInput(formData.preco)}
  onChange={(e) => {
    const rawValue = parseCurrencyToNumber(e.target.value);
    setFormData({ ...formData, preco: rawValue });
  }}
/>
```

---

## 5. Corrigir Salvamento de Valores (Condomínio, IPTU, etc.)

**Problema identificado:**
Os campos estão no banco de dados e no formulário, mas vou verificar se estão sendo salvos corretamente no `handleSubmit` da página `Properties.tsx`.

**Arquivo:** `src/pages/Properties.tsx`

**Verificar linhas 221-225:**
```tsx
condominio: formData.condominio ? parseFloat(formData.condominio) : null,
iptu: formData.iptu ? parseFloat(formData.iptu) : null,
seguro_incendio: formData.seguro_incendio ? parseFloat(formData.seguro_incendio) : null,
taxa_de_servico: formData.taxa_de_servico ? parseFloat(formData.taxa_de_servico) : null,
```

Já está correto! O problema pode estar na **carga inicial** quando edita - preciso verificar se esses campos estão sendo carregados no `fullPropertyData`.

**Verificar linhas 172-175:**
```tsx
condominio: fullPropertyData.condominio?.toString() || '',
iptu: fullPropertyData.iptu?.toString() || '',
seguro_incendio: fullPropertyData.seguro_incendio?.toString() || '',
taxa_de_servico: fullPropertyData.taxa_de_servico?.toString() || '',
```

Já está correto também! Vou verificar se há algum problema na query do `useProperty`.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `PropertyPricing.tsx` | Remover sombra, remover botões diretos de contato |
| `PropertyFormDialog.tsx` | Adicionar formatação de moeda nos campos de valores |
| `Properties.tsx` | Ajustar parsing de valores formatados |

---

## Resultado Esperado

1. Bloco de preços sem sombra
2. Contato apenas via formulário (não há atalhos diretos)
3. Valores formatados com pontos de milhares enquanto digita
4. Valores de taxas (condomínio, IPTU, etc.) persistindo corretamente
