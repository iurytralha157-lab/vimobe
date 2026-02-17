
# Corrigir Formulario de Edicao do Lead no Mobile

## Problema

No mobile, quando o usuario clica em "Editar" na aba Contato do lead, o formulario abre dentro do Drawer (bottom sheet de 95vh). Com muitos campos (nome, telefone, email, cargo, empresa, endereco completo, renda, profissao, etc.), o formulario fica muito longo. Quando o teclado virtual abre:

- O viewport diminui (de ~545px para ~437px)
- Os campos ficam escondidos atras do teclado
- O botao "Salvar" fica inacessivel
- O usuario nao consegue rolar ate o final
- A sensacao e que o formulario "trava" ou "buga"

## Solucao

Transformar o formulario de edicao mobile em secoes colapsaveis (accordion) com botao de salvar fixo no rodape, e melhorar o comportamento do scroll quando o teclado virtual esta aberto.

## Mudancas

### 1. Botao Salvar/Cancelar fixo no rodape (sticky)

Quando `isEditingContact === true` no mobile, renderizar os botoes de acao fixos no rodape do drawer, fora da area de scroll. Assim o usuario sempre ve os botoes, mesmo com o teclado aberto.

```
+---------------------------+
| Header do Lead            |
| Tabs                      |
+---------------------------+
| [scroll area]             |
|   Informacoes Pessoais    |
|   Endereco                |
|   Perfil Financeiro       |
|                           |
+---------------------------+
| [Cancelar]    [Salvar]    |  <-- sticky footer
+---------------------------+
```

### 2. Agrupar campos em secoes colapsaveis

Dividir os ~15 campos em 3 grupos usando Collapsible/Accordion:
- **Informacoes Pessoais** (nome, telefone, email, cargo, empresa) - aberto por padrao
- **Endereco** (endereco, numero, complemento, bairro, cidade, UF, CEP) - fechado por padrao
- **Perfil do Comprador** (renda, profissao, faixa de imovel, finalidade, financiamento) - fechado por padrao

Isso reduz o scroll inicial e permite ao usuario focar em uma secao por vez.

### 3. Scroll automatico para input focado

Adicionar logica de `scrollIntoView` quando um input recebe foco no mobile, garantindo que o campo ativo fique visivel acima do teclado virtual.

### 4. Prevenir fechamento acidental do Drawer

Quando o formulario esta em modo de edicao (`isEditingContact === true`), desabilitar o gesto de arrastar para fechar o Drawer (`dismissible={false}`), evitando que o usuario perca dados ao arrastar sem querer.

## Detalhes Tecnicos

### Arquivo modificado
- `src/components/leads/LeadDetailDialog.tsx`

### Secao afetada
- Bloco `MobileContent` (linhas ~586-1200), especificamente o trecho do `activeTab === 'contact'` (linhas ~854-1200)

### Implementacao

1. **Sticky footer**: Mover os botoes Cancelar/Salvar para fora do `overflow-y-auto` div, renderizando condicionalmente quando `isEditingContact && activeTab === 'contact'`

2. **Accordion de secoes**: Usar o componente `Collapsible` ja importavel do projeto para agrupar os campos. Apenas "Informacoes Pessoais" comeca aberto.

3. **scrollIntoView**: Adicionar `onFocus` handler nos inputs mobile que chama `e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })` com um pequeno delay (300ms) para aguardar o teclado abrir.

4. **Drawer dismissible**: No bloco `<Drawer>` do mobile (linha 2317), passar `dismissible={!isEditingContact}` para travar o drawer quando esta editando.

### Nao sera alterado
- Layout desktop (Dialog) permanece inalterado
- Logica de salvamento (`handleSaveContact`) permanece igual
- Campos do formulario permanecem os mesmos
