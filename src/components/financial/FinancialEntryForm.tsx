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
import { useCreateFinancialEntry, useUpdateFinancialEntry } from '@/hooks/use-financial';
import { useProperties } from '@/hooks/use-properties';
import { useContracts } from '@/hooks/use-contracts';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  type: z.enum(['receita', 'despesa']),
  category: z.string().optional(),
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  due_date: z.string().min(1, 'Data de vencimento é obrigatória'),
  payment_method: z.string().optional(),
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
  const { data: properties } = useProperties();
  const { data: contracts } = useContracts();
  const createEntry = useCreateFinancialEntry();
  const updateEntry = useUpdateFinancialEntry();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: entry?.type || 'receita',
      category: entry?.category || '',
      description: entry?.description || '',
      amount: entry?.amount || 0,
      due_date: entry?.due_date?.split('T')[0] || '',
      payment_method: entry?.payment_method || '',
      notes: entry?.notes || '',
      has_installments: false,
      installments_count: 2,
    },
  });

  const watchType = form.watch('type');
  const watchHasInstallments = form.watch('has_installments');

  const categories = watchType === 'receita' 
    ? ['Comissão', 'Aluguel', 'Taxa de administração', 'Outros']
    : ['Marketing', 'Operacional', 'Pessoal', 'Impostos', 'Outros'];

  const onSubmit = async (values: FormValues) => {
    const payload = {
      type: values.type,
      category: values.category || null,
      description: values.description,
      amount: values.amount,
      due_date: values.due_date,
      payment_method: values.payment_method || null,
      notes: values.notes || null,
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
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
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
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
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
            name="amount"
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
