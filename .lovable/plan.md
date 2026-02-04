

# Plano: Atualizar Ícones do App com o Símbolo Vimob

## Imagem Recebida

Recebi o símbolo perfeito - o quadrado laranja com a seta branca, exatamente o que precisamos para as notificações push aparecerem no tamanho correto.

## O Problema Atual

Os ícones atuais em `public/icons/` contêm o logo horizontal completo (Vimob + texto), fazendo o símbolo parecer muito pequeno nas notificações push do celular.

## Solução

Substituir todos os ícones PWA pela imagem do símbolo que você enviou.

### Arquivos a Atualizar

| Arquivo | Tamanho | Uso |
|---------|---------|-----|
| `public/icons/icon-72x72.png` | 72x72 | Ícones pequenos |
| `public/icons/icon-96x96.png` | 96x96 | Ícones pequenos |
| `public/icons/icon-128x128.png` | 128x128 | Ícones médios |
| `public/icons/icon-144x144.png` | 144x144 | Android |
| `public/icons/icon-152x152.png` | 152x152 | iOS |
| `public/icons/icon-192x192.png` | 192x192 | PWA padrão |
| `public/icons/icon-384x384.png` | 384x384 | PWA grande |
| `public/icons/icon-512x512.png` | 512x512 | PWA splash |
| `public/icons/apple-touch-icon.png` | 180x180 | iOS home screen |

### Ação

1. Copiar o símbolo enviado (`user-uploads://Favicon.png.png`) para substituir os ícones existentes
2. A imagem será usada para todos os tamanhos de ícone

**Nota:** Como o Lovable não redimensiona imagens automaticamente, vou usar a mesma imagem para todos os tamanhos. O sistema operacional fará o redimensionamento conforme necessário. Para melhor qualidade, a imagem original será usada (ela já tem boa resolução).

## Resultado Esperado

- Notificações push mostrarão o símbolo laranja ocupando todo o espaço
- Ícone do app na home screen do celular ficará grande e visível
- PWA terá visual consistente em todos os dispositivos

