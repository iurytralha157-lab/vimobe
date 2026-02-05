import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Percent, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  default_commission_percentage: string;
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
    default_commission_percentage: '5',
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
        default_commission_percentage: String((organization as any).default_commission_percentage || 5),
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
          cnpj: formData.cnpj || null,
          inscricao_estadual: formData.inscricao_estadual || null,
          razao_social: formData.razao_social || null,
          nome_fantasia: formData.nome_fantasia || null,
          cep: formData.cep || null,
          endereco: formData.endereco || null,
          numero: formData.numero || null,
          complemento: formData.complemento || null,
          bairro: formData.bairro || null,
          cidade: formData.cidade || null,
          uf: formData.uf || null,
          telefone: formData.telefone || null,
          whatsapp: formData.whatsapp || null,
          email: formData.email || null,
          website: formData.website || null,
          default_commission_percentage: parseFloat(formData.default_commission_percentage) || 5,
        })
        .eq('id', organization.id);

      if (error) throw error;

      await refreshProfile();
      toast.success(t.settings.organization.saveSuccess);
    } catch (error) {
      console.error('Error saving organization:', error);
      toast.error(t.settings.organization.saveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.settings.organization.title}</CardTitle>
        <CardDescription>{t.settings.organization.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="org-name">{t.settings.organization.companyName}</Label>
          <Input
            id="org-name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder={t.settings.organization.companyName}
            disabled={!isAdmin}
          />
        </div>

        <Separator />

        {/* Fiscal Data */}
        <div className="space-y-4">
          <h4 className="font-medium">{t.settings.organization.fiscalData}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.settings.organization.cnpj}</Label>
              <Input 
                placeholder="00.000.000/0000-00" 
                value={formData.cnpj}
                onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.settings.organization.stateRegistration}</Label>
              <Input 
                placeholder={t.settings.organization.stateRegistration}
                value={formData.inscricao_estadual}
                onChange={(e) => setFormData(prev => ({ ...prev, inscricao_estadual: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.settings.organization.legalName}</Label>
              <Input 
                placeholder={t.settings.organization.legalName}
                value={formData.razao_social}
                onChange={(e) => setFormData(prev => ({ ...prev, razao_social: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.settings.organization.tradeName}</Label>
              <Input 
                placeholder={t.settings.organization.tradeName}
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
          <h4 className="font-medium">{t.settings.organization.address}</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t.settings.profile.cep}</Label>
              <Input 
                placeholder="00000-000" 
                value={formData.cep}
                onChange={(e) => setFormData(prev => ({ ...prev, cep: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t.settings.profile.street}</Label>
              <Input 
                placeholder={t.settings.profile.street}
                value={formData.endereco}
                onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.settings.profile.number}</Label>
              <Input 
                placeholder={t.settings.profile.number}
                value={formData.numero}
                onChange={(e) => setFormData(prev => ({ ...prev, numero: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.settings.profile.complement}</Label>
              <Input 
                placeholder={t.settings.profile.complement}
                value={formData.complemento}
                onChange={(e) => setFormData(prev => ({ ...prev, complemento: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.settings.profile.neighborhood}</Label>
              <Input 
                placeholder={t.settings.profile.neighborhood}
                value={formData.bairro}
                onChange={(e) => setFormData(prev => ({ ...prev, bairro: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t.settings.profile.city}</Label>
              <Input 
                placeholder={t.settings.profile.city}
                value={formData.cidade}
                onChange={(e) => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.settings.profile.state}</Label>
              <Input 
                placeholder={t.settings.profile.state}
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
          <h4 className="font-medium">{t.settings.organization.contact}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.common.phone}</Label>
              <Input 
                placeholder="(00) 0000-0000" 
                value={formData.telefone}
                onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.settings.profile.whatsapp}</Label>
              <Input 
                placeholder="(00) 00000-0000" 
                value={formData.whatsapp}
                onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t.common.email}</Label>
              <Input 
                placeholder="contato@empresa.com" 
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t.settings.organization.website}</Label>
              <Input 
                placeholder="https://www.empresa.com" 
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Financial Settings */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            Configurações Financeiras
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Este percentual será usado como padrão para cálculo de comissões quando não houver um valor específico definido no lead ou imóvel.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Comissão Padrão (%)
              </Label>
              <Input 
                type="number"
                min="0"
                max="100"
                step="0.5"
                placeholder="5"
                value={formData.default_commission_percentage}
                onChange={(e) => setFormData(prev => ({ ...prev, default_commission_percentage: e.target.value }))}
                disabled={!isAdmin}
              />
              <p className="text-xs text-muted-foreground">
                Usado quando o lead/imóvel não tem comissão específica definida
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        {isAdmin && (
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={saving || !formData.name.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t.common.save}
            </Button>
          </div>
        )}

        {!isAdmin && (
          <p className="text-xs text-muted-foreground pt-4">
            {t.settings.profile.changePhotoNote}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
