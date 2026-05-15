import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, User, Palette, Globe, Share2, CheckCircle2, 
  Upload, Loader2, ChevronRight, ChevronLeft, Construction, Mail, Phone, MapPin, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { maskCNPJ, maskCPF, maskPhone } from '@/lib/masks';
import { fetchCNPJData } from '@/lib/cnpj';

const STEPS = [
  { id: 1, title: 'Perfil' },
  { id: 2, title: 'Dados Pessoais' },
  { id: 3, title: 'Organização' },
  { id: 4, title: 'Personalização' },
  { id: 5, title: 'Redes Sociais' },
  { id: 6, title: 'Confirmação' },
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<any>({
    segment: 'corretor',
    company_name: '',
    cnpj: '',
    company_address: '',
    company_city: '',
    company_neighborhood: '',
    company_number: '',
    company_complement: '',
    company_phone: '',
    company_whatsapp: '',
    company_email: '',
    responsible_name: '',
    responsible_email: '',
    responsible_cpf: '',
    responsible_phone: '',
    logo_url: '',
    primary_color: '#3b82f6',
    site_title: '',
    custom_domain: '',
    instagram: '',
    facebook: '',
    youtube: '',
    linkedin: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const updateField = (field: string, value: any) => setForm((prev: any) => ({ ...prev, [field]: value }));
  
  const handleCNPJLookup = async () => {
    if (form.cnpj.length < 14) return;
    setLoading(true);
    const data = await fetchCNPJData(form.cnpj);
    if (data) {
      setForm((prev: any) => ({
        ...prev,
        company_name: data.nome_fantasia || data.razao_social,
        company_address: data.logradouro,
        company_city: `${data.municipio} - ${data.uf}`,
        company_neighborhood: data.bairro,
        company_number: data.numero,
        company_email: data.email,
        company_phone: data.ddd_telefone_1,
      }));
      toast.success('Dados encontrados!');
    } else {
      toast.error('CNPJ não encontrado');
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-onboarding', { body: form });
      if (error) throw error;
      setSubmitted(true);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Solicitação Enviada!</h2>
          <p className="text-muted-foreground">Nossa equipe analisará e entrará em contato em breve.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div className="space-y-2">
            <Progress value={(step / STEPS.length) * 100} />
            <p className="text-sm text-muted-foreground">Passo {step} de {STEPS.length}: {STEPS[step-1].title}</p>
          </div>

          <div className="min-h-[400px]">
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Como você atua no mercado?</h2>
                {[
                  { id: 'corretor', label: 'Corretor Autônomo', icon: User },
                  { id: 'imobiliaria', label: 'Imobiliária / Agência', icon: Building2 },
                  { id: 'incorporadora', label: 'Incorporadora / Construtora', icon: Construction },
                ].map(item => (
                  <button key={item.id} onClick={() => updateField('segment', item.id)} className={`w-full p-4 border rounded-xl flex items-center gap-4 transition ${form.segment === item.id ? 'border-primary bg-primary/5' : 'hover:border-primary'}`}>
                    <item.icon className="w-8 h-8 text-primary" />
                    <span className="font-semibold">{item.label}</span>
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Dados Pessoais</h2>
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input value={form.responsible_name} onChange={(e) => updateField('responsible_name', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input value={form.responsible_email} onChange={(e) => updateField('responsible_email', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input value={form.responsible_cpf} onChange={(e) => updateField('responsible_cpf', maskCPF(e.target.value))} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Dados da Organização</h2>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <div className="flex gap-2">
                    <Input value={form.cnpj} onChange={(e) => updateField('cnpj', maskCNPJ(e.target.value))} />
                    <Button onClick={handleCNPJLookup} disabled={loading}>Buscar</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nome da Empresa</Label>
                  <Input value={form.company_name} onChange={(e) => updateField('company_name', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input value={form.company_address} onChange={(e) => updateField('company_address', e.target.value)} />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Personalização</h2>
                <div className="space-y-2">
                  <Label>Título do Site</Label>
                  <Input value={form.site_title} onChange={(e) => updateField('site_title', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Cor Principal</Label>
                  <Input type="color" value={form.primary_color} onChange={(e) => updateField('primary_color', e.target.value)} />
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Redes Sociais</h2>
                <div className="space-y-2">
                  <Label>Instagram</Label>
                  <Input value={form.instagram} onChange={(e) => updateField('instagram', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn</Label>
                  <Input value={form.linkedin} onChange={(e) => updateField('linkedin', e.target.value)} />
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Confirmação</h2>
                <p>Revise seus dados antes de enviar.</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-between">
            <Button variant="outline" disabled={step === 1} onClick={handleBack}><ChevronLeft className="mr-2" /> Voltar</Button>
            <Button onClick={() => step === STEPS.length ? handleSubmit() : handleNext()}>
              {step === STEPS.length ? 'Enviar Solicitação' : 'Próximo'} {step !== STEPS.length && <ChevronRight className="ml-2" />}
            </Button>
          </div>
        </div>

        <div className="hidden lg:block">
          <Card className="sticky top-8 p-6">
            <h3 className="font-semibold mb-4">Preview</h3>
            <div className="border rounded-xl p-4 bg-muted/20">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                {form.logo_url ? <img src={form.logo_url} className="w-16 h-16 object-cover rounded-full" /> : <Building2 className="w-8 h-8 text-primary" />}
              </div>
              <h4 className="font-bold">{form.company_name || 'Nome da Empresa'}</h4>
              <p className="text-sm text-muted-foreground">{form.segment}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
