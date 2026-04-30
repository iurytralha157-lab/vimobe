import { LeaderboardWidget } from '@/components/gamification/LeaderboardWidget';

export default function GamificationRanking() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Ranking Geral</h2>
        <p className="text-muted-foreground">Veja quem são os destaques da imobiliária.</p>
      </div>
      
      <div className="max-w-4xl mx-auto">
        <LeaderboardWidget />
      </div>
    </div>
  );
}
