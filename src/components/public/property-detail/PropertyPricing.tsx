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
    <Card className="rounded-2xl border border-gray-100 sticky top-24">
      <CardContent className="p-6 space-y-6">
        {/* Price */}
        {preco && (
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">
              {isBoth ? 'Valor de Venda' : isRent ? 'Aluguel' : 'Valor'}
            </p>
            <p 
              className="text-3xl md:text-4xl font-bold"
              style={{ color: primaryColor }}
            >
              {formatPrice(preco)}
              {isRent && <span className="text-lg font-normal text-gray-500">/mês</span>}
            </p>
          </div>
        )}

        {/* Additional Costs */}
        {additionalCosts.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-gray-100">
            {additionalCosts.map((cost, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">{cost.label}</span>
                <span className="font-medium text-gray-900">{formatPrice(cost.value)}</span>
              </div>
            ))}
            
            {/* Total Monthly for Rent */}
            {isRent && totalMonthlyCost && (
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <span className="font-semibold text-gray-700">Total Mensal</span>
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
        <div className="pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500 mb-3 text-center">
            Preencha o formulário para receber mais informações
          </p>
          <ContactFormDialog
            organizationId={organizationId}
            propertyId={propertyId}
            propertyCode={codigo}
            propertyTitle={titulo}
            whatsappNumber={whatsappNumber || undefined}
            primaryColor={primaryColor}
            trigger={
              <Button
                className="w-full rounded-xl h-14 text-base font-semibold gap-2 text-white shadow-lg hover:shadow-xl transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                <MessageCircle className="w-5 h-5" />
                Tenho Interesse
              </Button>
            }
          />
        </div>

        {/* Property Code */}
        <div className="text-center pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">Código do imóvel</p>
          <p className="font-mono font-semibold text-gray-600">{codigo}</p>
        </div>
      </CardContent>
    </Card>
  );
}
