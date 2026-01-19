import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ImageUploader } from "./ImageUploader";
import { FeatureSelector } from "./FeatureSelector";

interface PropertyFormData {
  title: string;
  tipo_de_imovel: string;
  tipo_de_negocio: string;
  status: string;
  destaque: boolean;
  preco: string;
  area_util: string;
  area_total: string;
  quartos: string;
  suites: string;
  banheiros: string;
  vagas: string;
  andar: string;
  ano_construcao: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  condominio: string;
  iptu: string;
  taxa_de_servico: string;
  seguro_incendio: string;
  mobilia: string;
  regra_pet: boolean;
  descricao: string;
  video_imovel: string;
}

interface PropertyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property?: any;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
}

const TIPO_IMOVEL_OPTIONS = [
  { value: "apartamento", label: "Apartamento" },
  { value: "casa", label: "Casa" },
  { value: "comercial", label: "Comercial" },
  { value: "terreno", label: "Terreno" },
  { value: "rural", label: "Rural" },
  { value: "cobertura", label: "Cobertura" },
  { value: "kitnet", label: "Kitnet" },
  { value: "loft", label: "Loft" },
];

const TIPO_NEGOCIO_OPTIONS = [
  { value: "venda", label: "Venda" },
  { value: "aluguel", label: "Aluguel" },
  { value: "venda_aluguel", label: "Venda e Aluguel" },
];

const STATUS_OPTIONS = [
  { value: "disponivel", label: "Disponível" },
  { value: "reservado", label: "Reservado" },
  { value: "vendido", label: "Vendido" },
  { value: "alugado", label: "Alugado" },
];

const MOBILIA_OPTIONS = [
  { value: "sem_mobilia", label: "Sem mobília" },
  { value: "semi_mobiliado", label: "Semi-mobiliado" },
  { value: "mobiliado", label: "Mobiliado" },
];

const UF_OPTIONS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];

const DEFAULT_FEATURES = [
  "Ar condicionado",
  "Piscina",
  "Churrasqueira",
  "Academia",
  "Salão de festas",
  "Playground",
  "Portaria 24h",
  "Elevador",
  "Varanda",
  "Quintal",
  "Área de serviço",
  "Closet",
];

