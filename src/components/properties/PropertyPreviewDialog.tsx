import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Property, useUpdateProperty } from '@/hooks/use-properties';
import { useIsMobile } from '@/hooks/use-mobile';
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
  Check,
  XCircle,
  Home,
  Layers,
  Maximize2,
  DollarSign,
  FileText,
  ImageIcon,
  Info,
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
  const updateProperty = useUpdateProperty();

  // Reset image index when property changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [property?.id]);

  if (!property) return null;

  // Combine main image and gallery
  const allImages: string[] = [];
  if (property.imagem_principal) {
    allImages.push(property.imagem_principal);
  }
  if (property.fotos && Array.isArray(property.fotos)) {
    allImages.push(...(property.fotos as string[]));
  }

  const isActive = property.status !== 'inativo';

  const handleToggleStatus = () => {
    updateProperty.mutate({
      id: property.id,
      status: isActive ? 'inativo' : 'ativo',
    });
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  const content = (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left Side - Image Gallery */}
      <div className="lg:w-1/2 flex flex-col">
        {/* Main Image */}
        <div className="relative aspect-[4/3] lg:aspect-[16/11] rounded-xl overflow-hidden bg-muted group">
          {allImages.length > 0 ? (
            <>
              <img
                src={allImages[currentImageIndex]}
                alt={`${property.title || 'Imóvel'} - Foto ${currentImageIndex + 1}`}
                className="w-full h-full object-cover transition-transform duration-300"
              />
              
              {/* Navigation Arrows */}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              {/* Image Counter */}
              <div className="absolute bottom-3 right-3 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                {currentImageIndex + 1} / {allImages.length}
              </div>

              {/* Badges */}
              <div className="absolute top-3 left-3 flex gap-2">
                {currentImageIndex === 0 && property.imagem_principal && (
                  <Badge className="bg-primary shadow-lg">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Principal
                  </Badge>
                )}
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
              <Building2 className="h-20 w-20 mb-2 opacity-30" />
              <p className="text-sm">Sem imagens</p>
            </div>
          )}
        </div>

        {/* Thumbnail Grid */}
        {allImages.length > 1 && (
          <div className="mt-3 grid grid-cols-6 gap-2">
            {allImages.map((img, index) => (
              <button
                key={index}
                className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentImageIndex 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : 'border-transparent hover:border-muted-foreground/30'
                }`}
                onClick={() => setCurrentImageIndex(index)}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Side - Property Details */}
      <div className="lg:w-1/2 flex flex-col">
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-5">
            {/* Header with Status Toggle */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {property.code}
                  </Badge>
                  <Badge variant={property.tipo_de_negocio === 'Venda' ? 'default' : 'secondary'}>
                    {property.tipo_de_negocio}
                  </Badge>
                  {property.destaque && (
                    <Badge className="bg-warning text-warning-foreground">
                      <Star className="h-3 w-3 mr-1" />
                      Destaque
                    </Badge>
                  )}
                </div>
                <h2 className="text-xl lg:text-2xl font-bold">
                  {property.title || `${property.tipo_de_imovel} em ${property.bairro}`}
                </h2>
              </div>
              
              {/* Status Toggle */}
              <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/50 border">
                <Switch
                  checked={isActive}
                  onCheckedChange={handleToggleStatus}
                  disabled={updateProperty.isPending}
                />
                <span className={`text-xs font-medium ${isActive ? 'text-success' : 'text-muted-foreground'}`}>
                  {isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>

            {/* Location */}
            {(property.endereco || property.bairro || property.cidade) && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="text-sm">
                  {[property.endereco, property.numero, property.bairro, property.cidade, property.uf]
                    .filter(Boolean)
                    .join(', ')}
                  {property.cep && <span className="text-xs ml-1">- CEP: {property.cep}</span>}
                </span>
              </div>
            )}

            {/* Price */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4">
              <p className="text-3xl font-bold text-primary">
                {formatPrice(property.preco, property.tipo_de_negocio)}
              </p>
              {property.tipo_de_negocio === 'Aluguel' && (
                <p className="text-sm text-muted-foreground">por mês</p>
              )}
            </div>

            {/* Key Features Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {property.quartos !== null && property.quartos !== undefined && property.quartos > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Bed className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">{property.quartos}</p>
                    <p className="text-xs text-muted-foreground">Quartos</p>
                  </div>
                </div>
              )}
              {property.banheiros !== null && property.banheiros !== undefined && property.banheiros > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Bath className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">{property.banheiros}</p>
                    <p className="text-xs text-muted-foreground">Banheiros</p>
                  </div>
                </div>
              )}
              {property.vagas !== null && property.vagas !== undefined && property.vagas > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Car className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">{property.vagas}</p>
                    <p className="text-xs text-muted-foreground">Vagas</p>
                  </div>
                </div>
              )}
              {property.area_util && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Ruler className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">{property.area_util}</p>
                    <p className="text-xs text-muted-foreground">m² útil</p>
                  </div>
                </div>
              )}
            </div>

            {/* Property Details Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Detalhes do Imóvel</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                {property.tipo_de_imovel && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Tipo
                    </span>
                    <span className="font-medium">{property.tipo_de_imovel}</span>
                  </div>
                )}
                {property.suites !== null && property.suites !== undefined && property.suites > 0 && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground">Suítes</span>
                    <span className="font-medium">{property.suites}</span>
                  </div>
                )}
                {property.andar && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Andar
                    </span>
                    <span className="font-medium">{property.andar}º</span>
                  </div>
                )}
                {property.area_total && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Maximize2 className="h-4 w-4" />
                      Área Total
                    </span>
                    <span className="font-medium">{property.area_total}m²</span>
                  </div>
                )}
                {property.ano_construcao && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Construção
                    </span>
                    <span className="font-medium">{property.ano_construcao}</span>
                  </div>
                )}
                {property.mobilia && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Sofa className="h-4 w-4" />
                      Mobília
                    </span>
                    <span className="font-medium">{property.mobilia}</span>
                  </div>
                )}
                {property.regra_pet !== null && property.regra_pet !== undefined && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <PawPrint className="h-4 w-4" />
                      Aceita Pet
                    </span>
                    <span className={`font-medium flex items-center gap-1 ${property.regra_pet ? 'text-success' : 'text-muted-foreground'}`}>
                      {property.regra_pet ? <Check className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      {property.regra_pet ? 'Sim' : 'Não'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Monthly Costs */}
            {(property.condominio || property.iptu || property.seguro_incendio || property.taxa_de_servico) && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Custos Mensais</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {property.condominio && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30">
                      <span className="text-sm text-muted-foreground">Condomínio</span>
                      <span className="font-semibold text-orange-600 dark:text-orange-400">
                        R$ {property.condominio.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}
                  {property.iptu && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30">
                      <span className="text-sm text-muted-foreground">IPTU</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        R$ {property.iptu.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}
                  {property.seguro_incendio && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
                      <span className="text-sm text-muted-foreground">Seguro</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        R$ {property.seguro_incendio.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}
                  {property.taxa_de_servico && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/30">
                      <span className="text-sm text-muted-foreground">Taxa Serviço</span>
                      <span className="font-semibold text-purple-600 dark:text-purple-400">
                        R$ {property.taxa_de_servico.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Property Features */}
            {(property as any).caracteristicas && Array.isArray((property as any).caracteristicas) && ((property as any).caracteristicas as string[]).length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Características</h3>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {((property as any).caracteristicas as string[]).map((feature, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary"
                      className="px-3 py-1 text-sm"
                    >
                      <Check className="h-3 w-3 mr-1 text-success" />
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {property.descricao && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Descrição</h3>
                </div>
                
                <div className="p-4 rounded-xl bg-muted/30 border">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {property.descricao}
                  </p>
                </div>
              </div>
            )}

            {/* Video Link */}
            {property.video_imovel && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">Vídeo</h3>
                </div>
                
                <a 
                  href={property.video_imovel} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-primary text-sm underline"
                >
                  {property.video_imovel}
                </a>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[95vh] p-4">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center justify-between">
              <span>Visualizar Imóvel</span>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(95vh-80px)]">
            {content}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Visualizar Imóvel</h2>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {content}
      </DialogContent>
    </Dialog>
  );
}
