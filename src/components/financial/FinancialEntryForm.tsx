import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
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
import { useFinancialCategories, useCreateFinancialEntry, useUpdateFinancialEntry } from '@/hooks/use-financial';
import { useProperties } from '@/hooks/use-properties';
import { useContracts } from '@/hooks/use-contracts';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  type: z.enum(['receivable', 'payable']),
  category_id: z.string().optional(),
  description: z.string().min(1, 'Descrição é obrigatória'),
  value: z.number().min(0.01, 'Valor deve ser maior que zero'),
  due_date: z.string().min(1, 'Data de vencimento é obrigatória'),
  competence_date: z.string().optional(),
  payment_method: z.string().optional(),
  property_id: z.string().optional(),
  contract_id: z.string().optional(),
  related_person_name: z.string().optional(),
  related_person_type: z.string().optional(),
  notes: z.string().optional(),
  has_installments: z.boolean().default(false),
  installments_count: z.number().min(2).max(60).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface FinancialEntryFormProps {
  entry?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function FinancialEntryForm({ entry, onSuccess, onCancel }: FinancialEntryFormProps) {
  const { data: categories } = useFinancialCategories();
  const { data: properties } = useProperties();
  const { data: contracts } = useContracts();
  const createEntry = useCreateFinancialEntry();
  const updateEntry = useUpdateFinancialEntry();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: entry?.type || 'receivable',
      category_id: entry?.category_id || '',
      description: entry?.description || '',
      value: entry?.value || 0,
      due_date: entry?.due_date?.split('T')[0] || '',
      competence_date: entry?.competence_date?.split('T')[0] || '',
      payment_method: entry?.payment_method || '',
      property_id: entry?.property_id || '',
      contract_id: entry?.contract_id || '',
      related_person_name: entry?.related_person_name || '',
      related_person_type: entry?.related_person_type || '',
      notes: entry?.notes || '',
      has_installments: false,
      installments_count: 2,
    },
  });

  const watchType = form.watch('type');
  const watchHasInstallments = form.watch('has_installments');

  const filteredCategories = categories?.filter(c => (watchType === 'receivable' ? 'income' : 'expense') === c.type) || [];

  const onSubmit = async (values: FormValues) => {
    const payload: any = {
      type: values.type,
      category_id: values.category_id || null,
      description: values.description,
      value: values.value,
      due_date: values.due_date,
      competence_date: values.competence_date || null,
      payment_method: values.payment_method || null,
      property_id: values.property_id || null,
      contract_id: values.contract_id || null,
      related_person_name: values.related_person_name || null,
      related_person_type: values.related_person_type || null,
      notes: values.notes || null,
      installments: values.has_installments ? values.installments_count : undefined,
    };

    if (entry) {
      await updateEntry.mutateAsync({ id: entry.id, ...payload });
    } else {
      await createEntry.mutateAsync(payload);
    }
    onSuccess();
  };

  const isLoading = createEntry.isPending || updateEntry.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="receivable">A Receber</SelectItem>
                    <SelectItem value="payable">A Pagar</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Input placeholder="Descrição do lançamento" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor (R$)</FormLabel>
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

          <FormField
            control={form.control}
            name="due_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vencimento</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="competence_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Competência</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="payment_method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Forma de Pagamento</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="transfer">Transferência</SelectItem>
                    <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                    <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="property_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Imóvel (opcional)</FormLabel>
                <Select onValueChange={(val) => field.onChange(val === 'none' ? '' : val)} value={field.value || 'none'}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {properties?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} - {p.title || p.endereco}
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
            name="contract_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contrato (opcional)</FormLabel>
                <Select onValueChange={(val) => field.onChange(val === 'none' ? '' : val)} value={field.value || 'none'}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {contracts?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.contract_number} - {c.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="related_person_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pessoa Relacionada</FormLabel>
                <FormControl>
                  <Input placeholder="Nome" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="related_person_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Pessoa</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="client">Cliente</SelectItem>
                    <SelectItem value="broker">Corretor</SelectItem>
                    <SelectItem value="supplier">Fornecedor</SelectItem>
                    <SelectItem value="owner">Proprietário</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {!entry && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <FormField
              control={form.control}
              name="has_installments"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Parcelar este lançamento</FormLabel>
                    <FormDescription className="text-xs">
                      O valor será dividido em parcelas mensais
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {watchHasInstallments && (
              <FormField
                control={form.control}
                name="installments_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Parcelas</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={2} 
                        max={60}
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value) || 2)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

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

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {entry ? 'Salvar' : 'Criar Lançamento'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
