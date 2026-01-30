import React from 'react';
import { 
  Bed, 
  Bath, 
  Car, 
  Maximize, 
  Building2, 
  Sofa,
  PawPrint,
  Calendar,
  Layers
} from 'lucide-react';

interface PropertyFeaturesProps {
  quartos?: number | null;
  suites?: number | null;
  banheiros?: number | null;
  vagas?: number | null;
  areaUtil?: number | null;
  areaTotal?: number | null;
  andar?: number | null;
  anoConstrucao?: number | null;
  mobilia?: string | null;
  regraPet?: boolean | null;
  primaryColor?: string;
}

export default function PropertyFeatures({
  quartos,
  suites,
  banheiros,
  vagas,
  areaUtil,
  areaTotal,
  andar,
  anoConstrucao,
  mobilia,
  regraPet,
  primaryColor = '#F97316',
}: PropertyFeaturesProps) {
  const features = [
    { icon: Maximize, value: areaUtil || areaTotal, label: 'm²', show: !!(areaUtil || areaTotal) },
    { icon: Bed, value: quartos, label: quartos === 1 ? 'Quarto' : 'Quartos', show: !!quartos },
    { icon: Layers, value: suites, label: suites === 1 ? 'Suíte' : 'Suítes', show: !!suites },
    { icon: Bath, value: banheiros, label: banheiros === 1 ? 'Banheiro' : 'Banheiros', show: !!banheiros },
    { icon: Car, value: vagas, label: vagas === 1 ? 'Vaga' : 'Vagas', show: !!vagas },
    { icon: Building2, value: andar, label: 'Andar', show: !!andar },
  ].filter(f => f.show);

  const additionalFeatures = [
    { icon: Calendar, value: anoConstrucao, label: 'Ano de Construção', show: !!anoConstrucao },
    { icon: Sofa, value: mobilia, label: 'Mobília', show: !!mobilia },
    { icon: PawPrint, value: regraPet ? 'Sim' : 'Não', label: 'Aceita Pet', show: regraPet !== null && regraPet !== undefined },
  ].filter(f => f.show);

  if (features.length === 0 && additionalFeatures.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Main Features - Inline Style */}
      {features.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index} 
                className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl"
              >
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <Icon className="w-5 h-5" style={{ color: primaryColor }} />
                </div>
                <span className="text-base text-gray-900">
                  <span className="font-bold">{feature.value}</span>{' '}
                  <span className="font-normal text-gray-500">{feature.label}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Additional Features - Inline Style */}
      {additionalFeatures.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {additionalFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index} 
                className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl"
              >
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <Icon className="w-5 h-5" style={{ color: primaryColor }} />
                </div>
                <span className="text-base text-gray-900">
                  <span className="font-normal text-gray-500">{feature.label}:</span>{' '}
                  <span className="font-bold">{feature.value}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
