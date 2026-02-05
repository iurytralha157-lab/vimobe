import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AutomationList } from '@/components/automations/AutomationList';
import { AutomationEditor } from '@/components/automations/AutomationEditor';
import { FollowUpTemplates, FollowUpTemplate } from '@/components/automations/FollowUpTemplates';
import { FollowUpBuilder } from '@/components/automations/FollowUpBuilder';
import { ExecutionHistory } from '@/components/automations/ExecutionHistory';
import { Zap, MessageSquare, History } from 'lucide-react';

type ViewMode = 'list' | 'edit-automation' | 'build-followup';

export default function Automations() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingAutomationId, setEditingAutomationId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<FollowUpTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<string>('automations');

  const handleEditAutomation = (automationId: string) => {
    setEditingAutomationId(automationId);
    setViewMode('edit-automation');
  };

  const handleSelectTemplate = (template: FollowUpTemplate | null) => {
    setSelectedTemplate(template);
    setViewMode('build-followup');
  };

  const handleFollowUpComplete = (automationId: string) => {
    setViewMode('list');
    setActiveTab('automations');
    setSelectedTemplate(null);
  };

  const handleBack = () => {
    setViewMode('list');
    setEditingAutomationId(null);
    setSelectedTemplate(null);
  };

  // Follow-up Builder (full screen)
  if (viewMode === 'build-followup') {
    return (
      <AppLayout title={undefined}>
        <div className="-m-6 h-[calc(100%+48px)]">
          <FollowUpBuilder
            onBack={handleBack}
            onComplete={handleFollowUpComplete}
            initialTemplate={selectedTemplate ? {
              name: selectedTemplate.name,
              messages: selectedTemplate.messages.map(m => ({ day: m.day, content: m.content })),
            } : null}
          />
        </div>
      </AppLayout>
    );
  }

  // Automation Editor (full screen)
  if (viewMode === 'edit-automation' && editingAutomationId) {
    return (
      <AppLayout title={undefined}>
        <div className="-m-6 h-[calc(100%+48px)]">
          <AutomationEditor
            automationId={editingAutomationId}
            onBack={handleBack}
          />
        </div>
      </AppLayout>
    );
  }

  // List view
  return (
    <AppLayout title="Automações">
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
            <AutomationList onEdit={handleEditAutomation} />
          </TabsContent>

          <TabsContent value="followup" className="mt-6">
            <FollowUpTemplates onSelectTemplate={handleSelectTemplate} />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <ExecutionHistory />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
