import { Link, useLocation } from "react-router-dom";
import { usePublicProperties } from "@/hooks/use-public-site";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef, useMemo } from "react";
import { usePublicContext } from "./usePublicContext";

export default function PublicMap() {
  const { organizationId, siteConfig } = usePublicContext();
  const { data } = usePublicProperties(organizationId, { limit: 100 });
  const location = useLocation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  const primaryColor = siteConfig?.primary_color || '#C4A052';
  const secondaryColor = siteConfig?.secondary_color || '#0D0D0D';

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

  const getRandomPosition = (index: number): [number, number] => {
    const baseLat = -23.5505;
    const baseLng = -46.6333;
    const offset = 0.05;
    return [baseLat + Math.sin(index * 12345) * offset, baseLng + Math.cos(index * 67890) * offset];
  };

  const formatPrice = (value: number | null) => {
    if (!value) return null;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  // Initialize map using Leaflet API directly (no react-leaflet)
  useEffect(() => {
    if (!siteConfig || !mapContainerRef.current) return;
    
    let mounted = true;
    
    const linkId = 'leaflet-css';
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    
    const initMap = async () => {
      try {
        const L = (await import('leaflet')).default;
        if (!mounted || !mapContainerRef.current) return;

        // Fix default marker icons
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Create map
        const map = L.map(mapContainerRef.current).setView([-23.5505, -46.6333], 12);
        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        setMapReady(true);
        
        // Fix tile rendering issue
        setTimeout(() => {
          map.invalidateSize();
        }, 100);
      } catch (err) {
        console.error('Error loading Leaflet:', err);
        if (mounted) setMapError(true);
      }
    };

    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.onload = () => initMap();
      document.head.appendChild(link);
    } else {
      initMap();
    }

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [siteConfig]);

  // Add markers when properties load
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !data?.properties?.length) return;

    let mounted = true;

    const addMarkers = async () => {
      try {
        const L = (await import('leaflet')).default;
        if (!mounted || !mapInstanceRef.current) return;

        const customIcon = new L.Icon({
          iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${primaryColor}" width="32" height="32">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          `),
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        });

        const properties = data.properties;
        properties.forEach((property: any, index: number) => {
          const [lat, lng] = getRandomPosition(index);
          const marker = L.marker([lat, lng], { icon: customIcon }).addTo(mapInstanceRef.current!);
          
          const price = formatPrice(property.valor_venda || property.valor_aluguel);
          const detailHref = getHref(`imovel/${property.codigo || property.code}`);
          
          marker.bindPopup(`
            <div style="width: 240px;">
              <img 
                src="${property.imagem_principal || '/placeholder.svg'}" 
                alt="${property.titulo}"
                style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px 4px 0 0;"
              />
              <div style="padding: 12px;">
                <h3 style="font-weight: 600; font-size: 14px; margin: 0 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${property.titulo}</h3>
                <p style="font-size: 12px; color: #666; margin: 0 0 8px;">
                  📍 ${property.bairro || ''}${property.cidade ? `, ${property.cidade}` : ''}
                </p>
                <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
                  ${property.quartos ? `🛏️ ${property.quartos} ` : ''}
                  ${property.area_total ? `📐 ${property.area_total}m²` : ''}
                </div>
                ${price ? `<div style="font-weight: 700; color: ${primaryColor}; margin-bottom: 8px;">${price}</div>` : ''}
                <a href="${detailHref}" style="display: block; text-align: center; background: ${primaryColor}; color: white; padding: 8px; border-radius: 4px; text-decoration: none; font-size: 12px;">
                  Ver Detalhes
                </a>
              </div>
            </div>
          `);
        });
      } catch (err) {
        console.error('Error adding markers:', err);
      }
    };

    addMarkers();

    return () => { mounted = false; };
  }, [mapReady, data?.properties, primaryColor]);

  if (!siteConfig) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: secondaryColor }}>
      <div 
        className="py-16 md:py-20 relative overflow-hidden"
        style={{
          backgroundImage: siteConfig.page_banner_url ? `url(${siteConfig.page_banner_url})` : undefined,
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

      <div className="max-w-7xl mx-auto px-4 py-4">
        <Link to={getHref("imoveis")}>
          <Button variant="ghost" className="text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para imóveis
          </Button>
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-10">
        <div className="h-[600px] rounded-lg overflow-hidden shadow-2xl bg-gray-800">
          {mapError ? (
            <div className="h-full w-full flex items-center justify-center">
              <p className="text-white">Erro ao carregar o mapa. Tente recarregar a página.</p>
            </div>
          ) : !mapReady ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Carregando mapa...</p>
              </div>
            </div>
          ) : null}
          <div 
            ref={mapContainerRef} 
            className="h-full w-full" 
            style={{ display: mapReady && !mapError ? 'block' : 'none' }}
          />
        </div>
      </div>
    </div>
  );
}
