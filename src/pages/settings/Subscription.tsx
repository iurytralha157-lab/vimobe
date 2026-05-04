import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreditCard, Calendar, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Database } from "@/integrations/supabase/types";

type Organization = Database["public"]["Tables"]["organizations"]["Row"] & {
  next_billing_date?: string | null;
  subscription_value?: number | null;
};

type Organization = Database["public"]["Tables"]["organizations"]["Row"] & {
  next_billing_date?: string | null;
  subscription_value?: number | null;
};

type Subscription = {
  id: string;
  organization_id: string;
  amount: number;
  due_date: string;
  status: string | null;
  payment_method: string | null;
  invoice_url: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

const SubscriptionSettings = () => {
  const { profile } = useAuth();

  const { data: org, isLoading: isLoadingOrg } = useQuery({
    queryKey: ["organization", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile?.organization_id)
        .single();
      if (error) throw error;
      return data as Organization;
    },
    enabled: !!profile?.organization_id,
  });

  const { data: subscriptions, isLoading: isLoadingSubs } = useQuery({
    queryKey: ["organization_subscriptions", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_subscriptions" as any)
        .select("*")
        .eq("organization_id", profile?.organization_id)
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data as Subscription[];
    },
    enabled: !!profile?.organization_id,
  });

  if (isLoadingOrg || isLoadingSubs) {
    return (
      <div className="container mx-auto py-6 space-y-6 animate-pulse">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500 text-white"><CheckCircle2 className="w-3 h-3 mr-1" /> Pago</Badge>;
      case "pending":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><AlertCircle className="w-3 h-3 mr-1" /> Pendente</Badge>;
      case "canceled":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status || "Desconhecido"}</Badge>;
    }
  };

  const handlePayment = () => {
    if (org?.checkout_token) {
      window.open(`/checkout/${org.checkout_token}`, "_blank");
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assinatura do Sistema</h1>
        <p className="text-muted-foreground">
          Gerencie o plano e faturamento da sua imobiliária na plataforma.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximo Vencimento</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {org?.next_billing_date 
                ? format(new Date(org.next_billing_date), "dd 'de' MMMM, yyyy", { locale: ptBR })
                : "A definir"}
            </div>
            <p className="text-xs text-muted-foreground">
              Sua mensalidade é cobrada mensalmente.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor da Mensalidade</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(org?.subscription_value || 0))}
            </div>
            <div className="mt-4">
              <Button 
                onClick={handlePayment} 
                className="w-full bg-primary hover:bg-primary/90"
                disabled={!org?.checkout_token}
              >
                Pagar Agora <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Mensalidades</CardTitle>
          <CardDescription>
            Confira abaixo as faturas recentes e o status de cada uma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions && subscriptions.length > 0 ? (
                subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>{sub.due_date ? format(new Date(sub.due_date), "dd/MM/yyyy") : "---"}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(sub.amount))}
                    </TableCell>
                    <TableCell>{getStatusBadge(sub.status)}</TableCell>
                    <TableCell className="text-right">
                      {sub.status === "pending" && (
                        <Button variant="outline" size="sm" onClick={handlePayment}>
                          Pagar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhuma mensalidade encontrada no histórico.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionSettings;
