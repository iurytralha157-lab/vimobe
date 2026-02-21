import { MapPin, Bed, Car, Maximize, Heart } from 'lucide-react';
import { getPositionClasses, WatermarkPosition } from '@/lib/watermark-utils';

interface PublicPropertyCardProps {
  property: {
    id: string;
    titulo: string;
    imagem_principal?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    quartos?: number | null;
    banheiros?: number | null;
    vagas?: number | null;
    area_util?: number | null;
    area_total?: number | null;
    valor_venda?: number | null;
    valor_aluguel?: number | null;
    tipo_imovel?: string | null;
    codigo?: string | null;
    suites?: number | null;
    [key: string]: any;
  };
  primaryColor?: string;
  watermarkConfig?: {
    enabled: boolean;
    logoUrl?: string;
    position?: string;
    opacity?: number;
    size?: number;
  } | null;
}

export function PublicPropertyCard({ property, primaryColor = '#C4A052', watermarkConfig }: PublicPropertyCardProps) {
  const formatPrice = (value: number | null | undefined) => {
    if (!value) return null;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  const isRent = !property.valor_venda && !!property.valor_aluguel;
  const price = property.valor_venda || property.valor_aluguel;
  const badgeLabel = property.valor_venda ? 'Venda' : 'Aluguel';
  const location = [property.bairro, property.cidade].filter(Boolean).join(', ');

  const suites = (property as any).suites;
  const hasSubFeatures = (suites != null && suites > 0) || (property.quartos != null && property.quartos > 0) || (property.vagas != null && property.vagas > 0) || (property.area_util != null && property.area_util > 0) || (property.area_total != null && property.area_total > 0);

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 group h-full flex flex-col">
      {/* Image Section */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={property.imagem_principal || '/placeholder.svg'}
          alt={property.titulo}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
        />
        
        {/* Subtle gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Badge */}
        <div className="absolute top-4 left-4">
          <span 
            className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white rounded-md shadow-lg backdrop-blur-sm"
            style={{ backgroundColor: `${primaryColor}E6` }}
          >
            {badgeLabel}
          </span>
        </div>

        {/* Watermark */}
        {watermarkConfig?.enabled && watermarkConfig?.logoUrl && (
          <div 
            className={`absolute pointer-events-none select-none ${getPositionClasses((watermarkConfig.position as WatermarkPosition) || 'bottom-right')}`}
            style={{ opacity: (watermarkConfig.opacity || 20) / 100 }}
          >
            <img 
              src={watermarkConfig.logoUrl} 
              alt=""
              style={{ 
                maxHeight: `${Math.max(16, (watermarkConfig.size || 80) * 0.25)}px`,
                maxWidth: `${Math.max(32, (watermarkConfig.size || 80) * 0.5)}px`
              }}
              className="object-contain drop-shadow-lg"
              draggable={false}
            />
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-5 flex flex-col flex-1">
        {/* Title */}
        <h3 className="font-bold text-base text-gray-900 leading-snug mb-2 line-clamp-2 group-hover:text-gray-700 transition-colors">
          {property.titulo}
        </h3>

        {/* Location */}
        {location && (
          <p className="text-gray-500 text-sm flex items-center gap-1.5 mb-4">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: primaryColor }} />
            <span className="truncate">{location}</span>
          </p>
        )}

        {/* Features */}
        {hasSubFeatures && (
          <div className="flex items-center gap-3 text-gray-500 text-xs mb-4 flex-wrap">
            {suites != null && suites > 0 ? (
              <span className="flex items-center gap-1">
                <Bed className="w-3.5 h-3.5" />
                <span className="font-medium text-gray-700">{suites} Suítes</span>
              </span>
            ) : property.quartos != null && property.quartos > 0 && (
              <span className="flex items-center gap-1">
                <Bed className="w-3.5 h-3.5" />
                <span className="font-medium text-gray-700">{property.quartos} Quartos</span>
              </span>
            )}
            {property.vagas != null && property.vagas > 0 && (
              <span className="flex items-center gap-1">
                <Car className="w-3.5 h-3.5" />
                <span className="font-medium text-gray-700">{property.vagas} Vagas</span>
              </span>
            )}
            {(property.area_util || property.area_total) && (
              <span className="flex items-center gap-1">
                <Maximize className="w-3.5 h-3.5" />
                <span className="font-medium text-gray-700">{property.area_util || property.area_total} m²</span>
              </span>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price + Favorite */}
        <div className="flex items-end justify-between pt-4 border-t border-gray-100">
          <div>
            {price && (
              <>
                <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Preço</p>
                <p 
                  className="text-xl font-bold leading-tight"
                  style={{ color: primaryColor }}
                >
                  {formatPrice(price)}
                  {isRent && <span className="text-xs font-normal text-gray-400">/mês</span>}
                </p>
              </>
            )}
          </div>
          <button 
            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:border-red-300 hover:bg-red-50 transition-all duration-300 group/heart"
            onClick={(e) => e.preventDefault()}
          >
            <Heart className="w-4.5 h-4.5 text-gray-400 group-hover/heart:text-red-400 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
}
