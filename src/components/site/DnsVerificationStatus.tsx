import { useState } from "react";
import { Check, X, Loader2, RefreshCw, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useVerifyDomain } from "@/hooks/use-verify-domain";

interface DnsVerificationStatusProps {
  domain: string;
  isVerified: boolean;
  verifiedAt?: string | null;
  onVerified?: () => void;
}

export function DnsVerificationStatus({ 
  domain, 
  isVerified, 
  verifiedAt,
  onVerified 
}: DnsVerificationStatusProps) {
  const verifyDomain = useVerifyDomain();
  const [lastCheck, setLastCheck] = useState<{
    verified: boolean;
    records: Array<{ type: string; data: string }>;
    error?: string;
  } | null>(null);

  const handleVerify = async () => {
    const result = await verifyDomain.mutateAsync(domain);
    setLastCheck({
      verified: result.verified,
      records: result.records,
      error: result.error
    });
    if (result.verified && onVerified) {
      onVerified();
    }
  };

  if (isVerified) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
          <Check className="w-3 h-3 mr-1" />
          Verificado
        </Badge>
        {verifiedAt && (
          <span className="text-muted-foreground text-xs">
            em {new Date(verifiedAt).toLocaleDateString('pt-BR')}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
          <Clock className="w-3 h-3 mr-1" />
          Aguardando verificação
        </Badge>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleVerify}
          disabled={verifyDomain.isPending}
        >
          {verifyDomain.isPending ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-1" />
          )}
          Verificar agora
        </Button>
      </div>

      {lastCheck && !lastCheck.verified && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertCircle className="w-4 h-4" />
            DNS não configurado corretamente
          </div>
          {lastCheck.records.length > 0 ? (
            <div className="text-xs space-y-1">
              <p className="text-muted-foreground">Registros encontrados:</p>
              {lastCheck.records.map((record, i) => (
                <div key={i} className="font-mono bg-muted px-2 py-1 rounded flex items-center gap-2">
                  <span className="text-muted-foreground">{record.type}:</span>
                  <span className={cn(
                    record.data === '185.158.133.1' ? 'text-green-600' : 'text-red-600'
                  )}>
                    {record.data}
                  </span>
                  {record.data === '185.158.133.1' ? (
                    <Check className="w-3 h-3 text-green-600" />
                  ) : (
                    <X className="w-3 h-3 text-red-600" />
                  )}
                </div>
              ))}
              <p className="text-muted-foreground mt-2">
                Esperado: <span className="font-mono">185.158.133.1</span>
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhum registro A encontrado. Configure o DNS conforme as instruções acima.
            </p>
          )}
          {lastCheck.error && (
            <p className="text-xs text-destructive">Erro: {lastCheck.error}</p>
          )}
        </div>
      )}

      {lastCheck?.verified && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
            <Check className="w-4 h-4" />
            DNS verificado com sucesso!
          </div>
        </div>
      )}
    </div>
  );
}
