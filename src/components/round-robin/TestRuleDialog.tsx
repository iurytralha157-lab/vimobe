import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  User, 
  Shuffle,
  ArrowRight
} from 'lucide-react';
import { usePipelines } from '@/hooks/use-stages';
import { useTags } from '@/hooks/use-tags';
import { useTestRoundRobin, TestRoundRobinResult } from '@/hooks/use-test-round-robin';

const SOURCES = [
  { value: 'meta', label: 'Meta Ads' },
  { value: 'wordpress', label: 'WordPress' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'manual', label: 'Manual' },
];

interface TestRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TestRuleDialog({ open, onOpenChange }: TestRuleDialogProps) {
  const { data: pipelines = [] } = usePipelines();
  const { data: tags = [] } = useTags();
  const testMutation = useTestRoundRobin();
  
  const [pipelineId, setPipelineId] = useState<string>('');
  const [source, setSource] = useState('manual');
  const [campaignName, setCampaignName] = useState('');
  const [city, setCity] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const [result, setResult] = useState<TestRoundRobinResult | null>(null);
  
  const handleTest = async () => {
    setResult(null);
    
    const res = await testMutation.mutateAsync({
      pipeline_id: pipelineId || null,
      source,
      campaign_name: campaignName || null,
      city: city || null,
      tags: selectedTags.length > 0 ? selectedTags : null,
    });
    
    setResult(res);
  };
  
  const toggleTag = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Testar Distribuição
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Simule como um lead seria distribuído com base nas regras configuradas.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pipeline</Label>
              <Select value={pipelineId || "__none__"} onValueChange={(v) => setPipelineId(v === "__none__" ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Fonte</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Campanha</Label>
              <Input
                placeholder="Nome da campanha..."
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input
                placeholder="Ex: São Paulo"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
              {tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={selectedTags.includes(tag.name) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  style={{ 
                    backgroundColor: selectedTags.includes(tag.name) ? tag.color : 'transparent',
                    borderColor: tag.color,
                    color: selectedTags.includes(tag.name) ? 'white' : tag.color,
                  }}
                  onClick={() => toggleTag(tag.name)}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
          
          <Button 
            onClick={handleTest} 
            disabled={testMutation.isPending}
            className="w-full"
          >
            {testMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Simular Distribuição
          </Button>
          
          {/* Result */}
          {result && (
            <Card className={result.matched ? 'border-green-500' : 'border-amber-500'}>
              <CardContent className="pt-4">
                {result.matched ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Lead seria distribuído!</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      {result.rule_name ? (
                        <>
                          <Badge variant="outline">Regra: {result.rule_name}</Badge>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </>
                      ) : result.via === 'pipeline_default' ? (
                        <>
                          <Badge variant="secondary">Via: Pipeline padrão</Badge>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </>
                      ) : result.via === 'fallback_generic' ? (
                        <>
                          <Badge variant="secondary">Via: Fallback genérico</Badge>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </>
                      ) : null}
                      
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Shuffle className="h-3 w-3" />
                        {result.round_robin_name}
                      </Badge>
                    </div>
                    
                    {result.next_user_name && (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <User className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{result.next_user_name}</p>
                          {result.next_user_email && (
                            <p className="text-xs text-muted-foreground">{result.next_user_email}</p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {result.strategy && (
                      <p className="text-xs text-muted-foreground">
                        Estratégia: {result.strategy === 'weighted' ? 'Ponderada' : 'Simples'}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-600">
                    <XCircle className="h-5 w-5" />
                    <div>
                      <span className="font-medium">Nenhuma regra corresponde</span>
                      <p className="text-sm text-muted-foreground">
                        {result.message || 'Lead ficaria sem responsável automático'}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
