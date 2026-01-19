import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BrokerSelector, BrokerEntry } from './BrokerSelector';
import { useCreateContract } from '@/hooks/use-contracts';
import { useProperties } from '@/hooks/use-properties';
import { useLeads } from '@/hooks/use-leads';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  contract_type: z.enum(['sale', 'rental', 'service']),
  lead_id: z.string().optional(),
  property_id: z.string().optional(),
  value: z.number().min(0, 'Valor deve ser maior que zero'),
  commission_percentage: z.number().min(0).max(100).optional(),
  commission_value: z.number().min(0).optional(),
  signing_date: z.string().optional(),
  closing_date: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ContractFormProps {
  contract?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ContractForm({ contract, onSuccess, onCancel }: ContractFormProps) {
  const { data: properties } = useProperties();
  const { data: leads } = useLeads();
  const createContract = useCreateContract();

  const [brokers, setBrokers] = useState<BrokerEntry[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contract_type: contract?.contract_type || 'sale',
      lead_id: contract?.lead_id || '',
      property_id: contract?.property_id || '',
      value: contract?.value || 0,
      commission_percentage: contract?.commission_percentage || 0,
      commission_value: contract?.commission_value || 0,
      signing_date: contract?.signing_date?.split('T')[0] || '',
      closing_date: contract?.closing_date?.split('T')[0] || '',
      notes: contract?.notes || '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    const contractData = {
      contract_type: values.contract_type,
      lead_id: values.lead_id || null,
      property_id: values.property_id || null,
      value: values.value,
      commission_percentage: values.commission_percentage || null,
      commission_value: values.commission_value || null,
      signing_date: values.signing_date || null,
      closing_date: values.closing_date || null,
      notes: values.notes || null,
    };

    await createContract.mutateAsync(contractData);
    onSuccess();
  };

  const isLoading = createContract.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Tabs defaultValue="general" className="w-full">
          <ScrollArea className="w-full">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 mb-2">
              <TabsTrigger value="general" className="text-xs sm:text-sm">Geral</TabsTrigger>
              <TabsTrigger value="property" className="text-xs sm:text-sm">Imóvel</TabsTrigger>
              <TabsTrigger value="values" className="text-xs sm:text-sm">Valores</TabsTrigger>
              <TabsTrigger value="brokers" className="text-xs sm:text-sm hidden sm:flex">Corretores</TabsTrigger>
            </TabsList>
          </ScrollArea>

          <TabsContent value="general" className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="contract_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Contrato</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sale">Venda</SelectItem>
                      <SelectItem value="rental">Locação</SelectItem>
                      <SelectItem value="service">Serviço</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="signing_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Assinatura</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="closing_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Fechamento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observações adicionais..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Mobile only: show brokers here */}
            <div className="sm:hidden space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm">Corretores</h4>
              <BrokerSelector brokers={brokers} onChange={setBrokers} />
            </div>
          </TabsContent>

          <TabsContent value="property" className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="property_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imóvel</FormLabel>
                  <Select onValueChange={(val) => field.onChange(val === 'none' ? '' : val)} value={field.value || 'none'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um imóvel..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {properties?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.code} - {p.title || p.endereco || 'Sem título'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lead_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead Vinculado</FormLabel>
                  <Select onValueChange={(val) => field.onChange(val === 'none' ? '' : val)} value={field.value || 'none'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um lead..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {leads?.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name} {l.email ? `- ${l.email}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="values" className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor do Contrato (R$)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      min="0"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="commission_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comissão (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        min="0"
                        max="100"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="commission_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor da Comissão (R$)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          <TabsContent value="brokers" className="pt-2 hidden sm:block">
            <BrokerSelector brokers={brokers} onChange={setBrokers} />
          </TabsContent>
        </Tabs>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {contract ? 'Salvar Alterações' : 'Criar Contrato'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
