import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, MoreHorizontal, Users, GripVertical } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePipelines, useStages } from '@/hooks/use-pipelines';
import { useLeads } from '@/hooks/use-leads';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export default function Pipelines() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: pipelines, isLoading: pipelinesLoading } = usePipelines();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  
  const activePipelineId = selectedPipelineId || pipelines?.[0]?.id;
  const { data: stages, isLoading: stagesLoading } = useStages(activePipelineId);
  const { data: leads, isLoading: leadsLoading } = useLeads();

  const isLoading = pipelinesLoading || stagesLoading || leadsLoading;

  const getLeadsForStage = (stageId: string) => {
    return leads?.filter(lead => lead.stage_id === stageId) || [];
  };

  const handleLeadClick = (leadId: string) => {
    navigate(`/contacts?lead=${leadId}`);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-[500px] w-80 flex-shrink-0" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Pipelines</h1>
            {pipelines && pipelines.length > 1 && (
              <div className="flex gap-2">
                {pipelines.map(pipeline => (
                  <Button
                    key={pipeline.id}
                    variant={activePipelineId === pipeline.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPipelineId(pipeline.id)}
                  >
                    {pipeline.name}
                  </Button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/crm')}>
              <Settings className="h-4 w-4 mr-2" />
              {t('settings.title') || 'Configurações'}
            </Button>
            <Button size="sm" onClick={() => navigate('/contacts?new=true')}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Lead
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4 min-w-max">
            {stages?.map(stage => {
              const stageLeads = getLeadsForStage(stage.id);
              
              return (
                <div
                  key={stage.id}
                  className="w-80 flex-shrink-0"
                >
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: stage.color || '#6b7280' }}
                          />
                          <CardTitle className="text-sm font-medium">
                            {stage.name}
                          </CardTitle>
                          <Badge variant="secondary" className="text-xs">
                            {stageLeads.length}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate('/crm')}>
                              Configurar estágio
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                      {stageLeads.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          Nenhum lead neste estágio
                        </div>
                      ) : (
                        stageLeads.map(lead => (
                          <Card
                            key={lead.id}
                            className={cn(
                              "cursor-pointer hover:shadow-md transition-shadow",
                              "border-l-4"
                            )}
                            style={{ borderLeftColor: stage.color || '#6b7280' }}
                            onClick={() => handleLeadClick(lead.id)}
                          >
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <GripVertical className="h-4 w-4 text-muted-foreground opacity-50" />
                                  <span className="font-medium text-sm truncate max-w-[180px]">
                                    {lead.name}
                                  </span>
                                </div>
                              </div>
                              {lead.email && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {lead.email}
                                </p>
                              )}
                              {lead.phone && (
                                <p className="text-xs text-muted-foreground">
                                  {lead.phone}
                                </p>
                              )}
                              {lead.assigned_user_id && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Users className="h-3 w-3" />
                                  <span>Atribuído</span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </AppLayout>
  );
}
