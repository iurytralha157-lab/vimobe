

# Plano: Delimitar Área no Mapa Baseado na Precisão do Endereço

## O Que Vai Mudar

O mapa vai mostrar diferentes visualizações de acordo com a precisão do endereço:

| Dados Disponíveis | Visualização no Mapa |
|-------------------|---------------------|
| Endereço + Número | Pin exato (como está hoje) |
| Só a Rua (sem número) | Linha marcando a rua inteira |
| Só Bairro | Área do bairro delimitada |
| Só Cidade | Área da cidade delimitada |

---

## Como Funciona Tecnicamente

A API do Nominatim retorna um **boundingbox** para cada resultado, que define os limites da área. Vou usar isso para:

1. **Endereço completo com número** → Pin/marcador no ponto exato (zoom 17)
2. **Rua sem número** → Retângulo/polígono marcando a extensão da rua (zoom 16)
3. **Bairro** → Retângulo destacando a área do bairro (zoom 14)
4. **Cidade** → Retângulo mostrando os limites da cidade (zoom 12)

---

## Mudanças no Código

**Arquivo:** `src/components/public/property-detail/PropertyLocation.tsx`

### 1. Novo Tipo para Área

```typescript
interface LocationResult {
  lat: number;
  lon: number;
  boundingBox?: [number, number, number, number]; // [sul, norte, oeste, leste]
  precision: 'exact' | 'street' | 'neighborhood' | 'city';
}
```

### 2. Função de Geocodificação Atualizada

A função vai retornar também o boundingbox e o nível de precisão:

```typescript
const geocodeWithBounds = async (address: string, precision: string): Promise<LocationResult | null> => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
  );
  const data = await response.json();
  if (data && data.length > 0) {
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      boundingBox: data[0].boundingbox?.map(Number),
      precision: precision
    };
  }
  return null;
};
```

### 3. Lógica de Fallback com Precisão

```typescript
// Prioridade 1: Endereço completo com número → pin exato
if (endereco && numero && cidade) {
  result = await geocode(fullAddress, 'exact');
}

// Prioridade 2: Só a rua (sem número) → delimitar rua
else if (endereco && cidade && !numero) {
  result = await geocode(`${endereco}, ${cidade}, ${uf}`, 'street');
}

// Prioridade 3: Só bairro → delimitar bairro
else if (bairro && cidade) {
  result = await geocode(`${bairro}, ${cidade}, ${uf}`, 'neighborhood');
}

// Prioridade 4: Só cidade → delimitar cidade
else if (cidade && uf) {
  result = await geocode(`${cidade}, ${uf}`, 'city');
}
```

### 4. Componente de Mapa com Área Delimitada

Vou adicionar o componente `Rectangle` do Leaflet para desenhar as áreas:

```typescript
// Importar Rectangle junto com os outros componentes
const { MapContainer, TileLayer, Marker, Popup, Rectangle } = modules;

// No mapa:
{precision === 'exact' ? (
  <Marker position={[lat, lon]}><Popup>{title}</Popup></Marker>
) : (
  <Rectangle 
    bounds={[[sul, oeste], [norte, leste]]}
    pathOptions={{ 
      color: primaryColor, 
      fillColor: primaryColor, 
      fillOpacity: 0.2 
    }}
  />
)}
```

### 5. Zoom Dinâmico por Precisão

```typescript
const getZoomLevel = (precision: string) => {
  switch (precision) {
    case 'exact': return 17;
    case 'street': return 16;
    case 'neighborhood': return 14;
    case 'city': return 12;
    default: return 15;
  }
};
```

---

## Resultado Visual

- **Pin azul** → Localização exata conhecida
- **Retângulo colorido semi-transparente** → Área aproximada (rua/bairro/cidade)
- Zoom ajustado automaticamente para mostrar toda a área

---

## Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `PropertyLocation.tsx` | Adicionar suporte a bounding box, Rectangle component, e lógica de precisão |

