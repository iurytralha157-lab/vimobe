import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  MapPin, 
  Bed, 
  Bath, 
  Car,
  Ruler,
  Star,
  Building2,
  Pencil,
  Trash2,
  Eye
} from 'lucide-react';
import { Property } from '@/hooks/use-properties';

interface PropertyCardProps {
  property: Property;
  onEdit: (property: Property) => void;
  onDelete: (id: string) => void;
  onPreview: (property: Property) => void;
  formatPrice: (value: number | null, tipo: string | null) => string;
}

export function PropertyCard({ property, onEdit, onDelete, onPreview, formatPrice }: PropertyCardProps) {
  return (
    <Card className="overflow-hidden card-hover">
      <div className="aspect-[4/3] bg-muted relative">
        {property.imagem_principal ? (
          <img src={property.imagem_principal} alt={property.title || ''} className="w-full h-full object-cover" />
        ) : property.fotos && Array.isArray(property.fotos) && (property.fotos as string[]).length > 0 ? (
          <img src={(property.fotos as string[])[0]} alt={property.title || ''} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
        {property.destaque && (
          <Badge className="absolute top-2 left-2 bg-warning text-warning-foreground">
            <Star className="h-3 w-3 mr-1" />
            Destaque
          </Badge>
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          <Badge 
            variant={property.tipo_de_negocio === 'Venda' ? 'default' : 'secondary'}
          >
            {property.tipo_de_negocio}
          </Badge>
          {property.status === 'inativo' && (
            <Badge variant="outline" className="bg-background">Inativo</Badge>
          )}
        </div>
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <Badge variant="outline" className="font-mono text-xs">
            {property.code}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(property)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPreview(property)}>
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => onDelete(property.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3 className="font-medium text-sm line-clamp-2 mb-2">
          {property.title || `${property.tipo_de_imovel} em ${property.bairro}`}
        </h3>

        {(property.bairro || property.cidade) && (
          <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{[property.bairro, property.cidade].filter(Boolean).join(', ')}</span>
          </div>
        )}

        <div className="flex items-center gap-3 text-muted-foreground text-xs mb-3 flex-wrap">
          {property.quartos && property.quartos > 0 && (
            <div className="flex items-center gap-1">
              <Bed className="h-3 w-3" />
              <span>{property.quartos}</span>
            </div>
          )}
          {property.banheiros && property.banheiros > 0 && (
            <div className="flex items-center gap-1">
              <Bath className="h-3 w-3" />
              <span>{property.banheiros}</span>
            </div>
          )}
          {property.vagas && property.vagas > 0 && (
            <div className="flex items-center gap-1">
              <Car className="h-3 w-3" />
              <span>{property.vagas}</span>
            </div>
          )}
          {property.area_util && (
            <div className="flex items-center gap-1">
              <Ruler className="h-3 w-3" />
              <span>{property.area_util}m²</span>
            </div>
          )}
        </div>

        <p className="text-lg font-bold text-primary">
          {formatPrice(property.preco, property.tipo_de_negocio)}
        </p>
      </CardContent>
    </Card>
  );
}
