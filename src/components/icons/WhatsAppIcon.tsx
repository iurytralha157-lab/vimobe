import React, { useEffect, useRef } from 'react';
import { Player } from '@lordicon/react';
import { WHATSAPP_LORDICON } from './WhatsAppIconJson';

interface WhatsAppIconProps {
  size?: number;
  trigger?: 'hover' | 'click' | 'loop' | 'morph' | 'loop-on-hover';
  className?: string;
  colors?: {
    primary?: string;
    secondary?: string;
  };
}

/**
 * A reusable animated WhatsApp icon component using Lordicon.
 * Default colors include the requested orange details.
 */
export const WhatsAppIcon: React.FC<WhatsAppIconProps> = ({ 
  size = 24, 
  trigger = 'hover',
  className = '',
  colors = {
    primary: '#121212', // Dark/Black bubble outline
    secondary: '#ff9800' // Orange details (secondary color in the JSON)
  }
}) => {
  const playerRef = useRef<Player>(null);

  useEffect(() => {
    if (trigger === 'loop' || trigger === 'loop-on-hover') {
      playerRef.current?.playFromBeginning();
    }
  }, [trigger]);

  const handleMouseEnter = () => {
    if (trigger === 'hover' || trigger === 'loop-on-hover') {
      playerRef.current?.playFromBeginning();
    }
  };

  // Map our hex colors to Lordicon's expected format if needed
  // The JSON uses "primary" and "secondary" color effects
  
  return (
    <div 
      className={`inline-flex items-center justify-center ${className}`}
      onMouseEnter={handleMouseEnter}
      style={{ width: size, height: size }}
    >
      <Player
        ref={playerRef}
        icon={WHATSAPP_LORDICON}
        size={size}
        onComplete={() => {
          if (trigger === 'loop') {
            playerRef.current?.playFromBeginning();
          }
        }}
        // Colors are applied via the 'colorize' or 'colors' prop
        // Given the JSON structure, we can try to pass them directly
        colors={{
          primary: colors.primary,
          secondary: colors.secondary,
        }}
      />
    </div>
  );
};
