import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shuffle, Users, Timer } from 'lucide-react';

// Distribuição components
import { DistributionTab } from '@/components/crm-management/DistributionTab';
// Equipes components  
import { TeamsTab } from '@/components/crm-management/TeamsTab';
// Bolsão component
import { PoolTab } from '@/components/crm-management/PoolTab';

export default function CRMManagement() {
  const [activeTab, setActiveTab] = useState('teams');

  return (
    <AppLayout title="Gestão">
      <div className="space-y-6 animate-in">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="inline-flex h-11 p-1 bg-muted/50 rounded-xl">
            <TabsTrigger 
              value="teams" 
              className="gap-2 px-5 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              <Users className="h-4 w-4" />
              Equipes
            </TabsTrigger>
            <TabsTrigger 
              value="distribution" 
              className="gap-2 px-5 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              <Shuffle className="h-4 w-4" />
              Distribuição
            </TabsTrigger>
            <TabsTrigger 
              value="pool" 
              className="gap-2 px-5 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              <Timer className="h-4 w-4" />
              Bolsão
            </TabsTrigger>
          </TabsList>

          <TabsContent value="teams" className="mt-0">
            <TeamsTab />
          </TabsContent>

          <TabsContent value="distribution" className="mt-0">
            <DistributionTab />
          </TabsContent>

          <TabsContent value="pool" className="mt-0">
            <PoolTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
