import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  ExternalLink, 
  Settings2,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { useWhatsAppSessions } from '@/hooks/use-whatsapp-sessions';
import { useLanguage } from '@/contexts/LanguageContext';

export function WhatsAppTab() {
  const { t } = useLanguage();
  const { data: sessions = [], isLoading } = useWhatsAppSessions();

  const connectedSessions = sessions.filter(s => s.status === 'connected');
  const disconnectedSessions = sessions.filter(s => s.status !== 'connected');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          WhatsApp
        </CardTitle>
        <CardDescription>
          Gerencie suas conexões de WhatsApp Business
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-medium mb-2">Nenhuma conexão configurada</h3>
            <p className="text-sm mb-4">Conecte seu WhatsApp para começar a receber mensagens</p>
            <Button asChild>
              <Link to="/settings/whatsapp">
                <Settings2 className="h-4 w-4 mr-2" />
                Configurar WhatsApp
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Status Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border bg-success/5 border-success/30">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="text-2xl font-bold">{connectedSessions.length}</span>
                </div>
                <p className="text-sm text-muted-foreground">Conectados</p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  <span className="text-2xl font-bold">{disconnectedSessions.length}</span>
                </div>
                <p className="text-sm text-muted-foreground">Desconectados</p>
              </div>
            </div>

            {/* Sessions List */}
            <div className="space-y-2">
              {sessions.map((session) => (
                <div 
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{session.instance_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.phone_number || session.profile_name || 'Não conectado'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={session.status === 'connected' ? 'default' : 'secondary'}>
                    {session.status === 'connected' ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Conectado
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Desconectado
                      </>
                    )}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Manage Button */}
            <Button asChild className="w-full">
              <Link to="/settings/whatsapp">
                <Settings2 className="h-4 w-4 mr-2" />
                Gerenciar Conexões
                <ExternalLink className="h-4 w-4 ml-auto" />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
