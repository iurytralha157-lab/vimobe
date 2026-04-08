import { useState, useCallback, useEffect, useRef } from 'react';
import { Node, Edge } from 'reactflow';
import { X, RotateCcw, Send, Globe, Clock, Tag, ArrowRightLeft, UserCheck, Home, CircleDot, Image, Headphones, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface SimMessage {
  id: string;
  type: 'bot' | 'user' | 'system' | 'typing';
  content: string;
  mediaType?: 'image' | 'audio' | 'video';
  mediaUrl?: string;
  timestamp: Date;
}

interface FlowSimulatorProps {
  nodes: Node[];
  edges: Edge[];
  onClose: () => void;
}

export function FlowSimulator({ nodes, edges, onClose }: FlowSimulatorProps) {
  const [messages, setMessages] = useState<SimMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [waitingForReply, setWaitingForReply] = useState(false);
  const [currentWaitNodeId, setCurrentWaitNodeId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const addMessage = useCallback((msg: Omit<SimMessage, 'id' | 'timestamp'>) => {
    const newMsg: SimMessage = { ...msg, id: crypto.randomUUID(), timestamp: new Date() };
    setMessages(prev => [...prev, newMsg]);
    return newMsg;
  }, []);

  const addSystemMessage = useCallback((content: string) => {
    addMessage({ type: 'system', content });
  }, [addMessage]);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const getNextNodes = useCallback((nodeId: string, sourceHandle?: string): Node[] => {
    const outEdges = edges.filter(e => {
      if (e.source !== nodeId) return false;
      if (sourceHandle) return e.sourceHandle === sourceHandle;
      return true;
    });
    return outEdges
      .map(e => nodes.find(n => n.id === e.target))
      .filter(Boolean) as Node[];
  }, [nodes, edges]);

  const getStartNodes = useCallback((): Node[] => {
    return nodes.filter(n => n.type === 'start');
  }, [nodes]);

  const processNode = useCallback(async (node: Node): Promise<void> => {
    if (abortRef.current) return;

    switch (node.type) {
      case 'start': {
        const triggerLabel = node.data.trigger_type || 'manual';
        const triggerLabels: Record<string, string> = {
          'message_received': '📩 Mensagem recebida',
          'lead_created': '🆕 Lead criado',
          'stage_changed': '🔄 Mudança de etapa',
          'tag_added': '🏷️ Tag adicionada',
          'tag_removed': '🏷️ Tag removida',
          'manual': '⚡ Gatilho manual',
          'inactivity': '⏰ Inatividade',
        };
        addSystemMessage(`▶ Início: ${triggerLabels[triggerLabel] || triggerLabel}`);
        break;
      }

      case 'message': {
        setIsTyping(true);
        await delay(800);
        if (abortRef.current) return;
        setIsTyping(false);
        const content = node.data.content || node.data.message || 'Mensagem sem conteúdo';
        const parsed = content
          .replace(/\{\{lead\.name\}\}/g, 'João Silva')
          .replace(/\{\{lead\.phone\}\}/g, '(31) 99999-0000')
          .replace(/\{\{lead\.email\}\}/g, 'joao@email.com')
          .replace(/\{\{organization\.name\}\}/g, 'Minha Empresa')
          .replace(/\{\{date\}\}/g, new Date().toLocaleDateString('pt-BR'));
        addMessage({ type: 'bot', content: parsed });
        break;
      }

      case 'image': {
        setIsTyping(true);
        await delay(600);
        if (abortRef.current) return;
        setIsTyping(false);
        addMessage({ 
          type: 'bot', 
          content: node.data.caption || '📷 Imagem enviada',
          mediaType: 'image',
          mediaUrl: node.data.image_url,
        });
        break;
      }

      case 'audio': {
        setIsTyping(true);
        await delay(600);
        if (abortRef.current) return;
        setIsTyping(false);
        addMessage({ type: 'bot', content: '🎤 Áudio enviado', mediaType: 'audio' });
        break;
      }

      case 'video': {
        setIsTyping(true);
        await delay(600);
        if (abortRef.current) return;
        setIsTyping(false);
        addMessage({ type: 'bot', content: '🎬 Vídeo enviado', mediaType: 'video' });
        break;
      }

      case 'wait': {
        const value = node.data.wait_value || node.data.delay_value || 1;
        const type = node.data.wait_type || node.data.delay_type || 'days';
        const labels: Record<string, string> = { minutes: 'minuto(s)', hours: 'hora(s)', days: 'dia(s)' };
        const stopOnReply = node.data.stop_on_reply === true;

        addSystemMessage(`⏳ Aguardando ${value} ${labels[type] || type}...`);

        if (stopOnReply) {
          addSystemMessage('💬 Simulação: aguardando sua resposta. Digite algo ou espere 3s para seguir pelo timeout.');
          setWaitingForReply(true);
          setCurrentWaitNodeId(node.id);
          return; // Stop processing, wait for user input or timeout
        } else {
          await delay(1500);
        }
        break;
      }

      case 'condition': {
        const condType = node.data.condition_type || 'custom';
        if (condType === 'response_sentiment') {
          addSystemMessage('🔀 Condição: Resposta do lead positiva?');
          addSystemMessage('💬 Simulação: digite algo para testar (positivo → Sim, negativo → Não)');
          setWaitingForReply(true);
          setCurrentWaitNodeId(node.id);
          return;
        } else {
          const variable = node.data.variable || '?';
          const operator = node.data.operator || 'equals';
          const value = node.data.value || '?';
          addSystemMessage(`🔀 Condição: ${variable} ${operator} ${value} → Sim (simulado)`);
          // Default to "true" branch
          const trueNodes = getNextNodes(node.id, 'true');
          for (const next of trueNodes) {
            await processNode(next);
          }
          return;
        }
      }

      case 'tag': {
        const action = node.data.tag_action === 'remove' ? 'removida' : 'adicionada';
        addSystemMessage(`🏷️ Tag ${action}: ${node.data.tag_name || node.data.tag_id || '?'}`);
        break;
      }

      case 'move_stage': {
        addSystemMessage(`📋 Lead movido para etapa: ${node.data.stage_name || node.data.move_stage_id || '?'}`);
        break;
      }

      case 'assign_user': {
        addSystemMessage(`👤 Responsável alterado: ${node.data.user_name || node.data.assign_user_id || '?'}`);
        break;
      }

      case 'property_interest': {
        addSystemMessage(`🏠 Imóvel de interesse: ${node.data.property_name || '?'}`);
        break;
      }

      case 'deal_status': {
        const statusLabels: Record<string, string> = { open: 'Aberto', won: 'Ganho', lost: 'Perdido' };
        addSystemMessage(`⚪ Status alterado: ${statusLabels[node.data.deal_status] || node.data.deal_status || '?'}`);
        break;
      }

      case 'webhook': {
        addSystemMessage(`🔗 Webhook disparado: ${node.data.webhook_url || '?'}`);
        break;
      }

      default:
        addSystemMessage(`⚙️ Nó executado: ${node.type}`);
    }

    if (abortRef.current) return;

    // Process next nodes (default path)
    const nextNodes = getNextNodes(node.id);
    for (const next of nextNodes) {
      await delay(300);
      await processNode(next);
    }
  }, [addMessage, addSystemMessage, getNextNodes]);

  const startSimulation = useCallback(async () => {
    abortRef.current = false;
    setMessages([]);
    setIsRunning(true);
    setWaitingForReply(false);
    setCurrentWaitNodeId(null);
    setIsTyping(false);

    const startNodes = getStartNodes();
    if (startNodes.length === 0) {
      addSystemMessage('❌ Nenhum nó de Início encontrado. Adicione um nó de Início para simular.');
      setIsRunning(false);
      return;
    }

    // Process first start node
    const startNode = startNodes[0];
    await processNode(startNode);

    if (!abortRef.current && !waitingForReply) {
      addSystemMessage('✅ Simulação concluída!');
      setIsRunning(false);
    }
  }, [getStartNodes, processNode, addSystemMessage]);

  const handleUserReply = useCallback(async (text: string) => {
    if (!currentWaitNodeId || !text.trim()) return;

    addMessage({ type: 'user', content: text.trim() });
    setWaitingForReply(false);
    const nodeId = currentWaitNodeId;
    setCurrentWaitNodeId(null);

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    await delay(400);

    if (node.type === 'wait' && node.data.stop_on_reply) {
      // User replied → follow "replied" branch
      addSystemMessage('✅ Lead respondeu! Seguindo caminho "Respondeu"...');
      const repliedNodes = getNextNodes(nodeId, 'replied');
      if (repliedNodes.length > 0) {
        for (const next of repliedNodes) {
          await processNode(next);
        }
      } else {
        addSystemMessage('ℹ️ Nenhum caminho conectado para "Respondeu".');
      }
    } else if (node.type === 'condition') {
      // Sentiment analysis simulation
      const positiveWords = ['sim', 'quero', 'interesse', 'gostei', 'ok', 'ótimo', 'bom', 'claro', 'aceito', 'vamos'];
      const isPositive = positiveWords.some(w => text.toLowerCase().includes(w));
      const branch = isPositive ? 'true' : 'false';
      addSystemMessage(`🔀 Resposta ${isPositive ? 'positiva' : 'negativa'} detectada → ${isPositive ? 'Sim' : 'Não'}`);
      
      const branchNodes = getNextNodes(nodeId, branch);
      if (branchNodes.length > 0) {
        for (const next of branchNodes) {
          await processNode(next);
        }
      } else {
        addSystemMessage(`ℹ️ Nenhum caminho conectado para "${isPositive ? 'Sim' : 'Não'}".`);
      }
    }

    if (!abortRef.current) {
      addSystemMessage('✅ Simulação concluída!');
      setIsRunning(false);
    }
  }, [currentWaitNodeId, nodes, addMessage, addSystemMessage, getNextNodes, processNode]);

  // Timeout for wait nodes
  useEffect(() => {
    if (!waitingForReply || !currentWaitNodeId) return;
    const node = nodes.find(n => n.id === currentWaitNodeId);
    if (!node || node.type !== 'wait') return;

    const timer = setTimeout(async () => {
      if (!waitingForReply) return;
      setWaitingForReply(false);
      const nodeId = currentWaitNodeId;
      setCurrentWaitNodeId(null);

      addSystemMessage('⏰ Timeout! Lead não respondeu. Seguindo caminho "Timeout"...');
      const timeoutNodes = getNextNodes(nodeId, 'no_reply');
      if (timeoutNodes.length > 0) {
        for (const next of timeoutNodes) {
          await processNode(next);
        }
      } else {
        addSystemMessage('ℹ️ Nenhum caminho conectado para "Timeout".');
      }
      if (!abortRef.current) {
        addSystemMessage('✅ Simulação concluída!');
        setIsRunning(false);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [waitingForReply, currentWaitNodeId, nodes, getNextNodes, processNode, addSystemMessage]);

  const handleRestart = useCallback(() => {
    abortRef.current = true;
    setMessages([]);
    setIsRunning(false);
    setWaitingForReply(false);
    setCurrentWaitNodeId(null);
    setIsTyping(false);
    setTimeout(() => startSimulation(), 100);
  }, [startSimulation]);

  // Auto-start on mount
  useEffect(() => {
    startSimulation();
    return () => { abortRef.current = true; };
  }, []);

  const handleSend = () => {
    if (waitingForReply && userInput.trim()) {
      handleUserReply(userInput);
      setUserInput('');
    }
  };

  return (
    <div className="w-[360px] flex flex-col h-full border-l border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground">
            <Globe className="h-3 w-3" />
            Web
          </div>
          <button 
            onClick={handleRestart}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Reiniciar
          </button>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Chat area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-[hsl(var(--muted)/0.3)]"
      >
        {messages.map((msg) => (
          <div key={msg.id} className={cn(
            'max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300',
            msg.type === 'user' ? 'ml-auto' : '',
            msg.type === 'system' ? 'mx-auto max-w-full' : '',
          )}>
            {msg.type === 'system' ? (
              <div className="text-[11px] text-muted-foreground text-center py-1 px-3 bg-muted/50 rounded-lg">
                {msg.content}
              </div>
            ) : msg.type === 'bot' ? (
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-sm">
                {msg.mediaType === 'image' && msg.mediaUrl && (
                  <div className="mb-2 rounded-xl overflow-hidden bg-muted">
                    <img src={msg.mediaUrl} alt="" className="w-full h-auto max-h-48 object-cover" />
                  </div>
                )}
                {msg.mediaType === 'image' && !msg.mediaUrl && (
                  <div className="mb-2 rounded-xl bg-muted flex items-center justify-center h-32">
                    <Image className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}
                {msg.mediaType === 'audio' && (
                  <div className="mb-2 flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
                    <Headphones className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 h-1 bg-muted-foreground/20 rounded-full">
                      <div className="h-full w-2/3 bg-primary rounded-full" />
                    </div>
                    <span className="text-[10px] text-muted-foreground">0:15</span>
                  </div>
                )}
                {msg.mediaType === 'video' && (
                  <div className="mb-2 rounded-xl bg-muted flex items-center justify-center h-32">
                    <Video className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}
                <p className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</p>
              </div>
            ) : (
              <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3.5 py-2.5 shadow-sm">
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="max-w-[85%] animate-in fade-in">
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm inline-flex items-center gap-1">
              <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-card">
        <div className="flex items-center gap-2">
          <Input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={waitingForReply ? 'Digite sua resposta...' : 'Aguardando simulação...'}
            disabled={!waitingForReply}
            className="flex-1 text-sm h-9 rounded-xl"
          />
          <Button 
            size="icon" 
            className="h-9 w-9 rounded-xl shrink-0" 
            onClick={handleSend} 
            disabled={!waitingForReply || !userInput.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
