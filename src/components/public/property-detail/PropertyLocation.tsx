import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';

interface PropertyLocationProps {
  latitude?: number | null;
  longitude?: number | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  title: string;
  primaryColor?: string;
}

export default function PropertyLocation({
  latitude,
  longitude,
  endereco,
  numero,
  complemento,
  bairro,
  cidade,
  uf,
  cep,
  title,
  primaryColor = '#F97316',
}: PropertyLocationProps) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Build full address string
  const addressParts = [
    endereco,
    numero,
    complemento,
    bairro,
    cidade,
    uf,
    cep,
  ].filter(Boolean);
  
  const fullAddress = addressParts.join(', ');
  const hasCoordinates = latitude !== null && longitude !== null && latitude !== undefined && longitude !== undefined;

  // Dynamically load Leaflet
  useEffect(() => {
    if (!hasCoordinates) {
      setIsLoading(false);
      return;
    }

    // Inject Leaflet CSS
    const existingLink = document.querySelector('link[href*="leaflet"]');
    if (!existingLink) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Dynamically import react-leaflet
    const loadMap = async () => {
      try {
        const L = await import('leaflet');
        const { MapContainer, TileLayer, Marker, Popup } = await import('react-leaflet');

        // Fix default marker icon
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        // Create the map component
        const DynamicMap = () => (
          <MapContainer
            center={[latitude!, longitude!]}
            zoom={15}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
            className="rounded-xl"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[latitude!, longitude!]}>
              <Popup>{title}</Popup>
            </Marker>
          </MapContainer>
        );

        setMapComponent(() => DynamicMap);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading map:', error);
        setIsLoading(false);
      }
    };

    loadMap();
  }, [hasCoordinates, latitude, longitude, title]);

  if (!fullAddress && !hasCoordinates) {
    return null;
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <MapPin className="w-5 h-5" style={{ color: primaryColor }} />
        Localização
      </h2>

      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
        {/* Map */}
        {hasCoordinates && (
          <div className="h-[300px] md:h-[400px] w-full bg-gray-100">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: primaryColor }} />
              </div>
            ) : MapComponent ? (
              <MapComponent />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <MapPin className="w-12 h-12" />
              </div>
            )}
          </div>
        )}

        {/* Address */}
        {fullAddress && (
          <div className="p-6">
            <div className="flex items-start gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <MapPin className="w-5 h-5" style={{ color: primaryColor }} />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Endereço</p>
                <p className="text-gray-900 font-medium">{fullAddress}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
