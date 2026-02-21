import { useState, useEffect, useDeferredValue } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Loader2,
  Star,
  Building2,
  CheckCircle,
  LayoutGrid
} from 'lucide-react';
import { useProperties, useProperty, useCreateProperty, useUpdateProperty, useDeleteProperty, Property } from '@/hooks/use-properties';
import { usePropertyTypes, useCreatePropertyType } from '@/hooks/use-property-types';
import { usePropertyFeatures, useCreatePropertyFeature, useSeedDefaultFeatures, DEFAULT_FEATURES } from '@/hooks/use-property-features';
import { usePropertyProximities, useCreatePropertyProximity, useSeedDefaultProximities, DEFAULT_PROXIMITIES } from '@/hooks/use-property-proximities';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { PropertyFormDialog } from '@/components/properties/PropertyFormDialog';
import { PropertyPreviewDialog } from '@/components/properties/PropertyPreviewDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

const formatPrice = (value: number | null, tipo: string | null) => {
  if (!value) return 'Preço não informado';
  if (tipo === 'Aluguel') {
    return `R$ ${value.toLocaleString('pt-BR')}/mês`;
  }
  return `R$ ${value.toLocaleString('pt-BR')}`;
};

interface FormData {
  title: string;
  tipo_de_imovel: string;
  tipo_de_negocio: string;
  status: string;
  destaque: boolean;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  quartos: string;
  suites: string;
  banheiros: string;
  vagas: string;
  area_util: string;
  area_total: string;
  mobilia: string;
  regra_pet: boolean;
  andar: string;
  ano_construcao: string;
  preco: string;
  condominio: string;
  iptu: string;
  seguro_incendio: string;
  taxa_de_servico: string;
  commission_percentage: string;
  descricao: string;
  imagem_principal: string;
  fotos: string[];
  video_imovel: string;
  detalhes_extras: string[];
  proximidades: string[];
}

const initialFormData: FormData = {
  title: '',
  tipo_de_imovel: 'Apartamento',
  tipo_de_negocio: 'Venda',
  status: 'ativo',
  destaque: false,
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  cep: '',
  quartos: '',
  suites: '',
  banheiros: '',
  vagas: '',
  area_util: '',
  area_total: '',
  mobilia: '',
  regra_pet: false,
  andar: '',
  ano_construcao: '',
  preco: '',
  condominio: '',
  iptu: '',
  seguro_incendio: '',
  taxa_de_servico: '',
  commission_percentage: '',
  descricao: '',
  imagem_principal: '',
  fotos: [],
  video_imovel: '',
  detalhes_extras: [],
  proximidades: [],
};

const GRID_OPTIONS = [
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
];

