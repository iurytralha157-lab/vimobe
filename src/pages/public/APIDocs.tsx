import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Terminal, Globe, Lock, Code2 } from 'lucide-react';
import { toast } from 'sonner';

export default function APIDocs() {
  const baseUrl = window.location.origin + '/functions/v1/public-api';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  const endpoints = [
    {
      method: 'GET',
      path: '/properties',
      description: 'Retorna a lista de imóveis da organização.',
      params: [
        { name: 'city', type: 'string', description: 'Filtrar por cidade' },
        { name: 'neighborhood', type: 'string', description: 'Filtrar por bairro' },
        { name: 'type', type: 'string', description: 'Filtrar por tipo de imóvel' }
      ]
    },
    {
      method: 'GET',
      path: '/properties/:id',
      description: 'Retorna os detalhes completos de um imóvel específico, incluindo fotos e características.',
      params: [
        { name: 'id', type: 'uuid', description: 'ID único do imóvel' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Code2 className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Documentação da API Pública</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Integre os imóveis do seu CRM em qualquer site ou sistema externo de forma simples e rápida.
          </p>
        </header>

        <section className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Autenticação
              </CardTitle>
              <CardDescription>
                Todas as requisições devem incluir sua chave de API no cabeçalho Authorization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-950 rounded-lg p-4 font-mono text-sm text-slate-200 relative group">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-500">Exemplo de cabeçalho</span>
                  <button 
                    onClick={() => copyToClipboard('Authorization: Bearer YOUR_API_KEY')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-800 rounded"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <code>Authorization: Bearer sk_...</code>
              </div>
              <div className="flex items-start gap-2 text-sm text-warning-foreground bg-warning/10 p-3 rounded-md border border-warning/20">
                <Globe className="h-4 w-4 mt-0.5" />
                <p>
                  Mantenha sua chave de API em segredo. Nunca a utilize diretamente no frontend do seu site. 
                  Sugerimos fazer as chamadas através do seu backend.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" />
                Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {endpoints.map((endpoint, i) => (
                <div key={i} className="space-y-4 pb-8 border-b last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <Badge variant="default" className="font-mono">{endpoint.method}</Badge>
                    <code className="text-lg font-bold">{endpoint.path}</code>
                  </div>
                  <p className="text-muted-foreground">{endpoint.description}</p>
                  
                  {endpoint.params.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Parâmetros de Consulta</p>
                      <div className="border rounded-md overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-2 border-b">Parâmetro</th>
                              <th className="text-left p-2 border-b">Tipo</th>
                              <th className="text-left p-2 border-b">Descrição</th>
                            </tr>
                          </thead>
                          <tbody>
                            {endpoint.params.map((param, j) => (
                              <tr key={j}>
                                <td className="p-2 border-b font-mono text-primary">{param.name}</td>
                                <td className="p-2 border-b text-muted-foreground">{param.type}</td>
                                <td className="p-2 border-b">{param.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-950 rounded-lg p-4 font-mono text-sm text-slate-200">
                    <p className="text-slate-500 mb-2">// Exemplo de URL</p>
                    <code>{baseUrl}{endpoint.path}</code>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <footer className="text-center text-sm text-muted-foreground pt-8 border-t">
          &copy; {new Date().getFullYear()} CRM Imobiliário - API de Integração
        </footer>
      </div>
    </div>
  );
}
