import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Building2, Check, Facebook, AlertCircle, Loader2, Settings2, ExternalLink, Smartphone, Webhook, User, Bot, LucideIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMetaIntegrations } from '@/hooks/use-meta-integration';
import { AccountTab } from '@/components/settings/AccountTab';
import { TeamTab } from '@/components/settings/TeamTab';
import { WebhooksTab } from '@/components/settings/WebhooksTab';
import { WhatsAppTab } from '@/components/settings/WhatsAppTab';
import { AIAgentTab } from '@/components/settings/AIAgentTab';
import { useOrganizationModules } from '@/hooks/use-organization-modules';
import { useIsMobile } from '@/hooks/use-mobile';

interface TabItem {
  value: string;
  label: string;
  icon: LucideIcon;
}

export default function Settings() {
  const { profile, isSuperAdmin } = useAuth();
  const { data: metaIntegrations = [], isLoading: metaLoading } = useMetaIntegrations();
  const { hasModule } = useOrganizationModules();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('account');

  // Calcular métricas Meta
  const activeMetaPages = metaIntegrations.filter(i => i.is_connected);
  const totalMetaLeadsReceived = metaIntegrations.reduce(
    (sum, integration) => sum + (integration.leads_received || 0),
    0
  );
  const isMetaConnected = metaIntegrations.length > 0;
  const hasWhatsAppModule = hasModule('whatsapp');
  const hasWebhooksModule = hasModule('webhooks');

  // Build tabs list dynamically based on permissions and modules
  const settingsTabs: TabItem[] = useMemo(() => {
    const tabs: TabItem[] = [
      { value: 'account', label: 'Conta', icon: User },
      { value: 'team', label: 'Usuários', icon: Users },
    ];

    if (hasWebhooksModule) {
      tabs.push({ value: 'webhooks', label: 'Webhooks', icon: Webhook });
    }

    tabs.push({ value: 'meta', label: t.settings.meta, icon: Facebook });

    if (hasWhatsAppModule) {
      tabs.push({ value: 'whatsapp', label: 'WhatsApp', icon: Smartphone });
      tabs.push({ value: 'ai-agent', label: 'Agente IA', icon: Bot });
    }

    return tabs;
  }, [t, hasWebhooksModule, hasWhatsAppModule]);

  const currentTab = settingsTabs.find(tab => tab.value === activeTab);
  const CurrentIcon = currentTab?.icon;

  return (
    <AppLayout title={t.settings.title}>
      <div className="animate-in">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {isMobile ? (
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {CurrentIcon && <CurrentIcon className="h-4 w-4" />}
                    <span>{currentTab?.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {settingsTabs.map(tab => (
                  <SelectItem key={tab.value} value={tab.value}>
                    <div className="flex items-center gap-2">
                      <tab.icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <TabsList className="flex-wrap h-auto gap-1">
              {settingsTabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          )}

          {/* Account Tab (Profile + Organization) */}
          <TabsContent value="account">
            <AccountTab />
          </TabsContent>

          {/* Team Tab (Users + Roles) */}
          <TabsContent value="team">
            <TeamTab />
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks">
            <WebhooksTab />
          </TabsContent>

          {/* Meta Integration Tab */}
          <TabsContent value="meta">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Facebook className="h-5 w-5" />
                  {t.settings.integrations.meta.title}
                </CardTitle>
                <CardDescription>
                  {t.settings.integrations.meta.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {metaLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {/* Status da Conexão */}
                    <div className={`p-4 rounded-lg border ${isMetaConnected ? 'border-success bg-success/5' : 'border-warning bg-warning/5'}`}>
                      <div className="flex items-center gap-3">
                        {isMetaConnected ? <Check className="h-5 w-5 text-success" /> : <AlertCircle className="h-5 w-5 text-warning" />}
                        <div>
                          <p className="font-medium">
                            {isMetaConnected ? t.settings.integrations.meta.connected : t.settings.integrations.meta.notConnected}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {isMetaConnected 
                              ? `${activeMetaPages.length} ${t.settings.integrations.meta.activePage} ${metaIntegrations.length} ${t.settings.integrations.meta.pagesConnected}` 
                              : t.settings.integrations.meta.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Resumo quando conectado */}
                    {isMetaConnected && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border bg-muted/50">
                          <p className="text-2xl font-bold">{metaIntegrations.length}</p>
                          <p className="text-sm text-muted-foreground">{t.settings.integrations.meta.pagesConnected}</p>
                        </div>
                        <div className="p-4 rounded-lg border bg-muted/50">
                          <p className="text-2xl font-bold">{totalMetaLeadsReceived}</p>
                          <p className="text-sm text-muted-foreground">{t.settings.integrations.meta.leadsReceived}</p>
                        </div>
                      </div>
                    )}

                    {/* Botão para página de configuração */}
                    <Button asChild className="w-full gap-2">
                      <Link to="/settings/integrations/meta">
                        <Settings2 className="h-4 w-4" />
                        {t.settings.integrations.meta.manageMeta}
                        <ExternalLink className="h-4 w-4 ml-auto" />
                      </Link>
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* WhatsApp Tab */}
          {hasWhatsAppModule && (
            <TabsContent value="whatsapp">
              <WhatsAppTab />
            </TabsContent>
          )}

          {hasWhatsAppModule && (
            <TabsContent value="ai-agent">
              <AIAgentTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}
