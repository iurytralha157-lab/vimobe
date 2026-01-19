import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shuffle, Users, ListTodo, Tags as TagsIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

// Distribuição components
import { DistributionTab } from '@/components/crm-management/DistributionTab';
// Equipes components  
import { TeamsTab } from '@/components/crm-management/TeamsTab';
// Cadências components
import { CadencesTab } from '@/components/crm-management/CadencesTab';
// Tags components
import { TagsTab } from '@/components/crm-management/TagsTab';

export default function CRMManagement() {
  const [activeTab, setActiveTab] = useState('distribution');
  const isMobile = useIsMobile();

  return (
    <AppLayout title="Gestão">
      <div className="space-y-4 md:space-y-6 animate-in">
        <p className="text-muted-foreground text-sm md:text-base">
          Gerencie distribuição, equipes, cadências e tags
        </p>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl h-auto p-1">
            <TabsTrigger value="distribution" className="gap-1.5 md:gap-2 px-2 md:px-4 py-2 text-xs md:text-sm">
              <Shuffle className="h-4 w-4" />
              <span className="hidden sm:inline">Distribuição</span>
              <span className="sm:hidden">Dist.</span>
            </TabsTrigger>
            <TabsTrigger value="teams" className="gap-1.5 md:gap-2 px-2 md:px-4 py-2 text-xs md:text-sm">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Equipes</span>
              <span className="sm:hidden">Equipes</span>
            </TabsTrigger>
            <TabsTrigger value="cadences" className="gap-1.5 md:gap-2 px-2 md:px-4 py-2 text-xs md:text-sm">
              <ListTodo className="h-4 w-4" />
              <span className="hidden sm:inline">Cadências</span>
              <span className="sm:hidden">Cadên.</span>
            </TabsTrigger>
            <TabsTrigger value="tags" className="gap-1.5 md:gap-2 px-2 md:px-4 py-2 text-xs md:text-sm">
              <TagsIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Tags</span>
              <span className="sm:hidden">Tags</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="distribution">
            <DistributionTab />
          </TabsContent>

          <TabsContent value="teams">
            <TeamsTab />
          </TabsContent>

          <TabsContent value="cadences">
            <CadencesTab />
          </TabsContent>

          <TabsContent value="tags">
            <TagsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
