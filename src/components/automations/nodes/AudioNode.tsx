import { memo, useRef, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Headphones, Play, Pause } from 'lucide-react';

export const AudioNode = memo(({ data, selected }: NodeProps) => {
  const url = data.audio_url || '';
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleEnded = useCallback(() => setIsPlaying(false), []);

  return (
    <div className={`automation-node px-4 py-3 rounded-xl min-w-[220px] max-w-[280px] ${
      selected ? 'ring-2 ring-amber-400/60' : ''
    }`} style={{ '--node-accent': '#f59e0b' } as React.CSSProperties}>
      <Handle type="target" position={Position.Left} className="!bg-amber-400 !w-3 !h-3 !border-2 !border-amber-500/50" />
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-500 shrink-0">
          <Headphones className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Áudio</span>
          <p className="text-xs text-muted-foreground mt-0.5">
            {url ? 'Áudio configurado' : 'Clique para configurar...'}
          </p>
        </div>
        {url && (
          <button
            onClick={togglePlay}
            className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shrink-0 hover:bg-amber-600 transition-colors"
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5 text-white" />
            ) : (
              <Play className="h-3.5 w-3.5 text-white ml-0.5" />
            )}
          </button>
        )}
      </div>
      {url && (
        <div className="mt-2 flex items-center gap-1.5">
          {/* Waveform visualization bars */}
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ${
                isPlaying ? 'bg-amber-500 animate-pulse' : 'bg-amber-500/40'
              }`}
              style={{
                height: `${Math.max(4, Math.sin(i * 0.8) * 12 + Math.random() * 6 + 6)}px`,
                animationDelay: `${i * 50}ms`,
              }}
            />
          ))}
          <audio ref={audioRef} src={url} onEnded={handleEnded} preload="none" />
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-amber-400 !w-3 !h-3 !border-2 !border-amber-500/50" />
    </div>
  );
});

AudioNode.displayName = 'AudioNode';
