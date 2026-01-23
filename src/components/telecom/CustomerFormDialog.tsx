import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useServicePlans } from '@/hooks/use-service-plans';
import { useCoverageUFs, useCoverageCities, useCoverageNeighborhoods } from '@/hooks/use-coverage-areas';
import { useOrganizationUsers } from '@/hooks/use-users';
import { 
  TELECOM_CUSTOMER_STATUSES,
  CHIP_CATEGORIES,
  MESH_REPEATER_OPTIONS,
  type TelecomCustomer, 
  type CreateTelecomCustomerInput 
} from '@/hooks/use-telecom-customers';
import { Checkbox } from '@/components/ui/checkbox';

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: TelecomCustomer | null;
  onSubmit: (data: CreateTelecomCustomerInput) => void;
  isLoading?: boolean;
}

const defaultFormData: CreateTelecomCustomerInput = {
  name: '',
  phone: '',
  email: '',
  cpf_cnpj: '',
  address: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  uf: '',
  cep: '',
  plan_id: null,
  plan_value: null,
  due_day: 10,
  seller_id: null,
  status: 'NOVO',
  installation_date: null,
  contract_date: null,
  chip_category: null,
  chip_quantity: 0,
  mesh_repeater: null,
  mesh_quantity: 0,
  is_combo: false,
  notes: '',
};

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSubmit,
  isLoading,
}: CustomerFormDialogProps) {
  const [formData, setFormData] = useState<CreateTelecomCustomerInput>(defaultFormData);
  const { data: plans = [] } = useServicePlans();
  const { data: users = [] } = useOrganizationUsers();
  
  const coverageUFs = useCoverageUFs();
  const coverageCities = useCoverageCities(formData.uf || '');
  const coverageNeighborhoods = useCoverageNeighborhoods(formData.uf || '', formData.city || '');

  useEffect(() => {
    if (customer) {
      setFormData({
        external_id: customer.external_id,
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email || '',
        cpf_cnpj: customer.cpf_cnpj || '',
        address: customer.address || '',
        number: customer.number || '',
        complement: customer.complement || '',
        neighborhood: customer.neighborhood || '',
        city: customer.city || '',
        uf: customer.uf || '',
        cep: customer.cep || '',
        plan_id: customer.plan_id,
        plan_value: customer.plan_value,
        due_day: customer.due_day || 10,
        seller_id: customer.seller_id,
        status: customer.status,
        installation_date: customer.installation_date,
        contract_date: customer.contract_date,
        chip_category: customer.chip_category,
        chip_quantity: customer.chip_quantity || 0,
        mesh_repeater: customer.mesh_repeater,
        mesh_quantity: customer.mesh_quantity || 0,
        is_combo: customer.is_combo || false,
        notes: customer.notes || '',
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [customer, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handlePlanChange = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    setFormData({
      ...formData,
      plan_id: planId || null,
      plan_value: plan?.price || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{customer ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          <DialogDescription>
            {customer 
              ? 'Altere as informações do cliente.' 
              : 'Cadastre um novo cliente de internet/telecom.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Dados Pessoais */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Dados Pessoais</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome completo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
                  <Input
                    id="cpf_cnpj"
                    value={formData.cpf_cnpj || ''}
                    onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Endereço</h4>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="uf">UF</Label>
                  <Select
                    value={formData.uf || ''}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      uf: value, 
                      city: '', 
                      neighborhood: '' 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {coverageUFs.map(uf => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Select
                    value={formData.city || ''}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      city: value, 
                      neighborhood: '' 
                    })}
                    disabled={!formData.uf}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Cidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {coverageCities.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={formData.cep || ''}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    placeholder="00000-000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Select
                  value={formData.neighborhood || ''}
                  onValueChange={(value) => setFormData({ ...formData, neighborhood: value })}
                  disabled={!formData.city}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o bairro" />
                  </SelectTrigger>
                  <SelectContent>
                    {coverageNeighborhoods.map(n => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Rua, Avenida..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    value={formData.number || ''}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder="123"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={formData.complement || ''}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    placeholder="Apto, Bloco"
                  />
                </div>
              </div>
            </div>

            {/* Plano e Contrato */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Plano e Contrato</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plan_id">Plano</Label>
                  <Select
                    value={formData.plan_id || ''}
                    onValueChange={handlePlanChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.filter(p => p.is_active).map(plan => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.code} - {plan.name} (R$ {plan.price?.toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan_value">Valor do Plano (R$)</Label>
                  <Input
                    id="plan_value"
                    type="number"
                    step="0.01"
                    value={formData.plan_value ?? ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      plan_value: e.target.value ? parseFloat(e.target.value) : null 
                    })}
                    placeholder="99.90"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="due_day">Dia Vencimento</Label>
                  <Select
                    value={String(formData.due_day || 10)}
                    onValueChange={(value) => setFormData({ ...formData, due_day: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 15, 20, 25].map(day => (
                        <SelectItem key={day} value={String(day)}>Dia {day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status || 'NOVO'}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TELECOM_CUSTOMER_STATUSES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contract_date">Data Contratação</Label>
                  <Input
                    id="contract_date"
                    type="date"
                    value={formData.contract_date || ''}
                    onChange={(e) => setFormData({ ...formData, contract_date: e.target.value || null })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="installation_date">Data Instalação</Label>
                  <Input
                    id="installation_date"
                    type="date"
                    value={formData.installation_date || ''}
                    onChange={(e) => setFormData({ ...formData, installation_date: e.target.value || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seller_id">Vendedor</Label>
                  <Select
                    value={formData.seller_id || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, seller_id: value === 'none' ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Equipamentos */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Equipamentos</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chip_category">Categoria do Chip</Label>
                  <Select
                    value={formData.chip_category || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, chip_category: value === 'none' ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {CHIP_CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chip_quantity">Qtd. Chips</Label>
                  <Input
                    id="chip_quantity"
                    type="number"
                    min="0"
                    value={formData.chip_quantity ?? 0}
                    onChange={(e) => setFormData({ ...formData, chip_quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mesh_repeater">Repetidor Mesh</Label>
                  <Select
                    value={formData.mesh_repeater || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, mesh_repeater: value === 'none' ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {MESH_REPEATER_OPTIONS.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mesh_quantity">Qtd. Repetidores</Label>
                  <Input
                    id="mesh_quantity"
                    type="number"
                    min="0"
                    value={formData.mesh_quantity ?? 0}
                    onChange={(e) => setFormData({ ...formData, mesh_quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_combo"
                  checked={formData.is_combo || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_combo: checked === true })}
                />
                <Label htmlFor="is_combo" className="font-normal">Cliente possui Combo</Label>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações sobre o cliente..."
                rows={2}
              />
            </div>
          </form>
        </ScrollArea>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="customer-form" disabled={isLoading}>
            {isLoading ? 'Salvando...' : customer ? 'Salvar' : 'Cadastrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
