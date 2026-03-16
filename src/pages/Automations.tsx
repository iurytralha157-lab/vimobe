import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AutomationList } from '@/components/automations/AutomationList';
import { FollowUpTemplates, FollowUpTemplate } from '@/components/automations/FollowUpTemplates';
import { FollowUpBuilder } from '@/components/automations/FollowUpBuilder';
import { FollowUpBuilderEdit } from '@/components/automations/FollowUpBuilderEdit';
import { ExecutionHistory } from '@/components/automations/ExecutionHistory';
import { LayoutGrid, Zap, History } from 'lucide-react';
import { useAutomations } from '@/hooks/use-automations';
import { Badge } from '@/components/ui/badge';

type ViewMode = 'list' | 'build-followup' | 'edit-existing';

export default function Automations() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingAutomationId, setEditingAutomationId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<FollowUpTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<string>('templates');
  const [historyAutomationId, setHistoryAutomationId] = useState<string | undefined>(undefined);
  const { data: automations } = useAutomations();

  useEffect(() => {
    if (automations && automations.length > 0) {
      setActiveTab('automations');
    }
  }, [automations]);

  const handleEditAutomation = (automationId: string) => {
    setEditingAutomationId(automationId);
    setViewMode('edit-existing');
  };

  const handleSelectTemplate = (template: FollowUpTemplate | null) => {
    setSelectedTemplate(template);
    setViewMode('build-followup');
  };

  const handleComplete = () => {
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

  const handleViewHistory = (automationId: string) => {
    setHistoryAutomationId(automationId);
    setActiveTab('history');
  };

  if (viewMode === 'build-followup') {
    return (
      <AppLayout title={undefined}>
        <div className="-m-6 h-[calc(100%+48px)]">
          <FollowUpBuilder
            onBack={handleBack}
            onComplete={handleComplete}
            initialTemplate={selectedTemplate ? {
              name: selectedTemplate.name,
              messages: selectedTemplate.messages.map((m) => ({ day: m.day, content: m.content })),
              onReplyMessage: selectedTemplate.onReplyMessage,
            } : null}
          />
        </div>
      </AppLayout>
    );
  }

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

  return (
    <AppLayout title="Automações">
      <div className="space-y-6 animate-in">
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v);
            if (v !== 'history') setHistoryAutomationId(undefined);
          }}
          className="w-full"
        >
          <TabsList className="inline-flex h-11 p-1 bg-muted/50 rounded-xl">
            <TabsTrigger value="templates" className="gap-2 px-5 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
              <LayoutGrid className="h-4 w-4" />
              Modelos
            </TabsTrigger>
            <TabsTrigger value="automations" className="gap-2 px-5 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
              <Zap className="h-4 w-4" />
              Minhas Automações
              {automations && automations.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 min-w-[18px] text-center">
                  {automations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 px-5 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-6">
            <FollowUpTemplates onSelectTemplate={handleSelectTemplate} />
          </TabsContent>

          <TabsContent value="automations" className="mt-6">
            <AutomationList onEdit={handleEditAutomation} onViewHistory={handleViewHistory} />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <ExecutionHistory automationId={historyAutomationId} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
