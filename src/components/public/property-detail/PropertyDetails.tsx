import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, MapPin, Info, Sparkles } from 'lucide-react';

interface PropertyDetailsProps {
  descricao?: string | null;
  detalhesExtras?: string[] | null;
  proximidades?: string[] | null;
  primaryColor?: string;
}

export default function PropertyDetails({
  descricao,
  detalhesExtras,
  proximidades,
  primaryColor = '#F97316',
}: PropertyDetailsProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Parse JSON arrays if they're strings
  const parseArray = (data: string[] | null | undefined): string[] => {
    if (!data) return [];
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return [];
      }
    }
    return data;
  };

  const extras = parseArray(detalhesExtras);
  const nearby = parseArray(proximidades);

  const hasExtras = extras.length > 0;
  const hasNearby = nearby.length > 0;
  const hasDescription = descricao && descricao.trim().length > 0;

  if (!hasDescription && !hasExtras && !hasNearby) {
    return null;
  }

  // Determine if description should be truncated
  const shouldTruncate = descricao && descricao.length > 500;
  const displayDescription = shouldTruncate && !isDescriptionExpanded
    ? descricao.substring(0, 500) + '...'
    : descricao;

  return (
    <div className="space-y-8">
      {/* Description */}
      {hasDescription && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5" style={{ color: primaryColor }} />
            Sobre o Imóvel
          </h2>
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
              {displayDescription}
            </p>
            {shouldTruncate && (
              <button
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="mt-4 text-sm font-medium hover:underline"
                style={{ color: primaryColor }}
              >
                {isDescriptionExpanded ? 'Ver menos' : 'Ver mais'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabs for Features and Nearby */}
      {(hasExtras || hasNearby) && (
        <Tabs defaultValue={hasExtras ? 'features' : 'nearby'} className="w-full">
          <TabsList className="w-full justify-start bg-gray-100 p-1 rounded-xl">
            {hasExtras && (
              <TabsTrigger 
                value="features" 
                className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Características
              </TabsTrigger>
            )}
            {hasNearby && (
              <TabsTrigger 
                value="nearby" 
                className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg gap-2"
              >
                <MapPin className="w-4 h-4" />
                Proximidades
              </TabsTrigger>
            )}
          </TabsList>

          {hasExtras && (
            <TabsContent value="features" className="mt-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {extras.map((item, index) => (
                    <div 
                      key={index} 
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                    >
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${primaryColor}20` }}
                      >
                        <Check className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                      </div>
                      <span className="text-gray-700 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          )}

          {hasNearby && (
            <TabsContent value="nearby" className="mt-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {nearby.map((item, index) => (
                    <div 
                      key={index} 
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                    >
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${primaryColor}20` }}
                      >
                        <MapPin className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                      </div>
                      <span className="text-gray-700 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
