import { GamificationSettings } from '@/components/gamification/GamificationSettings';
import { MissionManager } from '@/components/gamification/MissionManager';

export default function GamificationAdmin() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Gestão de Gamificação</h2>
        <p className="text-muted-foreground">Configure as regras de pontuação e missões para sua equipe.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <GamificationSettings />
        <MissionManager />
      </div>
    </div>
  );
}
