import { Link, useLocation } from "react-router-dom";
import { usePublicProperties } from "@/hooks/use-public-site";
import { MapPin, Bed, Maximize, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect } from "react";
import { usePublicContext } from "./usePublicContext";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function PublicMap() {
  const { organizationId, siteConfig } = usePublicContext();
  const { data, isLoading } = usePublicProperties(organizationId, { limit: 100 });
  const location = useLocation();
  const [mapCenter] = useState<[number, number]>([-23.5505, -46.6333]); // São Paulo default
  const [cssLoaded, setCssLoaded] = useState(false);

  // Load Leaflet CSS dynamically to ensure it's always available
  useEffect(() => {
    const linkId = 'leaflet-css';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.onload = () => setCssLoaded(true);
      document.head.appendChild(link);
    } else {
      setCssLoaded(true);
    }
  }, []);

  // Get primary color from config
  const primaryColor = siteConfig?.primary_color || '#C4A052';
  const secondaryColor = siteConfig?.secondary_color || '#0D0D0D';

  // Custom marker with dynamic color
  const customIcon = useMemo(() => new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${primaryColor}" width="32" height="32">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `),
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  }), [primaryColor]);

  const isPreviewMode = location.pathname.includes('/site/preview') || location.pathname.includes('/site/previsualização');
  const orgParam = new URLSearchParams(location.search).get('org');
  
  const getHref = (path: string) => {
    if (isPreviewMode && orgParam) {
      if (path.includes('?')) {
        return `/site/preview/${path}&org=${orgParam}`;
      }
      return `/site/preview/${path}?org=${orgParam}`;
    }
    return `/${path}`;
  };

  const formatPrice = (value: number | null) => {
    if (!value) return null;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  // For now, we'll use random positions around São Paulo since we don't have geocoded addresses
  // In a real implementation, you would geocode the addresses or use lat/lng from the database
  const getRandomPosition = (index: number): [number, number] => {
    const baseLat = -23.5505;
    const baseLng = -46.6333;
    const offset = 0.05;
    // Use index as seed for consistent positions
    const seedLat = Math.sin(index * 12345) * offset;
    const seedLng = Math.cos(index * 67890) * offset;
    return [baseLat + seedLat, baseLng + seedLng];
  };

  if (!siteConfig) {
    return null;
  }

  // Show loading state while CSS is loading
  if (!cssLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: secondaryColor }}>
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Carregando mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: secondaryColor }}>
      {/* Header with banner */}
      <div 
        className="py-16 md:py-20 relative overflow-hidden"
        style={{
          backgroundImage: siteConfig.page_banner_url 
            ? `url(${siteConfig.page_banner_url})` 
            : undefined,
          backgroundColor: !siteConfig.page_banner_url ? secondaryColor : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white pt-16 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-light">Buscar no Mapa</h1>
        </div>
      </div>

      {/* Back button */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Link to={getHref("imoveis")}>
          <Button variant="ghost" className="text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para imóveis
          </Button>
        </Link>
      </div>

      {/* Map */}
      <div className="max-w-7xl mx-auto px-4 pb-10">
        <div className="h-[600px] rounded-lg overflow-hidden shadow-2xl">
          <MapContainer 
            center={mapCenter} 
            zoom={12} 
            className="h-full w-full"
            style={{ background: '#1a1a1a' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {data?.properties?.map((property, index) => (
              <Marker 
                key={property.id} 
                position={getRandomPosition(index)}
                icon={customIcon}
              >
                <Popup>
                  <div className="w-64">
                    <img 
                      src={property.imagem_principal || '/placeholder.svg'} 
                      alt={property.titulo}
                      className="w-full h-32 object-cover rounded-t"
                    />
                    <div className="p-3">
                      <h3 className="font-semibold text-sm mb-1 line-clamp-1">{property.titulo}</h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                        <MapPin className="w-3 h-3" />
                        {property.bairro}{property.cidade ? `, ${property.cidade}` : ''}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                        {property.quartos && (
                          <span className="flex items-center gap-1">
                            <Bed className="w-3 h-3" /> {property.quartos}
                          </span>
                        )}
                        {property.area_total && (
                          <span className="flex items-center gap-1">
                            <Maximize className="w-3 h-3" /> {property.area_total}m²
                          </span>
                        )}
                      </div>
                      <div 
                        className="font-bold"
                        style={{ color: primaryColor }}
                      >
                        {formatPrice(property.valor_venda || property.valor_aluguel)}
                      </div>
                      <Link to={getHref(`imoveis/${property.codigo}`)}>
                        <Button 
                          size="sm" 
                          className="w-full mt-2 text-white text-xs"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Ver Detalhes
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
