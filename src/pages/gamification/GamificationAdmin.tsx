import { GamificationSettings } from '@/components/gamification/GamificationSettings';

export default function GamificationAdmin() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Gestão de Gamificação</h2>
        <p className="text-muted-foreground">Configure as regras de pontuação e missões para sua equipe.</p>
      </div>

      <GamificationSettings />
    </div>
  );
}
