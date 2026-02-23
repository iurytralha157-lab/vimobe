import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';
import { ContactFormDialog } from '@/components/public/ContactFormDialog';

interface PropertyPricingProps {
  preco?: number | null;
  tipoNegocio?: string | null;
  condominio?: number | null;
  iptu?: number | null;
  seguroIncendio?: number | null;
  taxaServico?: number | null;
  codigo: string;
  titulo: string;
  propertyId?: string;
  organizationId: string;
  whatsappNumber?: string | null;
  phoneNumber?: string | null;
  primaryColor?: string;
  cardColor?: string;
  textColor?: string;
}

export default function PropertyPricing({
  preco,
  tipoNegocio,
  condominio,
  iptu,
  seguroIncendio,
  taxaServico,
  codigo,
  titulo,
  propertyId,
  organizationId,
  whatsappNumber,
  phoneNumber,
  primaryColor = '#F97316',
  cardColor = '#FFFFFF',
  textColor,
}: PropertyPricingProps) {
  const formatPrice = (value: number | null | undefined) => {
    if (!value) return null;
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL', 
      maximumFractionDigits: 0 
    });
  };

  const isRent = tipoNegocio?.toLowerCase().includes('aluguel');
  const isSale = tipoNegocio?.toLowerCase().includes('venda');
  const isBoth = tipoNegocio?.toLowerCase().includes('venda e aluguel');

  // Calculate total monthly cost for rent
  const additionalCosts = [
    { label: 'Condomínio', value: condominio },
    { label: 'IPTU', value: iptu },
    { label: 'Seguro Incêndio', value: seguroIncendio },
    { label: 'Taxa de Serviço', value: taxaServico },
  ].filter(c => c.value);

  const totalMonthlyCost = isRent 
    ? (preco || 0) + additionalCosts.reduce((sum, c) => sum + (c.value || 0), 0)
    : null;

  const whatsappUrl = whatsappNumber 
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Olá! Tenho interesse no imóvel ${codigo} - ${titulo}`
      )}`
    : null;

  return (
    <Card className="rounded-2xl sticky top-24" style={{ backgroundColor: cardColor, borderColor: textColor ? `${textColor}15` : undefined }}>
      <CardContent className="p-6 space-y-6">
        {/* Price */}
        {preco && (
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: textColor, opacity: 0.6 }}>
              {isBoth ? 'Valor de Venda' : isRent ? 'Aluguel' : 'Valor'}
            </p>
            <p 
              className="text-3xl md:text-4xl font-bold"
              style={{ color: primaryColor }}
            >
              {formatPrice(preco)}
              {isRent && <span className="text-lg font-normal" style={{ color: textColor, opacity: 0.5 }}>/mês</span>}
            </p>
          </div>
        )}

        {/* Additional Costs */}
        {additionalCosts.length > 0 && (
          <div className="space-y-3 pt-4" style={{ borderTopWidth: 1, borderTopColor: textColor ? `${textColor}15` : undefined }}>
            {additionalCosts.map((cost, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm" style={{ color: textColor, opacity: 0.6 }}>{cost.label}</span>
                <span className="font-medium" style={{ color: textColor }}>{formatPrice(cost.value)}</span>
              </div>
            ))}
            
            {/* Total Monthly for Rent */}
            {isRent && totalMonthlyCost && (
              <div className="flex justify-between items-center pt-3" style={{ borderTopWidth: 1, borderTopColor: textColor ? `${textColor}15` : undefined }}>
                <span className="font-semibold" style={{ color: textColor, opacity: 0.8 }}>Total Mensal</span>
                <span 
                  className="font-bold text-lg"
                  style={{ color: primaryColor }}
                >
                  {formatPrice(totalMonthlyCost)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Contact Form - OBRIGATÓRIO */}
        <div className="pt-4" style={{ borderTopWidth: 1, borderTopColor: textColor ? `${textColor}15` : undefined }}>
          <ContactFormDialog
            organizationId={organizationId}
            propertyId={propertyId}
            propertyCode={codigo}
            propertyTitle={titulo}
            whatsappNumber={whatsappNumber || undefined}
            primaryColor={primaryColor}
            trigger={
              <Button
                className="w-full rounded-xl h-14 text-base font-semibold gap-2 text-white transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                <MessageCircle className="w-5 h-5" />
                Tenho Interesse
              </Button>
            }
          />
          <p className="text-sm mt-3 text-center" style={{ color: textColor, opacity: 0.5 }}>
            Preencha o formulário para receber mais informações
          </p>
        </div>

        {/* Property Code */}
        <div className="text-center pt-4" style={{ borderTopWidth: 1, borderTopColor: textColor ? `${textColor}15` : undefined }}>
          <p className="text-xs" style={{ color: textColor, opacity: 0.4 }}>Código do imóvel</p>
          <p className="font-mono font-semibold" style={{ color: textColor, opacity: 0.7 }}>{codigo}</p>
        </div>
      </CardContent>
    </Card>
  );
}
