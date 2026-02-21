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
  useMetaConnectPage,
  useMetaUpdatePage,
  useMetaDisconnectPage,
  useMetaTogglePage,
  MetaPage,
  MetaIntegration,
} from "@/hooks/use-meta-integration";
import { MetaFormManager } from "./MetaFormManager";
import { useLanguage } from "@/contexts/LanguageContext";

interface OAuthData {
  success: boolean;
  pages?: MetaPage[];
  userToken?: string;
  error?: string;
}

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
  const connectPage = useMetaConnectPage();
  const updatePage = useMetaUpdatePage();
  const disconnectPage = useMetaDisconnectPage();
  const togglePage = useMetaTogglePage();

  // Handle OAuth callback data from URL
  useEffect(() => {
    const oauthData = searchParams.get("meta_oauth_data");
    if (oauthData) {
      try {
        const decoded = JSON.parse(atob(decodeURIComponent(oauthData))) as OAuthData;
        console.log("OAuth callback data:", decoded);
        
        if (decoded.success && decoded.pages && decoded.userToken) {
          setAvailablePages(decoded.pages);
          setUserToken(decoded.userToken);
          setShowPageSelector(true);
          toast.success("Autenticação realizada com sucesso!");
        } else if (decoded.error) {
          toast.error(decoded.error);
        }
        
        // Clear the URL params
        setSearchParams({});
      } catch (e) {
        console.error("Failed to parse OAuth data:", e);
        setSearchParams({});
      }
    }
  }, [searchParams, setSearchParams]);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      // Get current URL as return URL
      const returnUrl = window.location.href.split('?')[0];
      const result = await getAuthUrl.mutateAsync(returnUrl);
      
      // Redirect to Facebook OAuth (same window - will redirect back)
      window.location.href = result.auth_url;
    } catch (error) {
      toast.error(meta.errorStarting);
      setIsConnecting(false);
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
    setSelectedPipelineId("");
    setSelectedStageId("");
    setSelectedStatus("novo");
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
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
              <Facebook className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight">{meta.title}</p>
              <p className="text-xs text-muted-foreground truncate">{meta.description}</p>
            </div>
            <Button
              size="sm"
              className="h-8 text-xs px-2 shrink-0"
              onClick={handleConnect}
              disabled={isConnecting || getAuthUrl.isPending}
            >
              {isConnecting ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Link className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline ml-1">{hasConnectedPages ? meta.addPage : meta.connect}</span>
            </Button>
          </div>
          {hasConnectedPages ? (
            <div className="flex items-center gap-1.5 mt-2 pl-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-orange-500 shrink-0" />
              <span className="text-xs text-orange-600 font-medium">
                {integrations.length} {meta.pagesConnected}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-2 pl-1">
              <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">{meta.noPageConnected}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connected Pages */}
      {hasConnectedPages && (
        <div className="space-y-3">
          {integrations.map((integration) => (
            <Collapsible
              key={integration.id}
              open={expandedIntegrations.has(integration.id)}
              onOpenChange={() => toggleExpanded(integration.id)}
            >
              <Card>
                <CardContent className="p-3 space-y-2.5">
                  {/* Row 1: Identity & Status */}
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 shrink-0">
                      <Facebook className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-tight truncate">{integration.page_name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          {integration.leads_received || 0} {meta.leadsReceived}
                        </span>
                        {integration.last_error && (
                          <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={integration.is_connected ? "default" : "secondary"}
                      className="text-xs shrink-0"
                    >
                      {integration.is_connected ? t.common.active : t.common.inactive}
                    </Badge>
                  </div>

                  {/* Row 2: Info & Toggle */}
                  <div className="flex items-center justify-between gap-2 py-1.5 border-y border-border/50">
                    <span className="text-xs text-muted-foreground truncate flex-1">
                      {meta.pipelineConfigured}
                      {integration.last_sync_at && (
                        <span className="ml-2">· {new Date(integration.last_sync_at).toLocaleDateString()}</span>
                      )}
                    </span>
                    <Switch
                      checked={integration.is_connected}
                      onCheckedChange={(checked) =>
                        togglePage.mutate({ pageId: integration.page_id!, isActive: checked })
                      }
                      className="shrink-0"
                    />
                  </div>

                  {/* Row 3: Actions */}
                  <div className="flex items-center gap-1.5">
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-xs px-2 min-w-0">
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{meta.forms}</span>
                        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${expandedIntegrations.has(integration.id) ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => openEditDialog(integration)}
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive">
                          <Unlink className="h-3.5 w-3.5" />
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
                </CardContent>

                <CollapsibleContent>
                  <div className="border-t px-3 py-3 bg-muted/30">
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
        <DialogContent className="w-[90%] sm:max-w-md sm:w-full rounded-lg">
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

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="w-[40%] rounded-xl" onClick={() => setShowPageSelector(false)}>
              {t.common.cancel}
            </Button>
            <Button 
              className="w-[60%] rounded-xl"
              onClick={handleConnectPage}
              disabled={connectPage.isPending || !selectedPageId || !selectedPipelineId || !selectedStageId}
            >
              {connectPage.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {meta.connectButton}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="w-[90%] sm:max-w-md sm:w-full rounded-lg">
          <DialogHeader>
            <DialogTitle>{meta.editPage}</DialogTitle>
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

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="w-[40%] rounded-xl" onClick={() => setShowEditDialog(false)}>
              {t.common.cancel}
            </Button>
            <Button 
              className="w-[60%] rounded-xl"
              onClick={handleUpdatePage}
              disabled={updatePage.isPending || !selectedPipelineId || !selectedStageId}
            >
              {updatePage.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t.common.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
