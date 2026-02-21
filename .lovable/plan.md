
# Ajustes na Pagina de Notificacoes (Mobile)

## Mudancas planejadas no arquivo `src/pages/Notifications.tsx`:

### 1. Filtro alinhado a esquerda
- O botao "Filtros" ja esta a esquerda, mas o botao "Marcar lidas" sera mantido a direita com `justify-between` ou `ml-auto` para melhor distribuicao.

### 2. Card header - reduzir titulo e espaçamento (mobile)
- Trocar "Suas Notificacoes" por um titulo menor no mobile (ex: "Notificacoes" ou remover completamente, ja que o titulo ja aparece no AppHeader).
- Reduzir o `CardTitle` de `text-2xl` para `text-base` no mobile.
- Adicionar padding horizontal ao `CardContent` no mobile (`px-3`) para melhor espaçamento lateral.
- Reduzir o padding do `CardHeader` no mobile.

### 3. Reorganizar o card de notificacao individual (conforme segundo print)
- Layout mais limpo: icone a esquerda, badge "NEW" ao lado do titulo, conteudo abaixo, e na ultima linha o tempo + tipo.
- Reduzir gap entre icone e texto de `gap-4` para `gap-3`.
- Remover o botao de "check" individual no mobile para simplificar.
- Manter o `border-l-4` para nao lidas.

---

## Detalhes tecnicos

**Arquivo**: `src/pages/Notifications.tsx`

**Alteracoes especificas**:

1. **Linha 166** - Adicionar `justify-between` na div de filtros mobile para empurrar "Marcar lidas" para a direita, mantendo "Filtros" na esquerda.

2. **Linhas 275-298** - Card header mobile:
   - Condicional para mobile: titulo menor (`text-base font-semibold` em vez de `text-2xl`), esconder descricao de contagem.
   - Reduzir padding do CardHeader no mobile.

3. **Linhas 299-387** - CardContent mobile:
   - Adicionar `px-3` no mobile para respiro lateral.
   - Nos cards individuais: reduzir padding de `p-4` para `p-3`, gap de `gap-4` para `gap-3`.
   - Icone menor no mobile (`h-8 w-8` em vez de `h-10 w-10`).
