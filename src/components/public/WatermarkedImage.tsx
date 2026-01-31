import React from 'react';
import { cn } from '@/lib/utils';

interface WatermarkedImageProps {
  src: string;
  alt: string;
  watermarkUrl?: string | null;
  watermarkEnabled?: boolean;
  watermarkOpacity?: number;
  className?: string;
  imgClassName?: string;
  onClick?: () => void;
}

/**
 * Image component with optional watermark overlay
 * The watermark is applied via CSS, positioned in the bottom-right corner
 */
export function WatermarkedImage({
  src,
  alt,
  watermarkUrl,
  watermarkEnabled = false,
  watermarkOpacity = 20,
  className,
  imgClassName,
  onClick,
}: WatermarkedImageProps) {
  const showWatermark = watermarkEnabled && watermarkUrl;

  return (
    <div className={cn('relative overflow-hidden', className)} onClick={onClick}>
      <img
        src={src}
        alt={alt}
        className={cn('w-full h-full object-cover', imgClassName)}
      />
      
      {showWatermark && (
        <div 
          className="absolute bottom-2 right-2 md:bottom-4 md:right-4 pointer-events-none select-none"
          style={{ opacity: watermarkOpacity / 100 }}
        >
          <img 
            src={watermarkUrl} 
            alt=""
            className="max-h-8 md:max-h-12 max-w-20 md:max-w-32 object-contain drop-shadow-lg"
            draggable={false}
          />
        </div>
      )}
    </div>
  );
}
