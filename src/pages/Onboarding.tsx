import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Building2, Loader2, ArrowRight, Sparkles } from "lucide-react";

const SEGMENTS = [
  { value: "imobiliaria", label: "Imobiliária" },
  { value: "incorporadora", label: "Incorporadora" },
  { value: "construtora", label: "Construtora" },
  { value: "corretor_autonomo", label: "Corretor Autônomo" },
  { value: "outros", label: "Outros" },
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [segment, setSegment] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [useInvite, setUseInvite] = useState(false);

  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCreateOrganization = async () => {
    if (!organizationName.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Digite o nome da sua organização",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: organizationName,
          segment: segment || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Update user with organization_id
      const { error: userError } = await supabase
        .from("users")
        .update({ 
          organization_id: org.id,
          role: "admin" 
        })
        .eq("id", user?.id);

      if (userError) throw userError;

      // Create default pipeline
      const { data: pipeline, error: pipelineError } = await supabase
        .from("pipelines")
        .insert({
          name: "Pipeline Principal",
          organization_id: org.id,
          is_default: true,
        })
        .select()
        .single();

      if (pipelineError) throw pipelineError;

      // Create default stages
      const defaultStages = [
        { name: "Novo", stage_key: "novo", position: 0, color: "#6366f1" },
        { name: "Contato", stage_key: "contato", position: 1, color: "#8b5cf6" },
        { name: "Qualificado", stage_key: "qualificado", position: 2, color: "#0ea5e9" },
        { name: "Visita", stage_key: "visita", position: 3, color: "#f59e0b" },
        { name: "Proposta", stage_key: "proposta", position: 4, color: "#10b981" },
        { name: "Fechado", stage_key: "fechado", position: 5, color: "#22c55e" },
        { name: "Perdido", stage_key: "perdido", position: 6, color: "#ef4444" },
      ];

      const { error: stagesError } = await supabase
        .from("stages")
        .insert(
          defaultStages.map((stage) => ({
            ...stage,
            pipeline_id: pipeline.id,
          }))
        );

      if (stagesError) throw stagesError;

      await refreshProfile();
      toast({
        title: "Organização criada!",
        description: "Sua conta está pronta para uso.",
      });
      navigate("/");
    } catch (error) {
      console.error("Onboarding error:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao criar organização. Tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!inviteCode.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Digite o código do convite",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.rpc("accept_invite", {
        p_token: inviteCode,
      });

      if (error) throw error;

      await refreshProfile();
      toast({
        title: "Convite aceito!",
        description: "Você agora faz parte da organização.",
      });
      navigate("/");
    } catch (error) {
      console.error("Invite error:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Convite inválido ou expirado.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/50 to-background p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-primary text-primary-foreground">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold">Bem-vindo ao Vimob!</h1>
          <p className="text-muted-foreground text-center">
            Vamos configurar sua conta em poucos passos
          </p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {step === 1 ? "Como deseja começar?" : "Configure sua organização"}
            </CardTitle>
            <CardDescription>
              {step === 1
                ? "Escolha uma opção para continuar"
                : "Preencha os dados da sua empresa"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 && (
              <>
                <Button
                  variant="outline"
                  className="w-full h-auto p-4 justify-start"
                  onClick={() => {
                    setUseInvite(false);
                    setStep(2);
                  }}
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-semibold">Criar nova organização</span>
                    <span className="text-sm text-muted-foreground">
                      Sou o primeiro da minha empresa a usar o Vimob
                    </span>
                  </div>
                  <ArrowRight className="ml-auto h-5 w-5" />
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-auto p-4 justify-start"
                  onClick={() => {
                    setUseInvite(true);
                    setStep(2);
                  }}
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-semibold">Tenho um convite</span>
                    <span className="text-sm text-muted-foreground">
                      Recebi um código de convite da minha equipe
                    </span>
                  </div>
                  <ArrowRight className="ml-auto h-5 w-5" />
                </Button>
              </>
            )}

            {step === 2 && !useInvite && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Nome da organização</Label>
                  <Input
                    id="org-name"
                    placeholder="Ex: Imobiliária Premium"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="segment">Segmento</Label>
                  <select
                    id="segment"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={segment}
                    onChange={(e) => setSegment(e.target.value)}
                    disabled={isLoading}
                  >
                    <option value="">Selecione...</option>
                    {SEGMENTS.map((seg) => (
                      <option key={seg.value} value={seg.value}>
                        {seg.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    disabled={isLoading}
                  >
                    Voltar
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleCreateOrganization}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      "Criar organização"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && useInvite && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-code">Código do convite</Label>
                  <Input
                    id="invite-code"
                    placeholder="Cole o código aqui"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    disabled={isLoading}
                  >
                    Voltar
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleAcceptInvite}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Validando...
                      </>
                    ) : (
                      "Aceitar convite"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
