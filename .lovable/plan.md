
# Plano: Mapa com Precisão Melhorada e Pontos de Interesse

## Problemas Identificados

1. **Geocoding impreciso**: O Nominatim nem sempre encontra endereços brasileiros com exatidão (ex: "Rua Menino Jesus de Praga, 420" marca no meio da rua)
2. **Falta de contexto**: O mapa não mostra o que tem na redondeza (supermercados, hospitais, etc.)

---

## Solução Proposta

### Parte 1: Melhorar Precisão do Geocoding

**Problema técnico**: O Nominatim às vezes ignora o número da casa em endereços brasileiros.

**Solução**: Usar busca estruturada do Nominatim que separa rua, número, cidade:

```
/search?street=420 Rua Menino Jesus de Praga&city=Cidade&country=Brasil&format=json
```

Isso dá resultados mais precisos que juntar tudo numa string.

**Fallback adicional**: Se não encontrar com número, tenta sem número + marca como "rua" (área ao invés de pin).

---

### Parte 2: Mostrar Pontos de Interesse (POI)

Vou usar a **Overpass API** (gratuita, do OpenStreetMap) para buscar estabelecimentos próximos e mostrar com ícones grandes no mapa.

**POIs que serão exibidos**:

| Categoria | Ícone | Cor |
|-----------|-------|-----|
| Supermercado | Carrinho | Verde |
| Hospital/Clínica | Cruz/Coração | Vermelho |
| Escola | Livro | Azul |
| Farmácia | Medicamento | Verde claro |
| Banco | Cifrão | Amarelo |
| Restaurante | Garfo/Faca | Laranja |

**Exemplo de busca Overpass**:
```
[out:json][timeout:10];
(
  node["amenity"="supermarket"](around:1000, -23.55, -46.63);
  node["amenity"="hospital"](around:1000, -23.55, -46.63);
  node["amenity"="school"](around:1000, -23.55, -46.63);
);
out body;
```

---

## Mudanças Técnicas

**Arquivo:** `src/components/public/property-detail/PropertyLocation.tsx`

### 1. Geocoding Estruturado (mais preciso)

```typescript
// Busca estruturada - separa os campos
const geocodeStructured = async (
  street: string,
  number: string,
  city: string,
  state: string
): Promise<LocationResult | null> => {
  const params = new URLSearchParams({
    street: `${number} ${street}`,
    city: city,
    state: state,
    country: 'Brasil',
    format: 'json',
    limit: '1'
  });
  
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    { headers: { 'User-Agent': 'PropertySite/1.0' } }
  );
  // ...
};
```

### 2. Buscar POIs com Overpass API

```typescript
interface POI {
  lat: number;
  lon: number;
  type: 'supermarket' | 'hospital' | 'school' | 'pharmacy' | 'bank' | 'restaurant';
  name?: string;
}

const fetchNearbyPOIs = async (lat: number, lon: number, radius: number = 1000): Promise<POI[]> => {
  const query = `
    [out:json][timeout:10];
    (
      node["shop"="supermarket"](around:${radius},${lat},${lon});
      node["amenity"="hospital"](around:${radius},${lat},${lon});
      node["amenity"="clinic"](around:${radius},${lat},${lon});
      node["amenity"="school"](around:${radius},${lat},${lon});
      node["amenity"="pharmacy"](around:${radius},${lat},${lon});
      node["amenity"="bank"](around:${radius},${lat},${lon});
    );
    out body;
  `;
  
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query
  });
  
  const data = await response.json();
  return data.elements.map(el => ({
    lat: el.lat,
    lon: el.lon,
    type: mapAmenityType(el.tags),
    name: el.tags?.name
  }));
};
```

### 3. Ícones Personalizados Grandes

```typescript
// Criar ícones customizados para cada tipo de POI
const createPOIIcon = (L: any, type: string): any => {
  const iconConfig = {
    supermarket: { emoji: '🛒', color: '#22c55e' },
    hospital: { emoji: '🏥', color: '#ef4444' },
    school: { emoji: '🎓', color: '#3b82f6' },
    pharmacy: { emoji: '💊', color: '#10b981' },
    bank: { emoji: '🏦', color: '#eab308' },
  };
  
  const config = iconConfig[type] || { emoji: '📍', color: '#6b7280' };
  
  return L.divIcon({
    html: `<div style="
      font-size: 24px;
      background: ${config.color};
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">${config.emoji}</div>`,
    className: 'poi-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};
```

### 4. Renderizar POIs no Mapa

```typescript
// No componente LeafletMapWithMarker, adicionar POIs
{pois.map((poi, index) => (
  <Marker 
    key={index}
    position={[poi.lat, poi.lon]}
    icon={createPOIIcon(L, poi.type)}
  >
    <Popup>
      <strong>{poi.name || getPoiLabel(poi.type)}</strong>
    </Popup>
  </Marker>
))}
```

---

## Resultado Visual

- **Pin azul grande** no centro = Localização do imóvel
- **Ícones coloridos ao redor** = Pontos de interesse:
  - 🛒 Supermercados (verde, 40px)
  - 🏥 Hospitais (vermelho, 40px)
  - 🎓 Escolas (azul, 40px)
  - 💊 Farmácias (verde claro, 40px)
  - 🏦 Bancos (amarelo, 40px)

---

## Vantagens

| Aspecto | Benefício |
|---------|-----------|
| **Geocoding estruturado** | Mais preciso para endereços brasileiros |
| **Overpass API** | 100% gratuita, sem limite de uso |
| **Ícones grandes** | Visíveis sem precisar dar zoom |
| **Contexto da região** | Cliente vê o que tem por perto |

---

## Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `PropertyLocation.tsx` | Geocoding estruturado + busca e exibição de POIs com ícones personalizados |
