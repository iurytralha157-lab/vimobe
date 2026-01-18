import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUsers, useUpdateUser } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Building2,
  Bell,
  Shield,
  Palette,
  Globe,
  Loader2,
} from "lucide-react";

export default function Settings() {
  const { t } = useLanguage();
  const { profile, organization, refreshProfile } = useAuth();
  const { toast } = useToast();
  const updateUser = useUpdateUser();

  const [name, setName] = useState(profile?.name || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [orgName, setOrgName] = useState(organization?.name || "");
  const [isUpdatingOrg, setIsUpdatingOrg] = useState(false);

  const handleUpdateProfile = async () => {
    if (!profile?.id) return;
    setIsUpdatingProfile(true);
    try {
      await updateUser.mutateAsync({ id: profile.id, name });
      await refreshProfile();
      toast({ title: "Perfil atualizado!" });
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdateOrganization = async () => {
    if (!organization?.id) return;
    setIsUpdatingOrg(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ name: orgName })
        .eq("id", organization.id);

      if (error) throw error;
      await refreshProfile();
      toast({ title: "Organização atualizada!" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    } finally {
      setIsUpdatingOrg(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold">{t("nav.settings")}</h1>
          <p className="text-muted-foreground">
            Gerencie suas preferências e configurações
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="organization" className="gap-2">
              <Building2 className="h-4 w-4" />
              Organização
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              Aparência
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Perfil</CardTitle>
                <CardDescription>
                  Atualize suas informações pessoais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl">
                      {profile?.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{profile?.name}</p>
                    <p className="text-sm text-muted-foreground">{profile?.email}</p>
                    <p className="text-sm text-muted-foreground capitalize">{profile?.role}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      value={profile?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>

                <Button onClick={handleUpdateProfile} disabled={isUpdatingProfile}>
                  {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar alterações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organization Tab */}
          <TabsContent value="organization">
            <Card>
              <CardHeader>
                <CardTitle>Organização</CardTitle>
                <CardDescription>
                  Configurações da sua empresa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Nome da organização</Label>
                    <Input
                      id="org-name"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Segmento</Label>
                    <Input
                      value={organization?.segment || "Não definido"}
                      disabled
                      className="bg-muted capitalize"
                    />
                  </div>
                </div>

                <Button onClick={handleUpdateOrganization} disabled={isUpdatingOrg}>
                  {isUpdatingOrg && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar alterações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notificações</CardTitle>
                <CardDescription>
                  Configure como você deseja receber notificações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Notificações por e-mail</p>
                    <p className="text-sm text-muted-foreground">
                      Receba atualizações importantes por e-mail
                    </p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Novos leads</p>
                    <p className="text-sm text-muted-foreground">
                      Notificação quando um novo lead for atribuído
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Lembretes de tarefas</p>
                    <p className="text-sm text-muted-foreground">
                      Lembrete de tarefas pendentes
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Aparência</CardTitle>
                <CardDescription>
                  Personalize a aparência do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Tema escuro</p>
                    <p className="text-sm text-muted-foreground">
                      Alterne entre modo claro e escuro
                    </p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Sidebar compacta</p>
                    <p className="text-sm text-muted-foreground">
                      Mantenha a sidebar recolhida por padrão
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
