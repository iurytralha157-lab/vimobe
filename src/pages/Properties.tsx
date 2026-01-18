import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProperties, useCreateProperty, useDeleteProperty } from "@/hooks/use-properties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  MoreHorizontal,
  MapPin,
  Bed,
  Bath,
  Car,
  Ruler,
  Trash2,
  Edit,
  Building2,
  Home,
  Eye,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "disponivel", label: "Disponível", color: "bg-emerald-500" },
  { value: "reservado", label: "Reservado", color: "bg-amber-500" },
  { value: "vendido", label: "Vendido", color: "bg-blue-500" },
  { value: "alugado", label: "Alugado", color: "bg-violet-500" },
];

const TIPO_NEGOCIO = [
  { value: "venda", label: "Venda" },
  { value: "aluguel", label: "Aluguel" },
  { value: "venda_aluguel", label: "Venda e Aluguel" },
];

const TIPO_IMOVEL = [
  { value: "apartamento", label: "Apartamento" },
  { value: "casa", label: "Casa" },
  { value: "comercial", label: "Comercial" },
  { value: "terreno", label: "Terreno" },
  { value: "rural", label: "Rural" },
];

export default function Properties() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProperty, setNewProperty] = useState({
    title: "",
    tipo_de_imovel: "",
    tipo_de_negocio: "",
    preco: "",
    area_util: "",
    quartos: "",
    banheiros: "",
    vagas: "",
    bairro: "",
    cidade: "",
    uf: "",
    descricao: "",
  });

  const { data: properties, isLoading } = useProperties({ 
    search: search || undefined,
    status: statusFilter || undefined,
  });
  const createProperty = useCreateProperty();
  const deleteProperty = useDeleteProperty();

  const handleCreateProperty = async () => {
    if (!newProperty.title.trim()) return;

    await createProperty.mutateAsync({
      title: newProperty.title,
      tipo_de_imovel: newProperty.tipo_de_imovel || undefined,
      tipo_de_negocio: newProperty.tipo_de_negocio || undefined,
      preco: newProperty.preco ? parseFloat(newProperty.preco) : undefined,
      area_util: newProperty.area_util ? parseFloat(newProperty.area_util) : undefined,
      quartos: newProperty.quartos ? parseInt(newProperty.quartos) : undefined,
      banheiros: newProperty.banheiros ? parseInt(newProperty.banheiros) : undefined,
      vagas: newProperty.vagas ? parseInt(newProperty.vagas) : undefined,
      bairro: newProperty.bairro || undefined,
      cidade: newProperty.cidade || undefined,
      uf: newProperty.uf || undefined,
      descricao: newProperty.descricao || undefined,
    });

    setNewProperty({
      title: "",
      tipo_de_imovel: "",
      tipo_de_negocio: "",
      preco: "",
      area_util: "",
      quartos: "",
      banheiros: "",
      vagas: "",
      bairro: "",
      cidade: "",
      uf: "",
      descricao: "",
    });
    setIsDialogOpen(false);
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "Sob consulta";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string | null) => {
    const found = STATUS_OPTIONS.find((s) => s.value === status);
    return found || { label: "Disponível", color: "bg-emerald-500" };
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("nav.properties")}</h1>
            <p className="text-muted-foreground">
              {properties?.length || 0} imóveis cadastrados
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("properties.newProperty")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t("properties.newProperty")}</DialogTitle>
                  <DialogDescription>
                    Cadastre um novo imóvel no sistema
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label>Título *</Label>
                      <Input
                        value={newProperty.title}
                        onChange={(e) => setNewProperty({ ...newProperty, title: e.target.value })}
                        placeholder="Ex: Apartamento 3 quartos no Jardins"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Imóvel</Label>
                      <Select
                        value={newProperty.tipo_de_imovel}
                        onValueChange={(v) => setNewProperty({ ...newProperty, tipo_de_imovel: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPO_IMOVEL.map((tipo) => (
                            <SelectItem key={tipo.value} value={tipo.value}>
                              {tipo.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Negócio</Label>
                      <Select
                        value={newProperty.tipo_de_negocio}
                        onValueChange={(v) => setNewProperty({ ...newProperty, tipo_de_negocio: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPO_NEGOCIO.map((tipo) => (
                            <SelectItem key={tipo.value} value={tipo.value}>
                              {tipo.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Preço (R$)</Label>
                      <Input
                        type="number"
                        value={newProperty.preco}
                        onChange={(e) => setNewProperty({ ...newProperty, preco: e.target.value })}
                        placeholder="500000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Área útil (m²)</Label>
                      <Input
                        type="number"
                        value={newProperty.area_util}
                        onChange={(e) => setNewProperty({ ...newProperty, area_util: e.target.value })}
                        placeholder="120"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quartos</Label>
                      <Input
                        type="number"
                        value={newProperty.quartos}
                        onChange={(e) => setNewProperty({ ...newProperty, quartos: e.target.value })}
                        placeholder="3"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Banheiros</Label>
                      <Input
                        type="number"
                        value={newProperty.banheiros}
                        onChange={(e) => setNewProperty({ ...newProperty, banheiros: e.target.value })}
                        placeholder="2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Vagas</Label>
                      <Input
                        type="number"
                        value={newProperty.vagas}
                        onChange={(e) => setNewProperty({ ...newProperty, vagas: e.target.value })}
                        placeholder="2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bairro</Label>
                      <Input
                        value={newProperty.bairro}
                        onChange={(e) => setNewProperty({ ...newProperty, bairro: e.target.value })}
                        placeholder="Jardins"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Input
                        value={newProperty.cidade}
                        onChange={(e) => setNewProperty({ ...newProperty, cidade: e.target.value })}
                        placeholder="São Paulo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>UF</Label>
                      <Input
                        value={newProperty.uf}
                        onChange={(e) => setNewProperty({ ...newProperty, uf: e.target.value })}
                        placeholder="SP"
                        maxLength={2}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Descrição</Label>
                      <Textarea
                        value={newProperty.descricao}
                        onChange={(e) => setNewProperty({ ...newProperty, descricao: e.target.value })}
                        placeholder="Descrição detalhada do imóvel"
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button onClick={handleCreateProperty} disabled={createProperty.isPending}>
                    {createProperty.isPending ? t("common.loading") : t("common.save")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Properties Grid */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        ) : properties?.length ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => {
              const status = getStatusBadge(property.status);
              return (
                <Card key={property.id} className="overflow-hidden card-hover">
                  {/* Image placeholder */}
                  <div className="relative h-48 bg-muted flex items-center justify-center">
                    {property.imagem_principal ? (
                      <img
                        src={property.imagem_principal}
                        alt={property.title || "Imóvel"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Building2 className="h-16 w-16 text-muted-foreground/50" />
                    )}
                    <Badge className={`absolute top-3 left-3 ${status.color}`}>
                      {status.label}
                    </Badge>
                    <Badge variant="secondary" className="absolute top-3 right-3">
                      {property.code}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold line-clamp-1">
                          {property.title || `Imóvel ${property.code}`}
                        </h3>
                        {property.bairro && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {property.bairro}, {property.cidade}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteProperty.mutate(property.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Features */}
                    <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
                      {property.quartos && (
                        <span className="flex items-center gap-1">
                          <Bed className="h-4 w-4" />
                          {property.quartos}
                        </span>
                      )}
                      {property.banheiros && (
                        <span className="flex items-center gap-1">
                          <Bath className="h-4 w-4" />
                          {property.banheiros}
                        </span>
                      )}
                      {property.vagas && (
                        <span className="flex items-center gap-1">
                          <Car className="h-4 w-4" />
                          {property.vagas}
                        </span>
                      )}
                      {property.area_util && (
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
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Home className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum imóvel cadastrado</h3>
            <p className="text-muted-foreground">
              Cadastre seu primeiro imóvel para começar
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
