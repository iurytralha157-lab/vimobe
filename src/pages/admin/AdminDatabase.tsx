import { RefreshCw } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DatabaseUsageCard } from '@/components/admin/DatabaseUsageCard';
import { StorageUsageCard } from '@/components/admin/StorageUsageCard';
import { TablesBreakdown } from '@/components/admin/TablesBreakdown';
import { DatabaseAlerts } from '@/components/admin/DatabaseAlerts';
import { RecordsCountCard } from '@/components/admin/RecordsCountCard';
import { useDatabaseStats } from '@/hooks/use-database-stats';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function AdminDatabase() {
  const { data: stats, isLoading, error, refetch, isFetching } = useDatabaseStats();

  if (error) {
    return (
      <AdminLayout title="Banco de Dados">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-destructive">Erro ao carregar estatísticas: {error.message}</p>
          <Button onClick={() => refetch()}>Tentar novamente</Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Banco de Dados">
      <div className="space-y-6">
        {/* Header with refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Monitoramento do Banco de Dados</h2>
            <p className="text-sm text-muted-foreground">
              Acompanhe o uso de recursos e receba alertas de limites
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : stats ? (
          <>
            {/* Main metrics grid */}
            <div className="grid gap-4 md:grid-cols-3">
              <DatabaseUsageCard
                currentBytes={stats.database_size_bytes}
                currentPretty={stats.database_size_pretty}
                limitGB={8}
              />
              <StorageUsageCard
                currentBytes={stats.storage.size_bytes}
                fileCount={stats.storage.count}
                limitGB={100}
              />
              <RecordsCountCard counts={stats.counts} />
            </div>

            {/* Alerts section */}
            <DatabaseAlerts stats={stats} dbLimitGB={8} storageLimitGB={100} />

            {/* Tables breakdown */}
            <TablesBreakdown 
              tables={stats.tables} 
              totalDatabaseBytes={stats.database_size_bytes} 
            />
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