export function PropertyFormDialog({
  open,
  onOpenChange,
  property,
  onSubmit,
  isSubmitting,
}: PropertyFormDialogProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("geral");
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [availableFeatures, setAvailableFeatures] = useState(DEFAULT_FEATURES);
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  const { register, handleSubmit, setValue, watch, reset } = useForm<PropertyFormData>({
    defaultValues: {
      title: "",
      tipo_de_imovel: "",
      tipo_de_negocio: "",
      status: "disponivel",
      destaque: false,
      preco: "",
      area_util: "",
      area_total: "",
      quartos: "",
      suites: "",
      banheiros: "",
      vagas: "",
      andar: "",
      ano_construcao: "",
      cep: "",
      endereco: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      uf: "",
      condominio: "",
      iptu: "",
      taxa_de_servico: "",
      seguro_incendio: "",
      mobilia: "",
      regra_pet: false,
      descricao: "",
      video_imovel: "",
    },
  });

  useEffect(() => {
    if (property) {
      reset({
        title: property.title || "",
        tipo_de_imovel: property.tipo_de_imovel || "",
        tipo_de_negocio: property.tipo_de_negocio || "",
        status: property.status || "disponivel",
        destaque: property.destaque || false,
        preco: property.preco?.toString() || "",
        area_util: property.area_util?.toString() || "",
        area_total: property.area_total?.toString() || "",
        quartos: property.quartos?.toString() || "",
        suites: property.suites?.toString() || "",
        banheiros: property.banheiros?.toString() || "",
        vagas: property.vagas?.toString() || "",
        andar: property.andar?.toString() || "",
        ano_construcao: property.ano_construcao?.toString() || "",
        cep: property.cep || "",
        endereco: property.endereco || "",
        numero: property.numero || "",
        complemento: property.complemento || "",
        bairro: property.bairro || "",
        cidade: property.cidade || "",
        uf: property.uf || "",
        condominio: property.condominio?.toString() || "",
        iptu: property.iptu?.toString() || "",
        taxa_de_servico: property.taxa_de_servico?.toString() || "",
        seguro_incendio: property.seguro_incendio?.toString() || "",
        mobilia: property.mobilia || "",
        regra_pet: property.regra_pet || false,
        descricao: property.descricao || "",
        video_imovel: property.video_imovel || "",
      });
      setMainImage(property.imagem_principal || null);
      setGalleryImages(property.fotos || []);
    } else {
      reset();
      setMainImage(null);
      setGalleryImages([]);
      setSelectedFeatures([]);
    }
  }, [property, reset]);

  const handleCepBlur = async () => {
    const cep = watch("cep")?.replace(/\D/g, "");
    if (cep?.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setValue("endereco", data.logradouro || "");
        setValue("bairro", data.bairro || "");
        setValue("cidade", data.localidade || "");
        setValue("uf", data.uf || "");
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleFormSubmit = async (data: PropertyFormData) => {
    await onSubmit({
      ...data,
      preco: data.preco ? parseFloat(data.preco) : null,
      area_util: data.area_util ? parseFloat(data.area_util) : null,
      area_total: data.area_total ? parseFloat(data.area_total) : null,
      quartos: data.quartos ? parseInt(data.quartos) : null,
      suites: data.suites ? parseInt(data.suites) : null,
      banheiros: data.banheiros ? parseInt(data.banheiros) : null,
      vagas: data.vagas ? parseInt(data.vagas) : null,
      andar: data.andar ? parseInt(data.andar) : null,
      ano_construcao: data.ano_construcao ? parseInt(data.ano_construcao) : null,
      condominio: data.condominio ? parseFloat(data.condominio) : null,
      iptu: data.iptu ? parseFloat(data.iptu) : null,
      taxa_de_servico: data.taxa_de_servico ? parseFloat(data.taxa_de_servico) : null,
      seguro_incendio: data.seguro_incendio ? parseFloat(data.seguro_incendio) : null,
      imagem_principal: mainImage,
      fotos: galleryImages,
    });
  };

  const handleAddFeature = (feature: string) => {
    if (!availableFeatures.includes(feature)) {
      setAvailableFeatures([...availableFeatures, feature]);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="local">Local</TabsTrigger>
          <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          <TabsTrigger value="extras">Extras</TabsTrigger>
          <TabsTrigger value="valores" className="hidden lg:flex">Valores</TabsTrigger>
          <TabsTrigger value="descricao" className="hidden lg:flex">Descrição</TabsTrigger>
          <TabsTrigger value="midia" className="hidden lg:flex">Mídia</TabsTrigger>
        </TabsList>

        <div className="lg:hidden mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="valores">Valores</TabsTrigger>
            <TabsTrigger value="descricao">Descrição</TabsTrigger>
            <TabsTrigger value="midia">Mídia</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="geral" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input {...register("title")} placeholder="Ex: Apartamento 3 quartos no Jardins" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Imóvel</Label>
              <Select value={watch("tipo_de_imovel")} onValueChange={(v) => setValue("tipo_de_imovel", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_IMOVEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Negócio</Label>
              <Select value={watch("tipo_de_negocio")} onValueChange={(v) => setValue("tipo_de_negocio", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_NEGOCIO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Destaque</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  checked={watch("destaque")}
                  onCheckedChange={(v) => setValue("destaque", v)}
                />
                <span className="text-sm text-muted-foreground">
                  {watch("destaque") ? "Sim" : "Não"}
                </span>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="local" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>CEP</Label>
              <div className="relative">
                <Input
                  {...register("cep")}
                  placeholder="00000-000"
                  onBlur={handleCepBlur}
                />
                {isLoadingCep && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                )}
              </div>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Endereço</Label>
              <Input {...register("endereco")} placeholder="Rua, Avenida..." />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Número</Label>
              <Input {...register("numero")} placeholder="123" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Complemento</Label>
              <Input {...register("complemento")} placeholder="Apt 101, Bloco A..." />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input {...register("bairro")} placeholder="Bairro" />
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input {...register("cidade")} placeholder="Cidade" />
            </div>
            <div className="space-y-2">
              <Label>UF</Label>
              <Select value={watch("uf")} onValueChange={(v) => setValue("uf", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {UF_OPTIONS.map((uf) => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="detalhes" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Quartos</Label>
              <Input type="number" {...register("quartos")} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Suítes</Label>
              <Input type="number" {...register("suites")} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Banheiros</Label>
              <Input type="number" {...register("banheiros")} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Vagas</Label>
              <Input type="number" {...register("vagas")} placeholder="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Área útil (m²)</Label>
              <Input type="number" {...register("area_util")} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Área total (m²)</Label>
              <Input type="number" {...register("area_total")} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Andar</Label>
              <Input type="number" {...register("andar")} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Ano construção</Label>
              <Input type="number" {...register("ano_construcao")} placeholder="2020" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="extras" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mobília</Label>
              <Select value={watch("mobilia")} onValueChange={(v) => setValue("mobilia", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {MOBILIA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Aceita pet</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  checked={watch("regra_pet")}
                  onCheckedChange={(v) => setValue("regra_pet", v)}
                />
                <span className="text-sm text-muted-foreground">
                  {watch("regra_pet") ? "Sim" : "Não"}
                </span>
              </div>
            </div>
          </div>

          <FeatureSelector
            label="Características"
            availableFeatures={availableFeatures}
            selectedFeatures={selectedFeatures}
            onSelect={setSelectedFeatures}
            onAddNew={handleAddFeature}
            placeholder="Adicionar característica"
          />
        </TabsContent>

        <TabsContent value="valores" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preço (R$)</Label>
              <Input type="number" {...register("preco")} placeholder="500000" />
            </div>
            <div className="space-y-2">
              <Label>Condomínio (R$)</Label>
              <Input type="number" {...register("condominio")} placeholder="800" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>IPTU (R$/ano)</Label>
              <Input type="number" {...register("iptu")} placeholder="2400" />
            </div>
            <div className="space-y-2">
              <Label>Taxa de serviço</Label>
              <Input type="number" {...register("taxa_de_servico")} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Seguro incêndio</Label>
              <Input type="number" {...register("seguro_incendio")} placeholder="0" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="descricao" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Descrição do imóvel</Label>
            <Textarea
              {...register("descricao")}
              placeholder="Descreva as principais características e diferenciais do imóvel..."
              rows={8}
            />
          </div>
        </TabsContent>

        <TabsContent value="midia" className="space-y-4 mt-4">
          <ImageUploader
            mainImage={mainImage}
            galleryImages={galleryImages}
            onMainImageChange={setMainImage}
            onGalleryChange={setGalleryImages}
            propertyId={property?.id}
          />

          <div className="space-y-2">
            <Label>URL do vídeo (YouTube/Vimeo)</Label>
            <Input {...register("video_imovel")} placeholder="https://youtube.com/watch?v=..." />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {property ? "Salvar alterações" : "Criar imóvel"}
        </Button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>{property ? "Editar Imóvel" : "Novo Imóvel"}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto">{formContent}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{property ? "Editar Imóvel" : "Novo Imóvel"}</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
