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

type PrecisionLevel = 'exact' | 'street' | 'neighborhood' | 'city';

interface LocationResult {
  lat: number;
  lon: number;
  boundingBox?: [number, number, number, number]; // [south, north, west, east]
  precision: PrecisionLevel;
}

interface LeafletModules {
  MapContainer: any;
  TileLayer: any;
  Marker: any;
  Popup: any;
  Rectangle: any;
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

// Get zoom level based on precision
const getZoomLevel = (precision: PrecisionLevel): number => {
  switch (precision) {
    case 'exact': return 17;
    case 'street': return 16;
    case 'neighborhood': return 14;
    case 'city': return 12;
    default: return 15;
  }
};

// Get precision label for display
const getPrecisionLabel = (precision: PrecisionLevel): string => {
  switch (precision) {
    case 'exact': return 'Localização exata';
    case 'street': return 'Localização aproximada (rua)';
    case 'neighborhood': return 'Localização aproximada (bairro)';
    case 'city': return 'Localização aproximada (cidade)';
    default: return 'Localização';
  }
};

// Geocode address using Nominatim with bounding box
const geocodeWithBounds = async (
  address: string, 
  precision: PrecisionLevel
): Promise<LocationResult | null> => {
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
      const result = data[0];
      return { 
        lat: parseFloat(result.lat), 
        lon: parseFloat(result.lon),
        boundingBox: result.boundingbox ? result.boundingbox.map(Number) as [number, number, number, number] : undefined,
        precision
      };
    }
    return null;
  } catch {
    return null;
  }
};

// Separate map component for exact location (pin)
function LeafletMapWithMarker({ 
  location, 
  title, 
  modules 
}: { 
  location: LocationResult; 
  title: string; 
  modules: LeafletModules;
}) {
  const { MapContainer, TileLayer, Marker, Popup } = modules;
  
  try {
    return (
      <MapContainer
        center={[location.lat, location.lon]}
        zoom={getZoomLevel(location.precision)}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        className="rounded-xl"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[location.lat, location.lon]}>
          <Popup>{title}</Popup>
        </Marker>
      </MapContainer>
    );
  } catch (error) {
    console.error('Error rendering map with marker:', error);
    return null;
  }
}

// Separate map component for area (rectangle)
function LeafletMapWithArea({ 
  location, 
  title,
  primaryColor,
  modules 
}: { 
  location: LocationResult; 
  title: string;
  primaryColor: string;
  modules: LeafletModules;
}) {
  const { MapContainer, TileLayer, Rectangle, Popup } = modules;
  
  if (!location.boundingBox) {
    return null;
  }

  // boundingBox format from Nominatim: [south, north, west, east]
  const [south, north, west, east] = location.boundingBox;
  const bounds: [[number, number], [number, number]] = [[south, west], [north, east]];
  
  // Calculate center from bounding box
  const centerLat = (south + north) / 2;
  const centerLon = (west + east) / 2;

  try {
    return (
      <MapContainer
        center={[centerLat, centerLon]}
        zoom={getZoomLevel(location.precision)}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        className="rounded-xl"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Rectangle 
          bounds={bounds}
          pathOptions={{ 
            color: primaryColor, 
            fillColor: primaryColor, 
            fillOpacity: 0.2,
            weight: 2
          }}
        >
          <Popup>{title} - {getPrecisionLabel(location.precision)}</Popup>
        </Rectangle>
      </MapContainer>
    );
  } catch (error) {
    console.error('Error rendering map with area:', error);
    return null;
  }
}

