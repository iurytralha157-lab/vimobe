import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Terminal, Globe, Lock, Code2, Shield, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';

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
    <div className="min-h-screen bg-[#F8F9FA] py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-6 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20 animate-in fade-in zoom-in duration-500">
              <Code2 className="h-10 w-10 text-primary-foreground" />
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
                Documentação da <span className="text-primary">API Pública</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Integre os dados do seu CRM Imobiliário em qualquer plataforma, site ou sistema externo de forma simples e segura.
              </p>
            </div>
          </div>
        </header>

        {/* Base URL */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" /> URL base
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-950 rounded-lg p-4 font-mono text-sm text-slate-200 flex items-center justify-between gap-2">
              <code className="break-all">{BASE_URL}</code>
              <button
                onClick={() => copy(BASE_URL)}
                className="p-1 hover:bg-slate-800 rounded flex-shrink-0"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Auth */}
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Lock className="h-5 w-5 text-primary" /> Autenticação
            </CardTitle>
            <CardDescription className="text-base">
              Toda requisição precisa do header <code className="bg-slate-100 px-1 rounded text-primary">Authorization</code> com sua chave de API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-900 rounded-xl p-5 font-mono text-sm text-slate-200 border border-slate-800 shadow-inner">
              <span className="text-slate-500"># Header de autorização</span><br />
              <code className="text-primary-foreground">Authorization: Bearer <span className="text-orange-400">sk_live_...</span></code>
            </div>
            <div className="flex items-start gap-3 text-sm bg-orange-50 border border-orange-200 p-4 rounded-xl">
              <Shield className="h-5 w-5 mt-0.5 text-orange-600 flex-shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold text-orange-900">Segurança em primeiro lugar</p>
                <p className="text-orange-800 leading-relaxed">
                  <strong>Nunca</strong> exponha sua chave no frontend (HTML, JavaScript cliente). 
                  Faça as requisições a partir do seu servidor e utilize variáveis de ambiente.
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Gere sua chave em <strong className="text-slate-900">Configurações → API Pública</strong> dentro do CRM. 
              O acesso deve ser habilitado previamente pelo Super Administrador da conta.
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
                  <Badge className="bg-primary hover:bg-primary/90 text-white font-mono px-3 py-1 text-xs uppercase tracking-wider">{ep.method}</Badge>
                  <code className="text-xl font-bold text-slate-900 break-all">{ep.path}</code>
                </div>
                <p className="text-slate-600 leading-relaxed font-medium">{ep.description}</p>

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

                <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-200 overflow-x-auto">
                  <p className="text-slate-500 mb-2">// Exemplo de URL</p>
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
