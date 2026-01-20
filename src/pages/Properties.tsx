import { useState, useEffect, useDeferredValue } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Loader2,
  Star,
  Building2
} from 'lucide-react';
import { useProperties, useCreateProperty, useUpdateProperty, useDeleteProperty, Property } from '@/hooks/use-properties';
import { usePropertyTypes, useCreatePropertyType } from '@/hooks/use-property-types';
import { usePropertyFeatures, useCreatePropertyFeature, useSeedDefaultFeatures, DEFAULT_FEATURES } from '@/hooks/use-property-features';
import { usePropertyProximities, useCreatePropertyProximity, useSeedDefaultProximities, DEFAULT_PROXIMITIES } from '@/hooks/use-property-proximities';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { PropertyFormDialog } from '@/components/properties/PropertyFormDialog';
import { useIsMobile } from '@/hooks/use-mobile';

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
  descricao: '',
  imagem_principal: '',
  fotos: [],
  video_imovel: '',
  detalhes_extras: [],
  proximidades: [],
};

export default function Properties() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [newTypeName, setNewTypeName] = useState('');
  const [showAddType, setShowAddType] = useState(false);
  const isMobile = useIsMobile();

  const deferredSearch = useDeferredValue(search);
  
  const { data: properties = [], isLoading } = useProperties(deferredSearch);
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

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingProperty(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Remove detalhes_extras and proximidades as they don't exist in the database schema
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
      preco: formData.preco ? parseFloat(formData.preco) : null,
      condominio: formData.condominio ? parseFloat(formData.condominio) : null,
      iptu: formData.iptu ? parseFloat(formData.iptu) : null,
      seguro_incendio: formData.seguro_incendio ? parseFloat(formData.seguro_incendio) : null,
      taxa_de_servico: formData.taxa_de_servico ? parseFloat(formData.taxa_de_servico) : null,
      descricao: formData.descricao || null,
      imagem_principal: formData.imagem_principal || null,
      fotos: formData.fotos,
      video_imovel: formData.video_imovel || null,
    };
    
    if (editingProperty) {
      await updateProperty.mutateAsync({ id: editingProperty.id, ...propertyData });
    } else {
      await createProperty.mutateAsync(propertyData);
    }
    
    setDialogOpen(false);
    resetForm();
  };

  const openEdit = (property: Property) => {
    setEditingProperty(property);
    setFormData({
      title: property.title || '',
      tipo_de_imovel: property.tipo_de_imovel || 'Apartamento',
      tipo_de_negocio: property.tipo_de_negocio || 'Venda',
      status: property.status || 'ativo',
      destaque: property.destaque || false,
      endereco: property.endereco || '',
      numero: property.numero || '',
      complemento: property.complemento || '',
      bairro: property.bairro || '',
      cidade: property.cidade || '',
      uf: property.uf || '',
      cep: property.cep || '',
      quartos: property.quartos?.toString() || '',
      suites: property.suites?.toString() || '',
      banheiros: property.banheiros?.toString() || '',
      vagas: property.vagas?.toString() || '',
      area_util: property.area_util?.toString() || '',
      area_total: property.area_total?.toString() || '',
      mobilia: property.mobilia || '',
      regra_pet: property.regra_pet || false,
      andar: property.andar?.toString() || '',
      ano_construcao: property.ano_construcao?.toString() || '',
      preco: property.preco?.toString() || '',
      condominio: property.condominio?.toString() || '',
      iptu: property.iptu?.toString() || '',
      seguro_incendio: property.seguro_incendio?.toString() || '',
      taxa_de_servico: property.taxa_de_servico?.toString() || '',
      descricao: property.descricao || '',
      imagem_principal: property.imagem_principal || '',
      fotos: (property.fotos as string[]) || [],
      video_imovel: property.video_imovel || '',
      detalhes_extras: [],
      proximidades: [],
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteProperty.mutateAsync(id);
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
    venda: properties.filter(p => p.tipo_de_negocio === 'Venda').length,
    aluguel: properties.filter(p => p.tipo_de_negocio === 'Aluguel').length,
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
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar imóveis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            {isMobile ? 'Novo' : 'Novo Imóvel'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
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
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold">{stats.venda}</p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">À Venda</p>
              </div>
            </CardContent>
          </Card>
          <Card>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onEdit={openEdit}
              onDelete={handleDelete}
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
      </div>
    </AppLayout>
  );
}
