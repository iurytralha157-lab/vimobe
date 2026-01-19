import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AutomationList } from '@/components/automations/AutomationList';
import { AutomationEditor } from '@/components/automations/AutomationEditor';

export default function Automations() {
  const [editingAutomationId, setEditingAutomationId] = useState<string | null>(null);

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
          <AutomationList onEdit={(id) => setEditingAutomationId(id)} />
        </div>
      )}
    </AppLayout>
  );
}
