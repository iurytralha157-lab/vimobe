import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AutomationList } from '@/components/automations/AutomationList';
import { FollowUpTemplates, FollowUpTemplate } from '@/components/automations/FollowUpTemplates';
import { FollowUpBuilder } from '@/components/automations/FollowUpBuilder';
import { FollowUpBuilderEdit } from '@/components/automations/FollowUpBuilderEdit';
import { ExecutionHistory } from '@/components/automations/ExecutionHistory';
import { LayoutGrid, Zap, History } from 'lucide-react';

type ViewMode = 'list' | 'build-followup' | 'edit-existing';

export default function Automations() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingAutomationId, setEditingAutomationId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<FollowUpTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<string>('templates');

  const handleEditAutomation = (automationId: string) => {
    setEditingAutomationId(automationId);
    setViewMode('edit-existing');
  };

  const handleSelectTemplate = (template: FollowUpTemplate | null) => {
    setSelectedTemplate(template);
    setViewMode('build-followup');
  };

  const handleComplete = (automationId: string) => {
    setViewMode('list');
    setActiveTab('automations');
    setSelectedTemplate(null);
    setEditingAutomationId(null);
  };

  const handleBack = () => {
    setViewMode('list');
    setEditingAutomationId(null);
    setSelectedTemplate(null);
  };

  // Follow-up Builder (full screen) - Creating new
  if (viewMode === 'build-followup') {
    return (
      <AppLayout title={undefined}>
        <div className="-m-6 h-[calc(100%+48px)]">
          <FollowUpBuilder
            onBack={handleBack}
            onComplete={handleComplete}
            initialTemplate={selectedTemplate ? {
              name: selectedTemplate.name,
              messages: selectedTemplate.messages.map(m => ({ day: m.day, content: m.content })),
            } : null}
          />
        </div>
      </AppLayout>
    );
  }

  // Follow-up Builder Edit (full screen) - Editing existing
  if (viewMode === 'edit-existing' && editingAutomationId) {
    return (
      <AppLayout title={undefined}>
        <div className="-m-6 h-[calc(100%+48px)]">
          <FollowUpBuilderEdit
            automationId={editingAutomationId}
            onBack={handleBack}
            onComplete={handleComplete}
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
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Modelos</span>
            </TabsTrigger>
            <TabsTrigger value="automations" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Minhas Automações</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Histórico</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-6">
            <FollowUpTemplates onSelectTemplate={handleSelectTemplate} />
          </TabsContent>

          <TabsContent value="automations" className="mt-6">
            <AutomationList onEdit={handleEditAutomation} />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <ExecutionHistory />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
