
# Plano: Reorganizar Header do FloatingChat

## Problema Identificado
O topo do chat flutuante está visualmente desorganizado com muitos elementos desalinhados:
- Avatar, nome, telefone, "Ver Lead", ícone telefone, opções, minimizar, fechar - todos misturados
- Falta hierarquia visual clara
- Botões de controle do chat misturados com ações do contato
- Espaço limitado não está sendo bem aproveitado

## Solução Proposta
Criar um header compacto e bem organizado especificamente para o FloatingChat, com três áreas distintas:

```text
+------------------------------------------------------------------+
|  [←]  [Avatar] Nome do Contato           [Ver Lead] [-] [x]     |
|              +55 (22) 99999-9999  [Tag1] [Tag2]                 |
+------------------------------------------------------------------+
```

### Estrutura do Novo Header

**Linha Principal (flexbox):**
1. **Esquerda**: Botão voltar (←) + Avatar pequeno (32x32px)
2. **Centro (flex-1)**: Nome do contato (truncado) 
3. **Direita**: Botão "Ver Lead" (ícone apenas) + Minimizar + Fechar

**Segunda Linha (abaixo do nome):**
- Telefone formatado
- Tags do lead (máximo 2 + contador)
- Info de pipeline/estágio (se couber)

### Mudanças Técnicas

1. **Criar novo componente `FloatingConversationHeader`** dentro do `FloatingChat.tsx`:
   - Layout em duas linhas compactas
   - Botão voltar integrado à esquerda
   - Controles do chat (minimizar/fechar) à direita
   - Avatar menor (32x32px) para economizar espaço
   - Tags exibidas na segunda linha com o telefone

2. **Simplificar a estrutura**:
   - Remover o wrapper `relative` com botões sobrepostos
   - Não usar mais o `ConversationHeader` genérico (feito para tela maior)
   - Botão "Ver Lead" será apenas um ícone (ExternalLink) com tooltip

3. **Melhorar espaçamento**:
   - Padding consistente (px-3 py-2)
   - Gap adequado entre elementos
   - Truncar textos longos

### Código Principal

```tsx
const FloatingConversationHeader = () => (
  <div className="border-b bg-card shrink-0">
    {/* Linha 1: Navegação e info principal */}
    <div className="flex items-center gap-2 px-3 py-2">
      {/* Voltar */}
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={clearActiveConversation}>
        <ArrowLeft className="h-4 w-4" />
      </Button>
      
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={activeConversation.contact_picture} />
        <AvatarFallback className="text-xs">...</AvatarFallback>
      </Avatar>
      
      {/* Nome e telefone */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{displayName}</p>
        <p className="text-xs text-muted-foreground truncate">{phone}</p>
      </div>
      
      {/* Ações */}
      <div className="flex items-center gap-1 shrink-0">
        {leadId && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleViewLead}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ver Lead</TooltipContent>
          </Tooltip>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={minimizeChat}>
          <Minus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeChat}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
    
    {/* Linha 2: Tags e Pipeline (se houver) */}
    {(tags.length > 0 || pipelineName) && (
      <div className="flex items-center gap-1.5 px-3 pb-2 flex-wrap">
        {/* Tags */}
        {tags.slice(0,2).map(t => (
          <Badge key={t.id} style={{...}} className="text-[9px] h-4">
            {t.name}
          </Badge>
        ))}
        {/* Pipeline → Stage */}
        {pipelineName && (
          <span className="text-[10px] text-muted-foreground">
            {pipelineName} → {stageName}
          </span>
        )}
      </div>
    )}
  </div>
);
```

## Resultado Visual Esperado

- **Limpo e organizado**: Cada elemento tem seu lugar definido
- **Hierarquia clara**: Nome em destaque, telefone/tags secundários
- **Controles acessíveis**: Voltar à esquerda, ações à direita
- **Compacto**: Otimizado para o espaço limitado do chat flutuante
- **Consistente**: Segue o padrão visual do resto da aplicação

## Arquivo a Modificar
- `src/components/chat/FloatingChat.tsx`