export default function Properties() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [previewProperty, setPreviewProperty] = useState<Property | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [newTypeName, setNewTypeName] = useState('');
  const [showAddType, setShowAddType] = useState(false);
  const [loadingPropertyId, setLoadingPropertyId] = useState<string | null>(null);
  const [gridCols, setGridCols] = useState('4');
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const deferredSearch = useDeferredValue(search);
  
  const { data: properties = [], isLoading } = useProperties(deferredSearch);
  const { data: fullPropertyData } = useProperty(loadingPropertyId);
  const { data: propertyTypes = [] } = usePropertyTypes();
  const { data: features = [], isLoading: loadingFeatures } = usePropertyFeatures();
  const { data: proximities = [], isLoading: loadingProximities } = usePropertyProximities();
  const createPropertyType = useCreatePropertyType();
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const deleteProperty = useDeleteProperty();
  const createFeature = useCreatePropertyFeature();
  const createProximity = useCreatePropertyProximity();
  const seedFeatures = useSeedDefaultFeatures();
  const seedProximities = useSeedDefaultProximities();

  useEffect(() => {
    if (!loadingFeatures && features.length === 0) {
      seedFeatures.mutate();
    }
  }, [loadingFeatures, features.length]);

  useEffect(() => {
    if (!loadingProximities && proximities.length === 0) {
      seedProximities.mutate();
    }
  }, [loadingProximities, proximities.length]);

  // Quando os dados completos do imóvel são carregados, popular o formulário
  useEffect(() => {
    if (fullPropertyData && loadingPropertyId) {
      setEditingProperty(fullPropertyData);
      setFormData({
        title: fullPropertyData.title || '',
        tipo_de_imovel: fullPropertyData.tipo_de_imovel || 'Apartamento',
        tipo_de_negocio: fullPropertyData.tipo_de_negocio || 'Venda',
        status: fullPropertyData.status || 'ativo',
        destaque: fullPropertyData.destaque || false,
        endereco: fullPropertyData.endereco || '',
        numero: fullPropertyData.numero || '',
        complemento: fullPropertyData.complemento || '',
        bairro: fullPropertyData.bairro || '',
        cidade: fullPropertyData.cidade || '',
        uf: fullPropertyData.uf || '',
        cep: fullPropertyData.cep || '',
        quartos: fullPropertyData.quartos?.toString() || '',
        suites: fullPropertyData.suites?.toString() || '',
        banheiros: fullPropertyData.banheiros?.toString() || '',
        vagas: fullPropertyData.vagas?.toString() || '',
        area_util: fullPropertyData.area_util?.toString() || '',
        area_total: fullPropertyData.area_total?.toString() || '',
        mobilia: fullPropertyData.mobilia || '',
        regra_pet: fullPropertyData.regra_pet || false,
        andar: fullPropertyData.andar?.toString() || '',
        ano_construcao: fullPropertyData.ano_construcao?.toString() || '',
        preco: fullPropertyData.preco?.toString() || '',
        condominio: fullPropertyData.condominio?.toString() || '',
        iptu: fullPropertyData.iptu?.toString() || '',
        seguro_incendio: fullPropertyData.seguro_incendio?.toString() || '',
        taxa_de_servico: fullPropertyData.taxa_de_servico?.toString() || '',
        commission_percentage: (fullPropertyData as any).commission_percentage?.toString() || '',
        descricao: fullPropertyData.descricao || '',
        imagem_principal: fullPropertyData.imagem_principal || '',
        fotos: (fullPropertyData.fotos as string[]) || [],
        video_imovel: fullPropertyData.video_imovel || '',
        detalhes_extras: ((fullPropertyData as any).detalhes_extras as string[]) || [],
        proximidades: ((fullPropertyData as any).proximidades as string[]) || [],
      });
      setDialogOpen(true);
      setLoadingPropertyId(null);
    }
  }, [fullPropertyData, loadingPropertyId]);

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingProperty(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const propertyData = {
      title: formData.title || null,
      tipo_de_imovel: formData.tipo_de_imovel,
      tipo_de_negocio: formData.tipo_de_negocio,
      status: formData.status,
      destaque: formData.destaque,
      endereco: formData.endereco || null,
      numero: formData.numero || null,
      complemento: formData.complemento || null,
      bairro: formData.bairro || null,
      cidade: formData.cidade || null,
      uf: formData.uf || null,
      cep: formData.cep || null,
      quartos: formData.quartos ? parseInt(formData.quartos) : null,
      suites: formData.suites ? parseInt(formData.suites) : null,
      banheiros: formData.banheiros ? parseInt(formData.banheiros) : null,
      vagas: formData.vagas ? parseInt(formData.vagas) : null,
      area_util: formData.area_util ? parseFloat(formData.area_util) : null,
      area_total: formData.area_total ? parseFloat(formData.area_total) : null,
      mobilia: formData.mobilia || null,
      regra_pet: formData.regra_pet,
      andar: formData.andar ? parseInt(formData.andar) : null,
      ano_construcao: formData.ano_construcao ? parseInt(formData.ano_construcao) : null,
      preco: formData.preco ? parseFloat(formData.preco.replace(/\D/g, '')) : null,
      condominio: formData.condominio ? parseFloat(formData.condominio.replace(/\D/g, '')) : null,
      iptu: formData.iptu ? parseFloat(formData.iptu.replace(/\D/g, '')) : null,
      seguro_incendio: formData.seguro_incendio ? parseFloat(formData.seguro_incendio.replace(/\D/g, '')) : null,
      taxa_de_servico: formData.taxa_de_servico ? parseFloat(formData.taxa_de_servico.replace(/\D/g, '')) : null,
      descricao: formData.descricao || null,
      imagem_principal: formData.imagem_principal || null,
      fotos: formData.fotos,
      video_imovel: formData.video_imovel || null,
      detalhes_extras: formData.detalhes_extras,
      proximidades: formData.proximidades,
    };
    
    if (editingProperty) {
      await updateProperty.mutateAsync({ id: editingProperty.id, ...propertyData });
    } else {
      await createProperty.mutateAsync(propertyData);
    }
    
    setDialogOpen(false);
    resetForm();
  };

  const openEdit = async (property: Property) => {
    // Invalidar cache e aguardar refetch completo antes de abrir o formulário
    await queryClient.invalidateQueries({ queryKey: ['property', property.id] });
    // Buscar dados completos do imóvel (incluindo fotos, extras, proximidades)
    setLoadingPropertyId(property.id);
  };

  const handleDelete = async (id: string) => {
    await deleteProperty.mutateAsync(id);
  };

  const handleMarkSold = async (id: string) => {
    await updateProperty.mutateAsync({ id, status: 'vendido' });
    toast.success('Imóvel marcado como vendido!');
  };

  const handleToggleVisibility = async (id: string, isPublic: boolean) => {
    await updateProperty.mutateAsync({ 
      id, 
      status: isPublic ? 'ativo' : 'privado' 
    });
    toast.success(isPublic ? 'Imóvel agora é público!' : 'Imóvel agora é privado!');
  };

  const handleAddPropertyType = async () => {
    if (!newTypeName.trim()) return;
    await createPropertyType.mutateAsync(newTypeName.trim());
    setNewTypeName('');
    setShowAddType(false);
  };

  const stats = {
    total: properties.length,
    destaque: properties.filter(p => p.destaque).length,
    vendidos: properties.filter(p => p.status === 'vendido').length,
    venda: properties.filter(p => p.tipo_de_negocio === 'Venda' && p.status !== 'vendido').length,
    aluguel: properties.filter(p => p.tipo_de_negocio === 'Aluguel').length,
  };

  // Dynamic grid classes based on selection
  const getGridClasses = () => {
    if (isMobile) return 'grid-cols-1';
    
    switch (gridCols) {
      case '2': return 'grid-cols-1 sm:grid-cols-2';
      case '3': return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case '4': return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
      case '5': return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';
      default: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Imóveis">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Imóveis">
      <div className="space-y-4 sm:space-y-6 animate-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar imóveis..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {!isMobile && (
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                <Select value={gridCols} onValueChange={setGridCols}>
                  <SelectTrigger className="w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRID_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            {isMobile ? 'Novo' : 'Novo Imóvel'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                <Star className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">{stats.destaque}</p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Destaque</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">{stats.vendidos}</p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Vendidos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-chart-1/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-chart-1" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">{stats.venda}</p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">À Venda</p>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-chart-2/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-chart-2" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">{stats.aluguel}</p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Aluguel</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Empty State */}
        {properties.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">Nenhum imóvel cadastrado</h3>
              <p className="text-muted-foreground mb-4">
                Cadastre seu primeiro imóvel para começar
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar imóvel
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Properties Grid */}
        <div className={`grid ${getGridClasses()} gap-4`}>
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onEdit={openEdit}
              onDelete={handleDelete}
              onMarkSold={handleMarkSold}
              onToggleVisibility={handleToggleVisibility}
              onPreview={(p) => {
                setPreviewProperty(p);
                setPreviewOpen(true);
              }}
              formatPrice={formatPrice}
            />
          ))}
        </div>

        {/* Form Dialog */}
        <PropertyFormDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
          editingProperty={editingProperty}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          propertyTypes={propertyTypes}
          features={features}
          proximities={proximities}
          loadingFeatures={loadingFeatures}
          loadingProximities={loadingProximities}
          onAddPropertyType={handleAddPropertyType}
          onAddFeature={async (name) => { await createFeature.mutateAsync(name); }}
          onAddProximity={async (name) => { await createProximity.mutateAsync(name); }}
          isCreating={createProperty.isPending}
          isUpdating={updateProperty.isPending}
          isCreatingType={createPropertyType.isPending}
          newTypeName={newTypeName}
          setNewTypeName={setNewTypeName}
          showAddType={showAddType}
          setShowAddType={setShowAddType}
          defaultFeatures={DEFAULT_FEATURES}
          defaultProximities={DEFAULT_PROXIMITIES}
        />

        {/* Preview Dialog */}
        <PropertyPreviewDialog
          property={previewProperty}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          formatPrice={formatPrice}
        />
      </div>
    </AppLayout>
  );
}
