import React, { useEffect, useState, useMemo, Component, ErrorInfo, ReactNode } from 'react';
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

interface LeafletModules {
  MapContainer: any;
  TileLayer: any;
  Marker: any;
  Popup: any;
}

// Error Boundary to catch map errors
interface ErrorBoundaryState {
  hasError: boolean;
}

class MapErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Map Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
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

// Separate map component to avoid closure issues
function LeafletMap({ 
  coords, 
  title, 
  modules 
}: { 
  coords: Coordinates; 
  title: string; 
  modules: LeafletModules;
}) {
  const { MapContainer, TileLayer, Marker, Popup } = modules;
  
  // Wrap in try-catch for safety
  try {
    return (
      <MapContainer
        center={[coords.lat, coords.lon]}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        className="rounded-xl"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[coords.lat, coords.lon]}>
          <Popup>{title}</Popup>
        </Marker>
      </MapContainer>
    );
  } catch (error) {
    console.error('Error rendering map:', error);
    return null;
  }
}

// Static map fallback using OpenStreetMap static image
function StaticMapFallback({ coords, primaryColor }: { coords: Coordinates; primaryColor: string }) {
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lon - 0.01},${coords.lat - 0.01},${coords.lon + 0.01},${coords.lat + 0.01}&layer=mapnik&marker=${coords.lat},${coords.lon}`;
  
  return (
    <iframe
      src={mapUrl}
      style={{ width: '100%', height: '100%', border: 0 }}
      loading="lazy"
      title="Localização do imóvel"
    />
  );
}

// Placeholder when no map available
function MapPlaceholder({ primaryColor }: { primaryColor: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
      <div className="text-center">
        <MapPin className="w-12 h-12 mx-auto mb-2" />
        <p className="text-sm">Mapa não disponível</p>
      </div>
    </div>
  );
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
  const [leafletModules, setLeafletModules] = useState<LeafletModules | null>(null);
  const [leafletError, setLeafletError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mapCoords, setMapCoords] = useState<Coordinates | null>(null);
  const [geocodeAttempted, setGeocodeAttempted] = useState(false);

  // Build full address string
  const fullAddress = useMemo(() => {
    const addressParts = [
      endereco,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      cep,
    ].filter(Boolean);
    return addressParts.join(', ');
  }, [endereco, numero, complemento, bairro, cidade, uf, cep]);

  const hasExistingCoordinates = latitude !== null && longitude !== null && latitude !== undefined && longitude !== undefined;

  // Geocode address if no coordinates exist
  useEffect(() => {
    let isMounted = true;
    
    const loadCoordinates = async () => {
      try {
        // Priority 1: Use existing coordinates
        if (hasExistingCoordinates) {
          if (isMounted) {
            setMapCoords({ lat: latitude!, lon: longitude! });
            setGeocodeAttempted(true);
          }
          return;
        }

        // Priority 2: Geocode full address
        if (endereco && cidade) {
          const searchAddress = [endereco, numero, bairro, cidade, uf, 'Brasil'].filter(Boolean).join(', ');
          const coords = await geocodeAddress(searchAddress);
          if (coords && isMounted) {
            setMapCoords(coords);
            setGeocodeAttempted(true);
            return;
          }
        }

        // Priority 3: Geocode neighborhood + city
        if (bairro && cidade) {
          const coords = await geocodeAddress(`${bairro}, ${cidade}, ${uf || ''}, Brasil`);
          if (coords && isMounted) {
            setMapCoords(coords);
            setGeocodeAttempted(true);
            return;
          }
        }

        // Priority 4: Geocode just city
        if (cidade && uf) {
          const coords = await geocodeAddress(`${cidade}, ${uf}, Brasil`);
          if (coords && isMounted) {
            setMapCoords(coords);
          }
        }
      } catch (error) {
        console.error('Error geocoding:', error);
      }
      
      if (isMounted) {
        setGeocodeAttempted(true);
        setIsLoading(false);
      }
    };

    loadCoordinates();
    
    return () => {
      isMounted = false;
    };
  }, [latitude, longitude, endereco, numero, bairro, cidade, uf, hasExistingCoordinates]);

  // Load Leaflet modules once
  useEffect(() => {
    let isMounted = true;

    const loadLeaflet = async () => {
      try {
        // Inject Leaflet CSS
        const existingLink = document.querySelector('link[href*="leaflet"]');
        if (!existingLink) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        const L = await import('leaflet');
        const reactLeaflet = await import('react-leaflet');

        // Fix default marker icon
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        if (isMounted) {
          setLeafletModules({
            MapContainer: reactLeaflet.MapContainer,
            TileLayer: reactLeaflet.TileLayer,
            Marker: reactLeaflet.Marker,
            Popup: reactLeaflet.Popup,
          });
        }
      } catch (error) {
        console.error('Error loading Leaflet:', error);
        if (isMounted) {
          setLeafletError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadLeaflet();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Don't render section if no address at all
  if (!fullAddress && !mapCoords && geocodeAttempted) {
    return null;
  }

  const canShowLeafletMap = mapCoords && leafletModules && !leafletError;
  const canShowFallbackMap = mapCoords && (leafletError || !leafletModules);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <MapPin className="w-5 h-5" style={{ color: primaryColor }} />
        Localização
      </h2>

      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
        {/* Map */}
        <div className="h-[300px] md:h-[400px] w-full bg-gray-100">
          {isLoading && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: primaryColor }} />
            </div>
          )}
          
          {!isLoading && canShowLeafletMap && (
            <MapErrorBoundary fallback={<StaticMapFallback coords={mapCoords} primaryColor={primaryColor} />}>
              <LeafletMap 
                coords={mapCoords} 
                title={title} 
                modules={leafletModules} 
              />
            </MapErrorBoundary>
          )}
          
          {!isLoading && canShowFallbackMap && (
            <StaticMapFallback coords={mapCoords} primaryColor={primaryColor} />
          )}
          
          {!isLoading && !mapCoords && geocodeAttempted && (
            <MapPlaceholder primaryColor={primaryColor} />
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
