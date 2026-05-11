import { GamificationSettings } from '@/components/gamification/GamificationSettings';
import { MissionManager } from '@/components/gamification/MissionManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Flame } from 'lucide-react';

export default function GamificationAdmin() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Gestão de Gamificação</h2>
        <p className="text-muted-foreground">Configure as regras de pontuação e missões para sua equipe.</p>
      </div>

      <Tabs defaultValue="regras" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="regras" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" /> Regras de Pontuação
          </TabsTrigger>
          <TabsTrigger value="missões" className="flex items-center gap-2">
            <Flame className="h-4 w-4" /> Missões Automáticas
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="regras">
          <GamificationSettings />
        </TabsContent>
        
        <TabsContent value="missões">
          <MissionManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}