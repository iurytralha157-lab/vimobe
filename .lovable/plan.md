

# URGENTE: Remover Dados Pessoais Reais do Repositorio (LGPD)

## Problema Critico

O arquivo `temp/customers-cristiano.csv` contem **2.352+ registros de clientes reais** com dados pessoais sensiveis (nomes, enderecos, historico financeiro). Isso esta commitado no repositorio e acessivel publicamente.

**Dados expostos:**
- Nomes completos
- Enderecos residenciais completos (rua, bairro, cidade, UF)
- Vendedor responsavel
- Planos contratados com valores
- Historico de cobranca (pago, vencido, renegociado)
- Status do cliente

## Acao Imediata

### 1. Deletar o arquivo do projeto

Remover o arquivo `temp/customers-cristiano.csv` do repositorio imediatamente.

### 2. Adicionar ao .gitignore

Adicionar as seguintes entradas ao `.gitignore` para prevenir que arquivos de dados sejam commitados novamente:

```
temp/
*.csv
```

### 3. Remover a pagina de importacao relacionada

O arquivo `src/pages/admin/ImportCristiano.tsx` foi criado especificamente para importar esse CSV. Com o arquivo removido, essa pagina perde o proposito e deve ser avaliada -- se nao for mais necessaria, pode ser removida tambem.

## Limitacao Importante

**Mesmo deletando o arquivo agora, ele permanece no historico do Git.** Para remocao completa, sera necessario:

1. Acessar o repositorio no GitHub
2. Usar `git filter-branch` ou `BFG Repo Cleaner` para purgar o arquivo do historico
3. Forcar o push (`git push --force`)

Isso esta fora do escopo do Lovable e precisa ser feito diretamente no GitHub/terminal. Recomendo fortemente fazer isso o mais rapido possivel.

## Detalhes Tecnicos

- Arquivo a deletar: `temp/customers-cristiano.csv`
- Editar: `.gitignore` (adicionar `temp/` e `*.csv`)
- Avaliar remocao: `src/pages/admin/ImportCristiano.tsx` e sua rota no `App.tsx`

