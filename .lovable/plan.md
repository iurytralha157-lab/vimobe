
# Duplicar Imovel CA0001 como Mostruario

## O que sera feito
Criar **12 copias** do imovel CA0001 (Casa alto padrao) da organizacao Vetter Coponto, com codigos CA0002 ate CA0013. Cada copia tera pequenas variacoes para parecer um catalogo real:

| Codigo | Titulo | Quartos | Suites | Banheiros | Area | Preco | Bairro |
|--------|--------|---------|--------|-----------|------|-------|--------|
| CA0002 | Casa moderna de 3 suites em Valparaiso | 3 | 3 | 4 | 250m | R$ 1.850.000 | Jardins |
| CA0003 | Sobrado de luxo com piscina em Rio das Ostras | 5 | 5 | 6 | 350m | R$ 2.800.000 | Village |
| CA0004 | Casa em condominio fechado 4 quartos | 4 | 3 | 4 | 280m | R$ 1.950.000 | Centro |
| CA0005 | Residencia premium com area gourmet | 4 | 4 | 5 | 320m | R$ 2.450.000 | Recreio |
| CA0006 | Casa terrea moderna 3 suites | 3 | 3 | 3 | 220m | R$ 1.650.000 | Extensao do Bosque |
| CA0007 | Mansao contemporanea 5 quartos | 5 | 4 | 6 | 400m | R$ 3.200.000 | Village |
| CA0008 | Casa duplex 4 suites com vista | 4 | 4 | 5 | 290m | R$ 2.100.000 | Jardim Marilea |
| CA0009 | Casa planejada 3 quartos em condominio | 3 | 2 | 3 | 200m | R$ 1.450.000 | Parque das Flores |
| CA0010 | Residencia de alto padrao 4 suites | 4 | 4 | 5 | 310m | R$ 2.350.000 | Centro |
| CA0011 | Casa com piscina e churrasqueira 5 quartos | 5 | 3 | 5 | 360m | R$ 2.650.000 | Village |
| CA0012 | Casa moderna minimalista 3 suites | 3 | 3 | 4 | 240m | R$ 1.750.000 | Recreio |
| CA0013 | Casa ampla com jardim 4 quartos | 4 | 3 | 4 | 275m | R$ 1.900.000 | Extensao do Bosque |

## Detalhes
- Todos usarao as **mesmas fotos** do CA0001 (imagem principal + galeria)
- Tipo: Casa / Venda
- Cidade: Rio das Ostras / UF: RJ
- Status: ativo
- Descricao similar adaptada
- Sequencia `property_sequences` sera atualizada para `last_number = 13`

## Tecnico
- 12 INSERTs na tabela `properties` via ferramenta de dados
- 1 UPDATE na tabela `property_sequences` para refletir o ultimo codigo gerado