// Static map fallback using OpenStreetMap embed
function StaticMapFallback({ location, primaryColor }: { location: LocationResult; primaryColor: string }) {
  let bbox: string;
  
  if (location.boundingBox && location.precision !== 'exact') {
    const [south, north, west, east] = location.boundingBox;
    bbox = `${west},${south},${east},${north}`;
  } else {
    bbox = `${location.lon - 0.01},${location.lat - 0.01},${location.lon + 0.01},${location.lat + 0.01}`;
  }
  
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${location.lat},${location.lon}`;
  
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
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [geocodeAttempted, setGeocodeAttempted] = useState(false);

  // Build full address string for display
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

  // Geocode address with precision-based fallback
  useEffect(() => {
    let isMounted = true;
    
    const loadCoordinates = async () => {
      try {
        // Priority 1: Use existing exact coordinates
        if (hasExistingCoordinates) {
          if (isMounted) {
            setLocation({ 
              lat: latitude!, 
              lon: longitude!, 
              precision: 'exact' 
            });
            setGeocodeAttempted(true);
          }
          return;
        }

        // Priority 2: Full address with number → exact pin
        if (endereco && numero && cidade) {
          const searchAddress = [endereco, numero, bairro, cidade, uf, 'Brasil'].filter(Boolean).join(', ');
          const result = await geocodeWithBounds(searchAddress, 'exact');
          if (result && isMounted) {
            setLocation(result);
            setGeocodeAttempted(true);
            return;
          }
        }

        // Priority 3: Street without number → street area
        if (endereco && cidade && !numero) {
          const searchAddress = [endereco, bairro, cidade, uf, 'Brasil'].filter(Boolean).join(', ');
          const result = await geocodeWithBounds(searchAddress, 'street');
          if (result && isMounted) {
            setLocation(result);
            setGeocodeAttempted(true);
            return;
          }
        }

        // Priority 4: Only neighborhood → neighborhood area
        if (bairro && cidade) {
          const searchAddress = `${bairro}, ${cidade}, ${uf || ''}, Brasil`;
          const result = await geocodeWithBounds(searchAddress, 'neighborhood');
          if (result && isMounted) {
            setLocation(result);
            setGeocodeAttempted(true);
            return;
          }
        }

        // Priority 5: Only city → city area
        if (cidade && uf) {
          const result = await geocodeWithBounds(`${cidade}, ${uf}, Brasil`, 'city');
          if (result && isMounted) {
            setLocation(result);
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
            Rectangle: reactLeaflet.Rectangle,
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
  if (!fullAddress && !location && geocodeAttempted) {
    return null;
  }

  const canShowLeafletMap = location && leafletModules && !leafletError;
  const canShowFallbackMap = location && (leafletError || !leafletModules);
  const showExactMarker = location?.precision === 'exact';

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <MapPin className="w-5 h-5" style={{ color: primaryColor }} />
        Localização
      </h2>

      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
        {/* Precision indicator */}
        {location && location.precision !== 'exact' && (
          <div 
            className="px-4 py-2 text-sm flex items-center gap-2"
            style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}
          >
            <MapPin className="w-4 h-4" />
            {getPrecisionLabel(location.precision)}
          </div>
        )}

        {/* Map */}
        <div className="h-[300px] md:h-[400px] w-full bg-gray-100">
          {isLoading && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: primaryColor }} />
            </div>
          )}
          
          {!isLoading && canShowLeafletMap && showExactMarker && (
            <MapErrorBoundary fallback={<StaticMapFallback location={location} primaryColor={primaryColor} />}>
              <LeafletMapWithMarker 
                location={location} 
                title={title} 
                modules={leafletModules} 
              />
            </MapErrorBoundary>
          )}

          {!isLoading && canShowLeafletMap && !showExactMarker && location.boundingBox && (
            <MapErrorBoundary fallback={<StaticMapFallback location={location} primaryColor={primaryColor} />}>
              <LeafletMapWithArea 
                location={location} 
                title={title}
                primaryColor={primaryColor}
                modules={leafletModules} 
              />
            </MapErrorBoundary>
          )}

          {/* Fallback: exact without boundingBox shows marker */}
          {!isLoading && canShowLeafletMap && !showExactMarker && !location.boundingBox && (
            <MapErrorBoundary fallback={<StaticMapFallback location={location} primaryColor={primaryColor} />}>
              <LeafletMapWithMarker 
                location={location} 
                title={title} 
                modules={leafletModules} 
              />
            </MapErrorBoundary>
          )}
          
          {!isLoading && canShowFallbackMap && (
            <StaticMapFallback location={location} primaryColor={primaryColor} />
          )}
          
          {!isLoading && !location && geocodeAttempted && (
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
