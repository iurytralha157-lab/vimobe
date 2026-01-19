import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ContractStatusBadge } from '@/components/financial/ContractStatusBadge';
import { ContractForm } from '@/components/financial/ContractForm';
import { useContracts, useActivateContract, useDeleteContract } from '@/hooks/use-contracts';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatCurrency, formatDate, exportToExcel, prepareContractsExport } from '@/lib/export-financial';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  CheckCircle2, 
  Pencil, 
  Trash2, 
  Download,
  Filter,
  PlayCircle,
  Eye,
  Building2,
  User,
  Calendar,
  SlidersHorizontal
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Mobile Contract Card
function ContractCard({ contract, onActivate, onEdit, onDelete }: {
  contract: any;
  onActivate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      sale: 'Venda',
      rent: 'Locação',
      service: 'Serviço',
    };
    return types[type] || type;
  };

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs shrink-0">
                {contract.contract_number}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {getTypeLabel(contract.type)}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium text-sm truncate">{contract.client_name}</span>
            </div>
            {contract.client_email && (
              <p className="text-xs text-muted-foreground ml-6">{contract.client_email}</p>
            )}
          </div>
          <ContractStatusBadge status={contract.status} />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          {contract.property?.code && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              {contract.property.code}
            </div>
          )}
          {contract.start_date && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDate(contract.start_date)}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          <p className="font-bold text-primary">{formatCurrency(contract.total_value)}</p>
          <div className="flex items-center gap-2">
            {contract.status === 'draft' && (
              <Button variant="outline" size="sm" onClick={onActivate}>
                <PlayCircle className="h-4 w-4 mr-1" />
                Ativar
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Contracts() {
  const isMobile = useIsMobile();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: contracts, isLoading } = useContracts({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
  });

  const activateContract = useActivateContract();
  const deleteContract = useDeleteContract();

  const filteredContracts = contracts?.filter(contract => 
    contract.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contract.contract_number.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleExport = () => {
    if (!filteredContracts.length) {
      toast.error('Nenhum dado para exportar');
      return;
    }
    const data = prepareContractsExport(filteredContracts);
    exportToExcel(data, `contratos-${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('Arquivo exportado com sucesso');
  };

  const handleActivate = async (id: string) => {
    if (confirm('Tem certeza que deseja ativar este contrato? Isso irá gerar as parcelas e comissões automaticamente.')) {
      await activateContract.mutateAsync(id);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este contrato?')) {
      await deleteContract.mutateAsync(id);
    }
  };

  const handleEdit = (contract: any) => {
    setEditingContract(contract);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingContract(null);
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      sale: 'Venda',
      rent: 'Locação',
      service: 'Serviço',
    };
    return types[type] || type;
  };

  const activeFilterCount = (typeFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

  const FormWrapper = isMobile ? Sheet : Dialog;
  const FormContent = isMobile ? SheetContent : DialogContent;
  const FormHeader = isMobile ? SheetHeader : DialogHeader;
  const FormTitle = isMobile ? SheetTitle : DialogTitle;
  const FormDescription = isMobile ? SheetDescription : DialogDescription;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Contratos</h1>
            <p className="text-sm text-muted-foreground">Gerencie seus contratos de venda e locação</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size={isMobile ? "sm" : "default"} onClick={handleExport}>
              <Download className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            <Button size={isMobile ? "sm" : "default"} onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Novo Contrato</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar..." 
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {isMobile ? (
                <Button 
                  variant="outline" 
                  onClick={() => setShowFilters(!showFilters)}
                  className="w-full sm:w-auto"
                >
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filtros
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>
                  )}
                </Button>
              ) : (
                <>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="sale">Venda</SelectItem>
                      <SelectItem value="rent">Locação</SelectItem>
                      <SelectItem value="service">Serviço</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="finished">Encerrado</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>

            {/* Mobile Filters Expanded */}
            {isMobile && showFilters && (
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="sale">Venda</SelectItem>
                    <SelectItem value="rent">Locação</SelectItem>
                    <SelectItem value="service">Serviço</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">Todos status</SelectItem>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="finished">Encerrado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 md:h-12" />)}
          </div>
        ) : isMobile ? (
          // Mobile Cards
          <div>
            {filteredContracts.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum contrato encontrado
                </CardContent>
              </Card>
            ) : (
              filteredContracts.map((contract) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  onActivate={() => handleActivate(contract.id)}
                  onEdit={() => handleEdit(contract)}
                  onDelete={() => handleDelete(contract.id)}
                />
              ))
            )}
          </div>
        ) : (
          // Desktop Table
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Imóvel</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Início</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhum contrato encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell className="font-medium">{contract.contract_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{contract.client_name}</p>
                            {contract.client_email && (
                              <p className="text-xs text-muted-foreground">{contract.client_email}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getTypeLabel(contract.type)}</TableCell>
                        <TableCell>
                          {contract.property?.code || '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(contract.total_value)}
                        </TableCell>
                        <TableCell>
                          <ContractStatusBadge status={contract.status} />
                        </TableCell>
                        <TableCell>{formatDate(contract.start_date)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              {contract.status === 'draft' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleActivate(contract.id)}>
                                    <PlayCircle className="h-4 w-4 mr-2" />
                                    Ativar Contrato
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem onClick={() => handleEdit(contract)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDelete(contract.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Form Dialog/Sheet */}
        {isMobile ? (
          <Sheet open={isFormOpen} onOpenChange={(open: boolean) => {
            setIsFormOpen(open);
            if (!open) setEditingContract(null);
          }}>
            <SheetContent side="bottom" className="w-full h-[90vh]">
              <SheetHeader>
                <SheetTitle>{editingContract ? 'Editar Contrato' : 'Novo Contrato'}</SheetTitle>
                <SheetDescription>
                  {editingContract ? 'Altere os dados do contrato' : 'Preencha os dados do novo contrato'}
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="h-[calc(90vh-100px)]">
                <div className="px-1">
                  <ContractForm
                    contract={editingContract}
                    onSuccess={handleFormSuccess}
                    onCancel={() => {
                      setIsFormOpen(false);
                      setEditingContract(null);
                    }}
                  />
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        ) : (
          <Dialog open={isFormOpen} onOpenChange={(open: boolean) => {
            setIsFormOpen(open);
            if (!open) setEditingContract(null);
          }}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingContract ? 'Editar Contrato' : 'Novo Contrato'}</DialogTitle>
                <DialogDescription>
                  {editingContract ? 'Altere os dados do contrato' : 'Preencha os dados do novo contrato'}
                </DialogDescription>
              </DialogHeader>
              <ContractForm
                contract={editingContract}
                onSuccess={handleFormSuccess}
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingContract(null);
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
}
