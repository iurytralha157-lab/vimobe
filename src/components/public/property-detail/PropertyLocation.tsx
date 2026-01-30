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

interface Coordinates {
  lat: number;
  lon: number;
}

// Geocode address using Nominatim (free OpenStreetMap service)
const geocodeAddress = async (address: string): Promise<Coordinates | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'User-Agent': 'PropertySite/1.0'
        }
      }
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
  const [mapCoords, setMapCoords] = useState<Coordinates | null>(null);

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
  const hasExistingCoordinates = latitude !== null && longitude !== null && latitude !== undefined && longitude !== undefined;

  // Geocode address if no coordinates exist
  useEffect(() => {
    const loadCoordinates = async () => {
      // Priority 1: Use existing coordinates
      if (hasExistingCoordinates) {
        setMapCoords({ lat: latitude!, lon: longitude! });
        return;
      }

      // Priority 2: Geocode full address
      if (endereco && cidade) {
        const searchAddress = [endereco, numero, bairro, cidade, uf, 'Brasil'].filter(Boolean).join(', ');
        const coords = await geocodeAddress(searchAddress);
        if (coords) {
          setMapCoords(coords);
          return;
        }
      }

      // Priority 3: Geocode neighborhood + city
      if (bairro && cidade) {
        const coords = await geocodeAddress(`${bairro}, ${cidade}, ${uf || ''}, Brasil`);
        if (coords) {
          setMapCoords(coords);
          return;
        }
      }

      // Priority 4: Geocode just city
      if (cidade && uf) {
        const coords = await geocodeAddress(`${cidade}, ${uf}, Brasil`);
        if (coords) {
          setMapCoords(coords);
        }
      }
    };

    loadCoordinates();
  }, [latitude, longitude, endereco, numero, bairro, cidade, uf, hasExistingCoordinates]);

  // Dynamically load Leaflet when we have coordinates
  useEffect(() => {
    if (!mapCoords) {
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

        // Create the map component with current coordinates
        const DynamicMap = () => (
          <MapContainer
            center={[mapCoords.lat, mapCoords.lon]}
            zoom={15}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
            className="rounded-xl"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[mapCoords.lat, mapCoords.lon]}>
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
  }, [mapCoords, title]);

  // Don't render if no address at all
  if (!fullAddress && !mapCoords) {
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
        <div className="h-[300px] md:h-[400px] w-full bg-gray-100">
          {isLoading || !mapCoords ? (
            <div className="w-full h-full flex items-center justify-center">
              {mapCoords === null && !isLoading ? (
                <div className="text-center text-gray-400">
                  <MapPin className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm">Localização aproximada</p>
                </div>
              ) : (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: primaryColor }} />
              )}
            </div>
          ) : MapComponent ? (
            <MapComponent />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <MapPin className="w-12 h-12" />
            </div>
          )}
        </div>

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
