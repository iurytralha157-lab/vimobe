import {
  MapPin,
  Bed,
  Bath,
  Car,
  Ruler,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Star,
  Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Property {
  id: string;
  code: string;
  title: string | null;
  imagem_principal: string | null;
  status: string | null;
  destaque: boolean | null;
  tipo_de_negocio: string | null;
  tipo_de_imovel: string | null;
  preco: number | null;
  quartos: number | null;
  banheiros: number | null;
  vagas: number | null;
  area_util: number | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
}

interface PropertyCardProps {
  property: Property;
  onView?: (property: Property) => void;
  onEdit?: (property: Property) => void;
  onDelete?: (property: Property) => void;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  disponivel: { label: "Disponível", className: "bg-emerald-500 hover:bg-emerald-500" },
  reservado: { label: "Reservado", className: "bg-amber-500 hover:bg-amber-500" },
  vendido: { label: "Vendido", className: "bg-blue-500 hover:bg-blue-500" },
  alugado: { label: "Alugado", className: "bg-violet-500 hover:bg-violet-500" },
};

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  venda: "Venda",
  aluguel: "Aluguel",
  venda_aluguel: "Venda/Aluguel",
};

export function PropertyCard({
  property,
  onView,
  onEdit,
  onDelete,
  className,
}: PropertyCardProps) {
  const status = STATUS_CONFIG[property.status || "disponivel"] || STATUS_CONFIG.disponivel;

  const formatCurrency = (value: number | null) => {
    if (!value) return "Sob consulta";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const location = [property.bairro, property.cidade]
    .filter(Boolean)
    .join(", ");

  return (
    <Card className={cn("overflow-hidden group hover:shadow-lg transition-shadow", className)}>
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted">
        {property.imagem_principal ? (
          <img
            src={property.imagem_principal}
            alt={property.title || "Imóvel"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="h-16 w-16 text-muted-foreground/50" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge className={cn("text-white border-0", status.className)}>
            {status.label}
          </Badge>
          {property.destaque && (
            <Badge className="bg-yellow-500 hover:bg-yellow-500 text-white border-0">
              <Star className="h-3 w-3 mr-1 fill-current" />
              Destaque
            </Badge>
          )}
        </div>

        {/* Code badge */}
        <Badge variant="secondary" className="absolute top-3 right-3">
          {property.code}
        </Badge>

        {/* Business type */}
        {property.tipo_de_negocio && (
          <Badge
            variant="secondary"
            className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm"
          >
            {BUSINESS_TYPE_LABELS[property.tipo_de_negocio] || property.tipo_de_negocio}
          </Badge>
        )}
      </div>

      <CardContent className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-lg line-clamp-1">
              {property.title || `Imóvel ${property.code}`}
            </h3>
            {location && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{location}</span>
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(property)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Ver detalhes
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(property)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(property)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-3 mt-4 text-sm text-muted-foreground">
          {property.quartos !== null && property.quartos !== undefined && (
            <span className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              {property.quartos}
            </span>
          )}
          {property.banheiros !== null && property.banheiros !== undefined && (
            <span className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              {property.banheiros}
            </span>
          )}
          {property.vagas !== null && property.vagas !== undefined && (
            <span className="flex items-center gap-1">
              <Car className="h-4 w-4" />
              {property.vagas}
            </span>
          )}
          {property.area_util !== null && property.area_util !== undefined && (
            <span className="flex items-center gap-1">
              <Ruler className="h-4 w-4" />
              {property.area_util}m²
            </span>
          )}
        </div>

        {/* Price */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-xl font-bold text-primary">
            {formatCurrency(property.preco)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
