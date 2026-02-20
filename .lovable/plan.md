## Redesign do Card Mobile de Lead

### O que precisa mudar

Comparando o print de referência com o código atual em `LeadDetailDialog.tsx` (MobileContent), identifiquei que o header mobile está muito vertical e pesado. O print mostra um layout muito mais compacto e elegante.

### Diferenças Detalhadas

**Atual (MobileContent - linhas 602-780):**

1. Avatar + Nome (linha)
2. Botões Ligar/Chat/Email (linha)
3. Seletor de Estágio — ocupa linha inteira como botão largo com gradiente
4. Select de Deal Status — ocupa outra linha inteira com borda
5. Tags — mais uma linha
6. Badge de primeira resposta — mais uma linha

**Referência (print):**

1. Avatar + Nome + Tags + botão "+" — tudo na mesma linha com X fechar
2. Botões Ligar / Chat / Email — linha com larguras balanceadas
3. **Estágio (pill compacto)** + **Deal Status (pill compacto)** — mesma linha, lado a lado
4. Tabs de navegação compactas

Isso reduz o header de ~6 elementos empilhados para apenas 3 linhas, ganhando muito espaço para o conteúdo.

### Mudanças no Código

**Arquivo: `src/components/leads/LeadDetailDialog.tsx**`
Apenas a seção `MobileContent` será alterada (linhas ~602–780):

**Linha 1 — Header compactado:**

```jsx
{/* Lead Info — Avatar + Nome + Tags na mesma linha */}
<div className="flex items-center gap-2.5 mb-3 pr-10">
  <Avatar h-11 w-11 /> 
  <div className="flex-1 min-w-0">
    <h2 className="font-semibold text-base truncate">{lead.name}</h2>
    {/* Tags inline com o nome + botão + */}
    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
      {lead.tags?.slice(0, 3).map(tag => <Badge ... />)}
      <Popover><Button +></Button></Popover>
    </div>
  </div>
</div>
```

**Linha 2 — Ações rápidas (igual, sem mudança):**

```jsx
{/* Quick Actions — Ligar / Chat / Email */}
<div className="flex items-center gap-2 mb-3">
  <Button variant="outline" flex-1>Ligar</Button>
  <Button primary flex-1>Chat</Button>
  <Button variant="outline" w-9>Email icon</Button>
</div>
```

**Linha 3 — Estágio + Deal Status na mesma linha (NOVO):**

```jsx
{/* Stage + Deal Status — mesma linha, compactos */}
<div className="flex items-center gap-2">
  {/* Estágio como Popover com pill */}
  <Popover>
    <PopoverTrigger>
      <button className="flex-1 flex items-center gap-1.5 px-3 py-1.5 rounded-full 
                          bg-primary/10 text-primary text-sm font-medium">
        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        {lead.stage?.name || 'Sem estágio'}
        <ChevronDown h-3 w-3 />
      </button>
    </PopoverTrigger>
    <PopoverContent>... lista de estágios ...</PopoverContent>
  </Popover>
  
  {/* Deal Status como Select pill */}
  <Select value={lead.deal_status || 'open'}>
    <SelectTrigger className="w-auto rounded-full px-3 py-1.5 h-auto text-sm border-0 bg-muted">
      <CircleDot/Trophy/XCircle icon />
      <span>Aberto/Ganho/Perdido</span>
    </SelectTrigger>
    ...
  </Select>
</div>
```

**Tags saem do header** (movidas para linha do avatar).

**First Response badge** fica removido do header (informação disponível nas abas).

### Resultado Visual Esperado

```text
┌─────────────────────────────────────┐
│ [M]  Márcia • MCMV  • Meta [+]  [X] │
│                                     │
├─────────────────────────────────────┤
│  [Ligar]   [● Chat]            [✉] │
├─────────────────────────────────────┤
│  [● Contato inicial ▾] [ ○ Aberto ] │
├─────────────────────────────────────┤
│ Atividades  Agenda  Contato  Mais   │
└─────────────────────────────────────┘
```

### Resumo dos arquivos


| Arquivo                                     | Mudança                                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `src/components/leads/LeadDetailDialog.tsx` | Refatorar `MobileContent` (linhas 602-780): mover tags para junto do nome, compactar estágio + deal status na mesma linha horizontal |


Apenas a seção `MobileContent` é alterada. O layout Desktop não é tocado.