import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, User, Phone, Mail, MessageSquare, Building2 } from "lucide-react";
import { usePipelines, useStages } from "@/hooks/use-pipelines";
import { useProperties } from "@/hooks/use-properties";
import { useCreateLead } from "@/hooks/use-leads";
import { useToast } from "@/hooks/use-toast";
import { formatPhoneForDisplay } from "@/lib/phone-utils";

interface CreateLeadFormData {
  name: string;
  phone: string;
  email: string;
  message: string;
  pipeline_id: string;
  stage_id: string;
  property_id: string;
}

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPhone?: string;
  defaultName?: string;
  onSuccess?: (leadId: string) => void;
}

export function CreateLeadDialog({
  open,
  onOpenChange,
  defaultPhone,
  defaultName,
  onSuccess,
}: CreateLeadDialogProps) {
  const { toast } = useToast();
  const { data: pipelines, isLoading: loadingPipelines } = usePipelines();
  const { data: properties, isLoading: loadingProperties } = useProperties();
  const createLead = useCreateLead();

  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const { data: stages, isLoading: loadingStages } = useStages(selectedPipelineId);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<CreateLeadFormData>({
    defaultValues: {
      name: defaultName || "",
      phone: defaultPhone || "",
      email: "",
      message: "",
      pipeline_id: "",
      stage_id: "",
      property_id: "",
    },
  });

  // Set defaults when dialog opens
  useEffect(() => {
    if (open) {
      if (defaultPhone) {
        setValue("phone", formatPhoneForDisplay(defaultPhone));
      }
      if (defaultName) {
        setValue("name", defaultName);
      }
      // Set default pipeline
      if (pipelines?.length && !watch("pipeline_id")) {
        const defaultPipeline = pipelines.find(p => p.is_default) || pipelines[0];
        if (defaultPipeline) {
          setSelectedPipelineId(defaultPipeline.id);
          setValue("pipeline_id", defaultPipeline.id);
        }
      }
    }
  }, [open, defaultPhone, defaultName, pipelines, setValue, watch]);

  // Set first stage when pipeline changes
  useEffect(() => {
    if (stages?.length && selectedPipelineId) {
      const firstStage = stages[0];
      if (firstStage) {
        setValue("stage_id", firstStage.id);
      }
    }
  }, [stages, selectedPipelineId, setValue]);

  const handlePipelineChange = (pipelineId: string) => {
    setSelectedPipelineId(pipelineId);
    setValue("pipeline_id", pipelineId);
    setValue("stage_id", ""); // Reset stage when pipeline changes
  };

  const onSubmit = async (data: CreateLeadFormData) => {
    try {
      const result = await createLead.mutateAsync({
        name: data.name,
        phone: data.phone || undefined,
        email: data.email || undefined,
        message: data.message || undefined,
        pipeline_id: data.pipeline_id || undefined,
        stage_id: data.stage_id || undefined,
        property_id: data.property_id || undefined,
      });

      toast({
        title: "Lead criado!",
        description: `${data.name} foi adicionado com sucesso.`,
      });

      reset();
      onOpenChange(false);
      
      if (onSuccess && result?.id) {
        onSuccess(result.id);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao criar lead",
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Lead</DialogTitle>
          <DialogDescription>
            Adicione um novo lead a partir desta conversa
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Nome *
            </Label>
            <Input
              id="name"
              {...register("name", { required: "Nome é obrigatório" })}
              placeholder="Nome do contato"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefone
              </Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          {/* Pipeline & Stage */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pipeline</Label>
              <Select
                value={watch("pipeline_id")}
                onValueChange={handlePipelineChange}
                disabled={loadingPipelines}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines?.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                      {pipeline.is_default && " (Padrão)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Etapa</Label>
              <Select
                value={watch("stage_id")}
                onValueChange={(v) => setValue("stage_id", v)}
                disabled={!selectedPipelineId || loadingStages}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {stages?.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Property */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Imóvel de interesse
            </Label>
            <Select
              value={watch("property_id")}
              onValueChange={(v) => setValue("property_id", v)}
              disabled={loadingProperties}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um imóvel (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhum</SelectItem>
                {properties?.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.code} - {property.title || "Sem título"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Observações
            </Label>
            <Textarea
              id="message"
              {...register("message")}
              placeholder="Adicione observações sobre este lead..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createLead.isPending}>
              {createLead.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Criar Lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
