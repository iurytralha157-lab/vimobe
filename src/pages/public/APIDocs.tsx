import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Terminal, Globe, Lock, Code2, Shield } from 'lucide-react';
import { toast } from 'sonner';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://iemalzlfnbouobyjwlwi.supabase.co';
const BASE_URL = `${SUPABASE_URL}/functions/v1/public-api`;

export default function APIDocs() {
  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const endpoints = [
    {
      method: 'GET',
      path: '/properties',
      description: 'Lista os imóveis ativos da organização. Suporta filtros e paginação.',
      params: [
        { name: 'city', type: 'string', description: 'Filtrar por cidade (busca parcial)' },
        { name: 'neighborhood', type: 'string', description: 'Filtrar por bairro (busca parcial)' },
        { name: 'type', type: 'string', description: 'Tipo de imóvel (ex.: Apartamento, Casa)' },
        { name: 'purpose', type: 'string', description: 'Negócio: venda | locacao' },
        { name: 'min_price', type: 'number', description: 'Preço mínimo' },
        { name: 'max_price', type: 'number', description: 'Preço máximo' },
        { name: 'bedrooms', type: 'number', description: 'Quartos (mínimo)' },
        { name: 'page', type: 'number', description: 'Página (default 1)' },
        { name: 'per_page', type: 'number', description: 'Itens por página (default 50, máx 100)' },
      ],
    },
    {
      method: 'GET',
      path: '/properties/:id',
      description: 'Retorna os detalhes completos de um imóvel da organização.',
      params: [{ name: 'id', type: 'uuid', description: 'ID único do imóvel (UUID)' }],
    },
  ];

  const exampleResponse = `{
  "data": [
    {
      "id": "8f3...e21",
      "code": "AP-1024",
      "title": "Apartamento 3 quartos no Centro",
      "type": "Apartamento",
      "purpose": "venda",
      "status": "ativo",
      "address": {
        "street": "Rua das Flores",
        "neighborhood": "Centro",
        "city": "Goiânia",
        "state": "GO",
        "zipcode": "74000-000"
      },
      "pricing": {
        "sale_price": 450000,
        "condominium_fee": 600,
        "iptu": 1200
      },
      "rooms": { "bedrooms": 3, "suites": 1, "bathrooms": 2, "parking": 2 },
      "area": { "useful": 85, "total": 95 },
      "main_image": "https://...",
      "images": ["https://...", "https://..."]
    }
  ],
  "pagination": { "page": 1, "per_page": 50, "total": 124, "total_pages": 3 }
}`;

  const errorTable = [
    { code: 401, msg: 'unauthorized / invalid_api_key / revoked', desc: 'Chave ausente, inválida ou revogada' },
    { code: 403, msg: 'module_disabled', desc: 'O módulo de API não está habilitado para esta organização' },
    { code: 404, msg: 'not_found', desc: 'Endpoint inexistente ou imóvel não encontrado' },
    { code: 500, msg: 'internal_error', desc: 'Erro interno' },
  ];

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Code2 className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Documentação da API</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Integre os imóveis cadastrados no seu CRM em qualquer site ou sistema externo.
            A chave de API garante que apenas os imóveis da sua organização sejam retornados.
          </p>
        </header>

        {/* Base URL */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" /> URL base
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted border rounded-lg p-4 font-mono text-sm text-foreground flex items-center justify-between gap-2">
              <code className="break-all">{BASE_URL}</code>
              <button
                onClick={() => copy(BASE_URL)}
                className="p-1 hover:bg-muted-foreground/10 rounded flex-shrink-0"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Auth */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" /> Autenticação
            </CardTitle>
            <CardDescription>
              Toda requisição precisa do header <code>Authorization</code> com sua chave de API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted border rounded-lg p-4 font-mono text-sm text-foreground">
              <code>Authorization: Bearer sk_live_…</code>
            </div>
            <div className="flex items-start gap-2 text-sm bg-amber-500/10 border border-amber-500/30 p-3 rounded-md">
              <Shield className="h-4 w-4 mt-0.5 text-amber-500 flex-shrink-0" />
              <p>
                <strong>Nunca</strong> exponha sua chave no frontend (HTML, JS do navegador,
                repositórios públicos). Faça as chamadas a partir do seu backend e armazene
                a chave em variáveis de ambiente.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Gere sua chave em <strong>Configurações → API Pública</strong> dentro do CRM.
              O super administrador precisa ter habilitado o módulo de API para a sua organização.
            </p>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" /> Endpoints
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {endpoints.map((ep, i) => (
              <div key={i} className="space-y-4 pb-8 border-b last:border-0 last:pb-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="default" className="font-mono">{ep.method}</Badge>
                  <code className="text-lg font-bold break-all">{ep.path}</code>
                </div>
                <p className="text-muted-foreground">{ep.description}</p>

                <div className="space-y-2">
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Parâmetros
                  </p>
                  <div className="border rounded-md overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2 border-b">Nome</th>
                          <th className="text-left p-2 border-b">Tipo</th>
                          <th className="text-left p-2 border-b">Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.params.map((p, j) => (
                          <tr key={j}>
                            <td className="p-2 border-b font-mono text-primary">{p.name}</td>
                            <td className="p-2 border-b text-muted-foreground">{p.type}</td>
                            <td className="p-2 border-b">{p.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-muted border rounded-lg p-4 font-mono text-xs text-foreground overflow-x-auto">
                  <p className="text-muted-foreground mb-2">// Exemplo de URL</p>
                  <code className="break-all">{BASE_URL}{ep.path}</code>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Exemplos */}
        <Card>
          <CardHeader>
            <CardTitle>Exemplos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm font-semibold mb-2">curl</p>
              <pre className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-200 overflow-x-auto">
{`curl -H "Authorization: Bearer sk_live_…" \\
  "${BASE_URL}/properties?city=Goiania&purpose=venda&page=1&per_page=20"`}
              </pre>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">JavaScript (fetch)</p>
              <pre className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-200 overflow-x-auto">
{`const res = await fetch(
  "${BASE_URL}/properties?purpose=venda",
  { headers: { Authorization: "Bearer " + process.env.IMOB_API_KEY } }
);
const { data, pagination } = await res.json();`}
              </pre>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Resposta</p>
              <pre className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-200 overflow-x-auto">
                {exampleResponse}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Erros */}
        <Card>
          <CardHeader>
            <CardTitle>Códigos de erro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2 border-b">HTTP</th>
                    <th className="text-left p-2 border-b">code</th>
                    <th className="text-left p-2 border-b">Quando ocorre</th>
                  </tr>
                </thead>
                <tbody>
                  {errorTable.map((e) => (
                    <tr key={e.code}>
                      <td className="p-2 border-b font-mono">{e.code}</td>
                      <td className="p-2 border-b font-mono text-primary">{e.msg}</td>
                      <td className="p-2 border-b">{e.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Privacidade */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Privacidade dos dados
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Por padrão, a API <strong>não</strong> retorna o número exato do logradouro
              nem dados do proprietário (nome, e-mail, telefones, comentários internos).
            </p>
            <p>
              Apenas imóveis com status <code>ativo</code> são listados. A chave usada
              determina a organização — é impossível acessar imóveis de outras contas.
            </p>
          </CardContent>
        </Card>

        <footer className="text-center text-sm text-muted-foreground pt-8 border-t">
          &copy; {new Date().getFullYear()} CRM Imobiliário — API de Integração
        </footer>
      </div>
    </div>
  );
}
