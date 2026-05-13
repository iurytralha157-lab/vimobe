import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, MessageSquare, Smartphone, Monitor, History, BarChart3, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { NotificationSettings } from '@/components/admin/settings/NotificationSettings';
import { NotificationLogsTable } from '@/components/admin/notifications/NotificationLogsTable';

export default function AdminNotifications() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <AdminLayout title="Gestão de Notificações Sistêmicas">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Central de Notificações</h2>
            <p className="text-sm text-muted-foreground">
              Gerencie templates, logs e canais de disparos operacionais
            </p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar templates ou logs..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Tabs defaultValue="templates" className="space-y-4">
          <TabsList className="grid grid-cols-2 md:grid-cols-7 h-auto p-1 bg-muted/50 border">
            <TabsTrigger value="templates" className="flex items-center gap-2 py-2">
              <Bell className="h-4 w-4" />
              <span className="hidden md:inline">Templates</span>
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2 py-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden md:inline">WhatsApp</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2 py-2">
              <Monitor className="h-4 w-4" />
              <span className="hidden md:inline">Sistema</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2 py-2">
              <Bell className="h-4 w-4" />
              <span className="hidden md:inline">Eventos</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2 py-2">
              <History className="h-4 w-4" />
              <span className="hidden md:inline">Logs</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 py-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden md:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <NotificationSettings />
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Disparos</CardTitle>
                <CardDescription>
                  Rastreabilidade técnica de todas as notificações enviadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NotificationLogsTable />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Performance de Notificações</CardTitle>
                <CardDescription>
                  Taxas de entrega, falha e volume por canal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-center justify-center bg-muted/20 rounded-lg">
                  <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
