import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AutomationList } from '@/components/automations/AutomationList';
import { AutomationEditor } from '@/components/automations/AutomationEditor';
import { FollowUpTemplates } from '@/components/automations/FollowUpTemplates';
import { ExecutionHistory } from '@/components/automations/ExecutionHistory';
import { Zap, MessageSquare, History } from 'lucide-react';

export default function Automations() {
  const [editingAutomationId, setEditingAutomationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('automations');

  // When a follow-up is created, switch to edit mode
  const handleFollowUpCreated = (automationId: string) => {
    setEditingAutomationId(automationId);
  };

  return (
    <AppLayout title={editingAutomationId ? undefined : "Automações"}>
      {editingAutomationId ? (
        <div className="-m-6 h-[calc(100%+48px)]">
          <AutomationEditor
            automationId={editingAutomationId}
            onBack={() => setEditingAutomationId(null)}
          />
        </div>
      ) : (
        <div className="space-y-6 animate-in">
          <p className="text-muted-foreground">
            Crie fluxos de automação para enviar mensagens, mover leads e muito mais
          </p>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex">
              <TabsTrigger value="automations" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Automações</span>
              </TabsTrigger>
              <TabsTrigger value="followup" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Follow-up</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Histórico</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="automations" className="mt-6">
              <AutomationList onEdit={(id) => setEditingAutomationId(id)} />
            </TabsContent>

            <TabsContent value="followup" className="mt-6">
              <FollowUpTemplates onCreateFromTemplate={handleFollowUpCreated} />
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <ExecutionHistory />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </AppLayout>
  );
}
