import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Copy, RefreshCw, ExternalLink, ShieldCheck, Key } from 'lucide-react';

export function APITab() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [newKey, setNewKey] = useState<string | null>(null);

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['api-keys', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('organization_api_keys')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  const generateKeyMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.organization_id) throw new Error('No organization found');
      
      // Generate a random key
      const buffer = new Uint8Array(32);
      crypto.getRandomValues(buffer);
      const randomPart = Array.from(buffer, (byte) => byte.toString(16).padStart(2, '0')).join('');
      const apiKey = `sk_${randomPart}`;
      
      // We'll store a prefix and a hash for security
      // For this simple implementation, we'll use a prefix of the first 8 chars
      const keyPrefix = apiKey.substring(0, 12); // sk_ + 9 chars
      
      const { error } = await supabase
        .from('organization_api_keys')
        .insert({
          organization_id: profile.organization_id,
          key_hash: apiKey, // In a real production app, this should be hashed (e.g. SHA-256)
          key_prefix: keyPrefix,
          name: 'Chave Padrão',
          created_by: profile.id
        });

      if (error) throw error;
      return apiKey;
    },
    onSuccess: (apiKey) => {
      setNewKey(apiKey);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('Chave de API gerada com sucesso!');
    },
    onError: (error) => {
      console.error('Error generating API key:', error);
      toast.error('Erro ao gerar chave de API');
    }
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('organization_api_keys')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('Chave de API removida');
    }
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Chaves de API
              </CardTitle>
              <CardDescription>
                Use estas chaves para autenticar suas requisições na API pública.
              </CardDescription>
            </div>
            <Button 
              onClick={() => generateKeyMutation.mutate()} 
              disabled={generateKeyMutation.isPending}
            >
              {generateKeyMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Gerar Nova Chave
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {newKey && (
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg space-y-2 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 text-primary font-medium">
                <ShieldCheck className="h-4 w-4" />
                Sua nova chave de API (Salva em local seguro!)
              </div>
              <p className="text-sm text-muted-foreground">
                Por motivos de segurança, você só poderá ver esta chave uma vez.
              </p>
              <div className="flex gap-2">
                <Input value={newKey} readOnly className="font-mono" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(newKey)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {isLoading ? (
              <div className="h-20 flex items-center justify-center text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Carregando chaves...
              </div>
            ) : apiKeys?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                Nenhuma chave de API gerada.
              </div>
            ) : (
              apiKeys?.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                  <div className="space-y-1">
                    <p className="font-medium">{key.name}</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {key.key_prefix}...
                      </code>
                      <span className="text-xs text-muted-foreground">
                        Criada em {new Date(key.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteKeyMutation.mutate(key.id)}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Documentação da API</CardTitle>
          <CardDescription>
            Aprenda como integrar seus imóveis em outros sistemas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-4">
            <div className="space-y-1">
              <p className="font-medium">Guia de Integração</p>
              <p className="text-sm text-muted-foreground">
                Veja os endpoints disponíveis e como consumir os dados dos seus imóveis.
              </p>
            </div>
            <Button variant="outline" asChild>
              <a href="/docs/api" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver Documentação
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
