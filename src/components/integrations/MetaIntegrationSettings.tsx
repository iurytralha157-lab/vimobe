import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Facebook, 
  Link, 
  Unlink, 
  Settings2, 
  AlertCircle,
  CheckCircle2,
  Users,
  RefreshCw,
  ChevronDown,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { usePipelines } from "@/hooks/use-stages";
import { useStages } from "@/hooks/use-stages";
import {
  useMetaIntegrations,
  useMetaGetAuthUrl,
  useMetaExchangeToken,
  useMetaConnectPage,
  useMetaUpdatePage,
  useMetaDisconnectPage,
  useMetaTogglePage,
  MetaPage,
  MetaIntegration,
} from "@/hooks/use-meta-integration";
import { MetaFormManager } from "./MetaFormManager";
import { useLanguage } from "@/contexts/LanguageContext";

export function MetaIntegrationSettings() {
  const { t } = useLanguage();
  const meta = t.settings.integrations.meta;

  const STATUS_OPTIONS = [
    { value: "novo", label: meta.statusNew },
    { value: "contatado", label: meta.statusContacted },
    { value: "qualificado", label: meta.statusQualified },
    { value: "negociando", label: meta.statusNegotiating },
  ];

  const [searchParams, setSearchParams] = useSearchParams();
  const [isConnecting, setIsConnecting] = useState(false);
  const [availablePages, setAvailablePages] = useState<MetaPage[]>([]);
  const [userToken, setUserToken] = useState("");
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPage, setEditingPage] = useState<string | null>(null);
  const [expandedIntegrations, setExpandedIntegrations] = useState<Set<string>>(new Set());
  
  // Form state
  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedPipelineId, setSelectedPipelineId] = useState("");
  const [selectedStageId, setSelectedStageId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("novo");

  const { data: integrations, isLoading: loadingIntegrations } = useMetaIntegrations();
  const { data: pipelines, isLoading: loadingPipelines } = usePipelines();
  const { data: stages } = useStages(selectedPipelineId || undefined);

  const getAuthUrl = useMetaGetAuthUrl();
  const exchangeToken = useMetaExchangeToken();
  const connectPage = useMetaConnectPage();
  const updatePage = useMetaUpdatePage();
  const disconnectPage = useMetaDisconnectPage();
  const togglePage = useMetaTogglePage();

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get("code");
    if (code && !isConnecting) {
      setIsConnecting(true);
      handleOAuthCallback(code);
    }
  }, [searchParams]);

  const handleOAuthCallback = async (code: string) => {
    try {
      const redirectUri = `${window.location.origin}/settings/integrations/meta`;
      const result = await exchangeToken.mutateAsync({ code, redirectUri });
      
      setAvailablePages(result.pages || []);
      setUserToken(result.user_token);
      setShowPageSelector(true);
      
      // Clear code from URL
      setSearchParams({});
    } catch (error) {
      toast.error(meta.errorConnecting);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = async () => {
    try {
      const redirectUri = `${window.location.origin}/settings/integrations/meta`;
      const result = await getAuthUrl.mutateAsync(redirectUri);
      
      // Open in new tab to bypass iframe restrictions
      const popup = window.open(result.auth_url, '_blank', 'width=600,height=700,scrollbars=yes');
      
      // Fallback if popup was blocked
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        window.location.href = result.auth_url;
      }
    } catch (error) {
      toast.error(meta.errorStarting);
    }
  };

  const handleConnectPage = async () => {
    if (!selectedPageId || !selectedPipelineId || !selectedStageId) {
      toast.error(meta.fillAllFields);
      return;
    }

    await connectPage.mutateAsync({
      pageId: selectedPageId,
      userToken,
      pipelineId: selectedPipelineId,
      stageId: selectedStageId,
      defaultStatus: selectedStatus,
    });

    setShowPageSelector(false);
    resetForm();
  };

  const handleUpdatePage = async () => {
    if (!editingPage || !selectedPipelineId || !selectedStageId) {
      toast.error(meta.fillAllFields);
      return;
    }

    await updatePage.mutateAsync({
      pageId: editingPage,
      pipelineId: selectedPipelineId,
      stageId: selectedStageId,
      defaultStatus: selectedStatus,
    });

    setShowEditDialog(false);
    setEditingPage(null);
    resetForm();
  };

  const openEditDialog = (integration: MetaIntegration) => {
    setEditingPage(integration.page_id);
    setSelectedPipelineId(integration.pipeline_id || "");
    setSelectedStageId(integration.stage_id || "");
    setSelectedStatus(integration.default_status || "novo");
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setSelectedPageId("");
    setSelectedPipelineId("");
    setSelectedStageId("");
    setSelectedStatus("novo");
  };

  const toggleExpanded = (integrationId: string) => {
    setExpandedIntegrations(prev => {
      const next = new Set(prev);
      if (next.has(integrationId)) {
        next.delete(integrationId);
      } else {
        next.add(integrationId);
      }
      return next;
    });
  };

  const filteredStages = stages?.filter(s => s.pipeline_id === selectedPipelineId) || [];

  if (loadingIntegrations) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const hasConnectedPages = integrations && integrations.length > 0;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Facebook className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <CardTitle>{meta.title}</CardTitle>
              <CardDescription>
                {meta.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasConnectedPages ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-orange-500" />
                  <span className="text-sm font-medium text-orange-600">
                    {integrations.length} {meta.pagesConnected}
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {meta.noPageConnected}
                  </span>
                </>
              )}
            </div>
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting || getAuthUrl.isPending}
            >
              {isConnecting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Link className="mr-2 h-4 w-4" />
              )}
              {hasConnectedPages ? meta.addPage : meta.connect}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connected Pages */}
      {hasConnectedPages && (
        <div className="space-y-4">
          {integrations.map((integration) => (
            <Collapsible 
              key={integration.id}
              open={expandedIntegrations.has(integration.id)}
              onOpenChange={() => toggleExpanded(integration.id)}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Facebook className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{integration.page_name}</h4>
                          <Badge variant={integration.is_connected ? "default" : "secondary"}>
                            {integration.is_connected ? t.common.active : t.common.inactive}
                          </Badge>
                        </div>
                        
                        {integration.pipeline_id && (
                          <p className="text-sm text-muted-foreground">
                            {meta.pipelineConfigured} • {meta.status}: {integration.default_status || meta.statusNew}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{integration.leads_received || 0} {meta.leadsReceived}</span>
                          </div>
                          {integration.last_lead_at && (
                            <span className="text-xs text-muted-foreground">
                              {meta.lastLead}: {new Date(integration.last_lead_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {integration.last_error && (
                          <div className="flex items-center gap-1.5 text-sm text-destructive mt-2">
                            <AlertCircle className="h-4 w-4" />
                            <span>{integration.last_error}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          {meta.forms}
                          <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${expandedIntegrations.has(integration.id) ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      
                      <Switch
                        checked={integration.is_connected}
                        onCheckedChange={(checked) => 
                          togglePage.mutate({ pageId: integration.page_id!, isActive: checked })
                        }
                      />
                      
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => openEditDialog(integration)}
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon" className="text-destructive">
                            <Unlink className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{meta.disconnectPage}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {meta.disconnectConfirm}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => disconnectPage.mutate(integration.page_id!)}
                            >
                              {meta.disconnect}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>

                <CollapsibleContent>
                  <div className="border-t px-6 py-4 bg-muted/30">
                    <MetaFormManager integration={integration} />
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Page Selector Dialog */}
      <Dialog open={showPageSelector} onOpenChange={setShowPageSelector}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{meta.connectPage}</DialogTitle>
            <DialogDescription>
              {meta.changeDestination}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{meta.facebookPage}</Label>
              <Select value={selectedPageId} onValueChange={setSelectedPageId}>
                <SelectTrigger>
                  <SelectValue placeholder={meta.selectPage} />
                </SelectTrigger>
                <SelectContent>
                  {availablePages.map((page) => (
                    <SelectItem key={page.id} value={page.id}>
                      {page.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{meta.defaultPipeline}</Label>
              <Select value={selectedPipelineId} onValueChange={(v) => {
                setSelectedPipelineId(v);
                setSelectedStageId("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder={meta.selectPipeline} />
                </SelectTrigger>
                <SelectContent>
                  {pipelines?.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {meta.pipelineNote}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{meta.initialStage}</Label>
              <Select 
                value={selectedStageId} 
                onValueChange={setSelectedStageId}
                disabled={!selectedPipelineId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={meta.selectStage} />
                </SelectTrigger>
                <SelectContent>
                  {filteredStages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{meta.leadStatus}</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPageSelector(false)}>
              {t.common.cancel}
            </Button>
            <Button 
              onClick={handleConnectPage}
              disabled={connectPage.isPending || !selectedPageId || !selectedPipelineId || !selectedStageId}
            >
              {connectPage.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {meta.connectButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{meta.configurePage}</DialogTitle>
            <DialogDescription>
              {meta.changeDestination}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{meta.defaultPipeline}</Label>
              <Select value={selectedPipelineId} onValueChange={(v) => {
                setSelectedPipelineId(v);
                setSelectedStageId("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder={meta.selectPipeline} />
                </SelectTrigger>
                <SelectContent>
                  {pipelines?.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{meta.initialStage}</Label>
              <Select 
                value={selectedStageId} 
                onValueChange={setSelectedStageId}
                disabled={!selectedPipelineId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={meta.selectStage} />
                </SelectTrigger>
                <SelectContent>
                  {filteredStages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{meta.leadStatus}</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {t.common.cancel}
            </Button>
            <Button 
              onClick={handleUpdatePage}
              disabled={updatePage.isPending || !selectedPipelineId || !selectedStageId}
            >
              {updatePage.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
