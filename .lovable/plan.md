
# Plano: Exibir Mapa Interativo Baseado no Endereço

## Situação Atual

O componente `PropertyLocation.tsx` **já tem mapa implementado** com Leaflet, mas ele só aparece quando o imóvel tem latitude/longitude cadastradas. O problema é que **nenhum imóvel tem coordenadas** no banco de dados, e o formulário de cadastro nem tem esses campos.

## Solução Proposta

Vou modificar o componente para **sempre mostrar o mapa**, usando geocodificação automática baseada no endereço (gratuita via Nominatim/OpenStreetMap).

---

## Como Vai Funcionar

1. Se o imóvel tem latitude/longitude → usa essas coordenadas (atual)
2. Se não tem coordenadas mas tem endereço → geocodifica automaticamente e mostra o mapa
3. Fallback: centra no bairro/cidade se o endereço exato não for encontrado

---

## Mudanças Técnicas

**Arquivo:** `src/components/public/property-detail/PropertyLocation.tsx`

### 1. Adicionar Geocodificação Automática

```typescript
// Função para geocodificar endereço via Nominatim (gratuito)
const geocodeAddress = async (address: string): Promise<{lat: number, lon: number} | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
};
```

### 2. Lógica de Fallback

```typescript
useEffect(() => {
  const loadCoordinates = async () => {
    // Prioridade 1: Coordenadas existentes
    if (hasCoordinates) {
      setMapCoords({ lat: latitude!, lon: longitude! });
      return;
    }

    // Prioridade 2: Geocodificar endereço completo
    if (fullAddress) {
      const coords = await geocodeAddress(fullAddress);
      if (coords) {
        setMapCoords(coords);
        return;
      }
    }

    // Prioridade 3: Geocodificar bairro + cidade
    if (bairro && cidade) {
      const coords = await geocodeAddress(`${bairro}, ${cidade}, ${uf}, Brasil`);
      if (coords) {
        setMapCoords(coords);
        return;
      }
    }

    // Prioridade 4: Geocodificar só cidade
    if (cidade && uf) {
      const coords = await geocodeAddress(`${cidade}, ${uf}, Brasil`);
      if (coords) {
        setMapCoords(coords);
      }
    }
  };

  loadCoordinates();
}, [latitude, longitude, fullAddress, bairro, cidade, uf]);
```

---

## Visual Final

O resultado será exatamente como a imagem de referência:
- Mapa ocupando boa parte da seção
- Pin/marcador na localização
- Endereço formatado abaixo do mapa
- Estilo limpo com bordas arredondadas

---

## Vantagens

| Aspecto | Benefício |
|---------|-----------|
| **Sem custo** | Nominatim/OpenStreetMap é 100% gratuito |
| **Automático** | Não precisa preencher latitude/longitude |
| **Fallback inteligente** | Sempre mostra algo (endereço → bairro → cidade) |
| **Já configurado** | Leaflet já está instalado no projeto |

---

## Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `PropertyLocation.tsx` | Adicionar geocodificação automática e lógica de fallback |
