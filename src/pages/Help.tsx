import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Search, Book, MessageCircle, Video, FileText, ExternalLink, Users, Building2, BarChart3, Zap, Phone } from "lucide-react";

const categories = [
  { id: "getting-started", label: "Primeiros Passos", icon: Book },
  { id: "leads", label: "Gestão de Leads", icon: Users },
  { id: "properties", label: "Imóveis", icon: Building2 },
  { id: "reports", label: "Relatórios", icon: BarChart3 },
  { id: "automations", label: "Automações", icon: Zap },
  { id: "integrations", label: "Integrações", icon: Phone },
];

const faqs = [
  { category: "getting-started", question: "Como criar minha primeira conta?", answer: "Para criar sua conta, acesse a página de cadastro, preencha seu email e senha, e siga as instruções para configurar sua organização." },
  { category: "leads", question: "Como importar leads em massa?", answer: "Vá em Contatos > Importar. Você pode arrastar um arquivo CSV ou Excel com os dados dos leads." },
  { category: "properties", question: "Como cadastrar um novo imóvel?", answer: "Acesse Imóveis > Novo Imóvel. Preencha as informações básicas (endereço, preço, tipo), adicione fotos e características." },
  { category: "automations", question: "Como criar uma automação?", answer: "Acesse Automações > Nova Automação. Escolha um gatilho, configure as condições e selecione a ação." },
];

const resources = [
  { title: "Central de Ajuda", description: "Artigos e tutoriais detalhados", icon: Book, link: "#" },
  { title: "Vídeos Tutoriais", description: "Aprenda com demonstrações práticas", icon: Video, link: "#" },
  { title: "Documentação API", description: "Para desenvolvedores e integrações", icon: FileText, link: "#" },
  { title: "Suporte via Chat", description: "Fale com nossa equipe", icon: MessageCircle, link: "#" },
];

export default function Help() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const filteredFaqs = faqs.filter((faq) => { const matchesSearch = searchTerm === "" || faq.question.toLowerCase().includes(searchTerm.toLowerCase()) || faq.answer.toLowerCase().includes(searchTerm.toLowerCase()); const matchesCategory = !selectedCategory || faq.category === selectedCategory; return matchesSearch && matchesCategory; });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">{t("help")}</h1><p className="text-muted-foreground">Encontre respostas e recursos de ajuda</p></div>
        <div className="relative max-w-xl"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar por perguntas ou tópicos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{resources.map((resource) => (<Card key={resource.title} className="hover:shadow-md transition-shadow cursor-pointer"><CardHeader className="pb-2"><div className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-lg"><resource.icon className="h-5 w-5 text-primary" /></div><div><CardTitle className="text-base">{resource.title}</CardTitle><CardDescription className="text-xs">{resource.description}</CardDescription></div></div></CardHeader><CardContent><Button variant="ghost" size="sm" className="w-full justify-between">Acessar<ExternalLink className="h-4 w-4" /></Button></CardContent></Card>))}</div>
        <div className="flex flex-wrap gap-2"><Badge variant={selectedCategory === null ? "default" : "outline"} className="cursor-pointer" onClick={() => setSelectedCategory(null)}>Todos</Badge>{categories.map((cat) => (<Badge key={cat.id} variant={selectedCategory === cat.id ? "default" : "outline"} className="cursor-pointer" onClick={() => setSelectedCategory(cat.id)}><cat.icon className="mr-1 h-3 w-3" />{cat.label}</Badge>))}</div>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><HelpCircle className="h-5 w-5" />Perguntas Frequentes</CardTitle><CardDescription>{filteredFaqs.length} resultados</CardDescription></CardHeader><CardContent>{filteredFaqs.length === 0 ? (<div className="text-center py-8 text-muted-foreground"><HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Nenhuma pergunta encontrada.</p></div>) : (<Accordion type="single" collapsible className="w-full">{filteredFaqs.map((faq, index) => { const category = categories.find((c) => c.id === faq.category); return (<AccordionItem key={index} value={`item-${index}`}><AccordionTrigger className="text-left"><div className="flex items-center gap-2">{category && <category.icon className="h-4 w-4 text-muted-foreground" />}{faq.question}</div></AccordionTrigger><AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent></AccordionItem>); })}</Accordion>)}</CardContent></Card>
        <Card className="bg-primary/5 border-primary/20"><CardContent className="flex items-center justify-between py-6"><div><h3 className="font-semibold mb-1">Ainda precisa de ajuda?</h3><p className="text-sm text-muted-foreground">Nossa equipe de suporte está disponível de segunda a sexta, das 9h às 18h.</p></div><Button><MessageCircle className="mr-2 h-4 w-4" />Falar com Suporte</Button></CardContent></Card>
      </div>
    </AppLayout>
  );
}
