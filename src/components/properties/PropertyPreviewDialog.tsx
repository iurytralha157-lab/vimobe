import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Property } from '@/hooks/use-properties';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
  MapPin,
  Bed,
  Bath,
  Car,
  Ruler,
  Star,
  Building2,
  Calendar,
  Sofa,
  PawPrint,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

interface PropertyPreviewDialogProps {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formatPrice: (value: number | null, tipo: string | null) => string;
}

export function PropertyPreviewDialog({
  property,
  open,
  onOpenChange,
  formatPrice,
}: PropertyPreviewDialogProps) {
  const isMobile = useIsMobile();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!property) return null;

  // Combine main image and gallery
  const allImages: string[] = [];
  if (property.imagem_principal) {
    allImages.push(property.imagem_principal);
  }
  if (property.fotos && Array.isArray(property.fotos)) {
    allImages.push(...(property.fotos as string[]));
  }

  const content = (
    <ScrollArea className="h-full max-h-[85vh]">
      <div className="space-y-6 p-1">
        {/* Image Carousel */}
        {allImages.length > 0 ? (
          <div className="relative">
            <Carousel className="w-full">
              <CarouselContent>
                {allImages.map((img, index) => (
                  <CarouselItem key={index}>
                    <div className="aspect-[16/10] relative rounded-lg overflow-hidden bg-muted">
                      <img
                        src={img}
                        alt={`${property.title || 'Imóvel'} - Foto ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {index === 0 && property.imagem_principal && (
                        <Badge className="absolute top-3 left-3 bg-primary">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Principal
                        </Badge>
                      )}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {allImages.length > 1 && (
                <>
                  <CarouselPrevious className="left-2" />
                  <CarouselNext className="right-2" />
                </>
              )}
            </Carousel>
            {allImages.length > 1 && (
              <div className="flex justify-center gap-1 mt-3">
                {allImages.map((_, index) => (
                  <button
                    key={index}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      index === currentImageIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                    onClick={() => setCurrentImageIndex(index)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <Building2 className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}

        {/* Thumbnail Grid */}
        {allImages.length > 1 && (
          <div className="grid grid-cols-5 gap-2">
            {allImages.slice(0, 5).map((img, index) => (
              <button
                key={index}
                className={`aspect-square rounded-md overflow-hidden border-2 transition-colors ${
                  index === currentImageIndex ? 'border-primary' : 'border-transparent'
                }`}
                onClick={() => setCurrentImageIndex(index)}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
            {allImages.length > 5 && (
              <div className="aspect-square rounded-md bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                +{allImages.length - 5}
              </div>
            )}
          </div>
        )}

        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Badge variant="outline" className="font-mono text-xs mb-2">
                {property.code}
              </Badge>
              <h2 className="text-xl font-semibold">
                {property.title || `${property.tipo_de_imovel} em ${property.bairro}`}
              </h2>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {property.destaque && (
                <Badge className="bg-warning text-warning-foreground">
                  <Star className="h-3 w-3 mr-1" />
                  Destaque
                </Badge>
              )}
              <Badge variant={property.tipo_de_negocio === 'Venda' ? 'default' : 'secondary'}>
                {property.tipo_de_negocio}
              </Badge>
            </div>
          </div>

          {(property.bairro || property.cidade) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>
                {[property.endereco, property.numero, property.bairro, property.cidade, property.uf]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>
          )}

          <p className="text-2xl font-bold text-primary">
            {formatPrice(property.preco, property.tipo_de_negocio)}
          </p>
        </div>

        <Separator />

        {/* Key Features */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {property.quartos && property.quartos > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Bed className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">{property.quartos}</p>
                <p className="text-xs text-muted-foreground">Quartos</p>
              </div>
            </div>
          )}
          {property.banheiros && property.banheiros > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Bath className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">{property.banheiros}</p>
                <p className="text-xs text-muted-foreground">Banheiros</p>
              </div>
            </div>
          )}
          {property.vagas && property.vagas > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Car className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">{property.vagas}</p>
                <p className="text-xs text-muted-foreground">Vagas</p>
              </div>
            </div>
          )}
          {property.area_util && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Ruler className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">{property.area_util}m²</p>
                <p className="text-xs text-muted-foreground">Área Útil</p>
              </div>
            </div>
          )}
        </div>

        {/* Additional Info */}
        {(property.suites || property.andar || property.ano_construcao || property.mobilia || property.regra_pet) && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="font-medium">Detalhes</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {property.suites && property.suites > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Suítes</span>
                    <span className="font-medium">{property.suites}</span>
                  </div>
                )}
                {property.andar && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Andar</span>
                    <span className="font-medium">{property.andar}º</span>
                  </div>
                )}
                {property.ano_construcao && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ano Construção</span>
                    <span className="font-medium">{property.ano_construcao}</span>
                  </div>
                )}
                {property.area_total && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Área Total</span>
                    <span className="font-medium">{property.area_total}m²</span>
                  </div>
                )}
                {property.mobilia && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mobília</span>
                    <span className="font-medium">{property.mobilia}</span>
                  </div>
                )}
                {property.regra_pet && (
                  <div className="flex items-center gap-2">
                    <PawPrint className="h-4 w-4 text-success" />
                    <span className="font-medium">Aceita Pet</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Costs */}
        {(property.condominio || property.iptu || property.seguro_incendio || property.taxa_de_servico) && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="font-medium">Custos Mensais</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {property.condominio && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Condomínio</span>
                    <span className="font-medium">R$ {property.condominio.toLocaleString('pt-BR')}</span>
                  </div>
                )}
                {property.iptu && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IPTU</span>
                    <span className="font-medium">R$ {property.iptu.toLocaleString('pt-BR')}</span>
                  </div>
                )}
                {property.seguro_incendio && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Seguro</span>
                    <span className="font-medium">R$ {property.seguro_incendio.toLocaleString('pt-BR')}</span>
                  </div>
                )}
                {property.taxa_de_servico && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxa Serviço</span>
                    <span className="font-medium">R$ {property.taxa_de_servico.toLocaleString('pt-BR')}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Description */}
        {property.descricao && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="font-medium">Descrição</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {property.descricao}
              </p>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[95vh] p-4">
          <SheetHeader className="mb-4">
            <SheetTitle>Visualizar Imóvel</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-6">
        <DialogHeader>
          <DialogTitle>Visualizar Imóvel</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
