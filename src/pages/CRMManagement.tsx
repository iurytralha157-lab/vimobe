import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shuffle, Users, Tags, GitBranch, LucideIcon } from 'lucide-react';
import { TeamPipelinesManager } from '@/components/teams/TeamPipelinesManager';
import { useIsMobile } from '@/hooks/use-mobile';

// Tab components
import { DistributionTab } from '@/components/crm-management/DistributionTab';
import { TeamsTab } from '@/components/crm-management/TeamsTab';
import { TagsTab } from '@/components/crm-management/TagsTab';
import { TabIntroCard } from '@/components/crm-management/TabIntroCard';

interface TabItem {
  value: string;
  label: string;
  icon: LucideIcon;
}

// Intro card content for each tab
const tabIntros: Record<string, { title: string; description: string; tips?: string[] }> = {
  teams: {
    title: 'Organize sua equipe',
    description: 'Crie times de corretores e defina líderes para acompanhar o desempenho de cada grupo.',
    tips: [
      'Líderes têm acesso a todos os leads das pipelines vinculadas',
      'Membros só veem seus próprios leads',
    ],
  },
  pipelines: {
    title: 'Vincule pipelines às equipes',
    description: 'Conecte cada pipeline a uma ou mais equipes para controlar quem pode visualizar os negócios.',
    tips: [
      'Uma pipeline pode estar vinculada a múltiplas equipes',
      'Equipes sem vínculos não verão leads no Kanban',
    ],
  },
  distribution: {
    title: 'Distribuição automática de leads',
    description: 'Configure regras de round-robin para distribuir leads automaticamente entre os corretores disponíveis.',
    tips: [
      'Leads são distribuídos com base em disponibilidade e regras',
      'Você pode criar filas por origem, cidade ou outros critérios',
      'Ative a redistribuição nas configurações avançadas de cada fila para reatribuir leads sem contato',
    ],
  },
  tags: {
    title: 'Organize leads com tags',
    description: 'Crie etiquetas coloridas para categorizar e filtrar leads de forma rápida.',
    tips: [
      'Tags aparecem no Kanban e na lista de contatos',
      'Use para marcar prioridade, interesse ou qualquer critério',
    ],
  },
};

export default function CRMManagement() {
  const [activeTab, setActiveTab] = useState('teams');
  const isMobile = useIsMobile();

  const managementTabs: TabItem[] = useMemo(() => [
    { value: 'teams', label: 'Equipes', icon: Users },
    { value: 'pipelines', label: 'Pipelines', icon: GitBranch },
    { value: 'distribution', label: 'Distribuição', icon: Shuffle },
    { value: 'tags', label: 'Tags', icon: Tags },
  ], []);

  const currentTab = managementTabs.find(tab => tab.value === activeTab);
  const CurrentIcon = currentTab?.icon;
  const currentIntro = tabIntros[activeTab];

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
              {managementTabs.map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="gap-2 px-5 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          )}

          {/* Intro card for current tab */}
          {currentIntro && CurrentIcon && (
            <TabIntroCard
              id={activeTab}
              icon={CurrentIcon}
              title={currentIntro.title}
              description={currentIntro.description}
              tips={currentIntro.tips}
            />
          )}

          <TabsContent value="teams" className="mt-4">
            <TeamsTab />
          </TabsContent>

          <TabsContent value="pipelines" className="mt-4">
            <TeamPipelinesManager />
          </TabsContent>

          <TabsContent value="distribution" className="mt-4">
            <DistributionTab />
          </TabsContent>

          <TabsContent value="tags" className="mt-4">
            <TagsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
