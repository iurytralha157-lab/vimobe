import React from 'react';
import { useSystemSettings } from '@/hooks/use-system-settings';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DynamicWhatsAppIconProps {
  className?: string;
  size?: number;
}

export function DynamicWhatsAppIcon({ className, size = 16 }: DynamicWhatsAppIconProps) {
  const { data: settings } = useSystemSettings();
  
  // O usuário quer que puxe o ícone PWA das configurações do SuperAdm
  const pwaIcon = settings?.pwa_icon_url;

  if (pwaIcon) {
    return (
      <img 
        src={pwaIcon} 
        alt="WhatsApp" 
        className={cn("object-contain", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  // Fallback para o ícone padrão se não houver ícone PWA configurado
  return <MessageCircle className={cn(className)} style={{ width: size, height: size }} />;
}
