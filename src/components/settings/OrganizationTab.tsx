import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OrganizationData {
  name: string;
  cnpj: string;
  inscricao_estadual: string;
  razao_social: string;
  nome_fantasia: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  telefone: string;
  whatsapp: string;
  email: string;
  website: string;
}

export function OrganizationTab() {
  const { organization, refreshProfile, profile } = useAuth();
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const isAdmin = profile?.role === 'admin';

  const [formData, setFormData] = useState<OrganizationData>({
    name: '',
    cnpj: '',
    inscricao_estadual: '',
    razao_social: '',
    nome_fantasia: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    telefone: '',
    whatsapp: '',
    email: '',
    website: '',
  });

  // Load organization data
  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        cnpj: (organization as any).cnpj || '',
        inscricao_estadual: (organization as any).inscricao_estadual || '',
        razao_social: (organization as any).razao_social || '',
        nome_fantasia: (organization as any).nome_fantasia || '',
        cep: (organization as any).cep || '',
        endereco: (organization as any).endereco || '',
        numero: (organization as any).numero || '',
        complemento: (organization as any).complemento || '',
        bairro: (organization as any).bairro || '',
        cidade: (organization as any).cidade || '',
        uf: (organization as any).uf || '',
        telefone: (organization as any).telefone || '',
        whatsapp: (organization as any).whatsapp || '',
        email: (organization as any).email || '',
        website: (organization as any).website || '',
      });
    }
  }, [organization]);

  const handleSave = async () => {
    if (!organization?.id || !isAdmin) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: formData.name,
        })
        .eq('id', organization.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Organização atualizada com sucesso");
    } catch (error) {
      console.error('Error saving organization:', error);
      toast.error("Erro ao salvar organização");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organização</CardTitle>
        <CardDescription>Gerencie as informações da sua organização</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="org-name">Nome da Empresa</Label>
          <Input
            id="org-name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Nome da Empresa"
            disabled={!isAdmin}
          />
        </div>

        <Separator />

        {/* Fiscal Data */}
        <div className="space-y-4">
          <h4 className="font-medium">Dados Fiscais</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input 
                placeholder="00.000.000/0000-00" 
                value={formData.cnpj}
                onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>Inscrição Estadual</Label>
              <Input 
                placeholder="Inscrição Estadual"
                value={formData.inscricao_estadual}
                onChange={(e) => setFormData(prev => ({ ...prev, inscricao_estadual: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>Razão Social</Label>
              <Input 
                placeholder="Razão Social"
                value={formData.razao_social}
                onChange={(e) => setFormData(prev => ({ ...prev, razao_social: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome Fantasia</Label>
              <Input 
                placeholder="Nome Fantasia"
                value={formData.nome_fantasia}
                onChange={(e) => setFormData(prev => ({ ...prev, nome_fantasia: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Address */}
        <div className="space-y-4">
          <h4 className="font-medium">Endereço</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>CEP</Label>
              <Input 
                placeholder="00000-000" 
                value={formData.cep}
                onChange={(e) => setFormData(prev => ({ ...prev, cep: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Rua</Label>
              <Input 
                placeholder="Rua"
                value={formData.endereco}
                onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>Número</Label>
              <Input 
                placeholder="Número"
                value={formData.numero}
                onChange={(e) => setFormData(prev => ({ ...prev, numero: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>Complemento</Label>
              <Input 
                placeholder="Complemento"
                value={formData.complemento}
                onChange={(e) => setFormData(prev => ({ ...prev, complemento: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input 
                placeholder="Bairro"
                value={formData.bairro}
                onChange={(e) => setFormData(prev => ({ ...prev, bairro: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Cidade</Label>
              <Input 
                placeholder="Cidade"
                value={formData.cidade}
                onChange={(e) => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>UF</Label>
              <Input 
                placeholder="UF"
                maxLength={2}
                value={formData.uf}
                onChange={(e) => setFormData(prev => ({ ...prev, uf: e.target.value.toUpperCase() }))}
                disabled={!isAdmin}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Contact */}
        <div className="space-y-4">
          <h4 className="font-medium">Contato</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input 
                placeholder="(00) 0000-0000" 
                value={formData.telefone}
                onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input 
                placeholder="(00) 00000-0000" 
                value={formData.whatsapp}
                onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>E-mail</Label>
              <Input 
                placeholder="contato@empresa.com" 
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Website</Label>
              <Input 
                placeholder="https://www.empresa.com" 
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        {isAdmin && (
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={saving || !formData.name.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        )}

        {!isAdmin && (
          <p className="text-xs text-muted-foreground pt-4">
            Apenas administradores podem editar estas informações.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
