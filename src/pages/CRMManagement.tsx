import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shuffle, Users, Timer, Tags, GitBranch, LucideIcon } from 'lucide-react';
import { TeamPipelinesManager } from '@/components/teams/TeamPipelinesManager';
import { useIsMobile } from '@/hooks/use-mobile';

// Distribuição components
import { DistributionTab } from '@/components/crm-management/DistributionTab';
// Equipes components  
import { TeamsTab } from '@/components/crm-management/TeamsTab';
// Bolsão component
import { PoolTab } from '@/components/crm-management/PoolTab';
// Tags component
import { TagsTab } from '@/components/crm-management/TagsTab';

interface TabItem {
  value: string;
  label: string;
  icon: LucideIcon;
}

export default function CRMManagement() {
  const [activeTab, setActiveTab] = useState('teams');
  const isMobile = useIsMobile();

  const managementTabs: TabItem[] = useMemo(() => [
    { value: 'teams', label: 'Equipes', icon: Users },
    { value: 'pipelines', label: 'Pipelines', icon: GitBranch },
    { value: 'distribution', label: 'Distribuição', icon: Shuffle },
    { value: 'pool', label: 'Bolsão', icon: Timer },
    { value: 'tags', label: 'Tags', icon: Tags },
  ], []);

  const currentTab = managementTabs.find(tab => tab.value === activeTab);
  const CurrentIcon = currentTab?.icon;

  return (
    <AppLayout title="Gestão">
      <div className="space-y-6 animate-in">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {isMobile ? (
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {CurrentIcon && <CurrentIcon className="h-4 w-4" />}
                    <span>{currentTab?.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {managementTabs.map(tab => (
                  <SelectItem key={tab.value} value={tab.value}>
                    <div className="flex items-center gap-2">
                      <tab.icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <TabsList className="inline-flex h-11 p-1 bg-muted/50 rounded-xl">
              <TabsTrigger 
                value="teams" 
                className="gap-2 px-5 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                <Users className="h-4 w-4" />
                Equipes
              </TabsTrigger>
              <TabsTrigger 
                value="pipelines" 
                className="gap-2 px-5 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                <GitBranch className="h-4 w-4" />
                Pipelines
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
              <TabsTrigger 
                value="tags" 
                className="gap-2 px-5 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                <Tags className="h-4 w-4" />
                Tags
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="teams" className="mt-0">
            <TeamsTab />
          </TabsContent>

          <TabsContent value="pipelines" className="mt-0">
            <TeamPipelinesManager />
          </TabsContent>

          <TabsContent value="distribution" className="mt-0">
            <DistributionTab />
          </TabsContent>

          <TabsContent value="pool" className="mt-0">
            <PoolTab />
          </TabsContent>

          <TabsContent value="tags" className="mt-0">
            <TagsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
