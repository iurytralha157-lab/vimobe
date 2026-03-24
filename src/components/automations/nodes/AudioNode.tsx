import { memo, useRef, useState, useCallback, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Headphones, Play, Pause } from 'lucide-react';

export const AudioNode = memo(({ data, selected }: NodeProps) => {
  const url = data.audio_url || '';
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);

  const setupAnalyser = useCallback(() => {
    if (!audioRef.current || audioCtxRef.current) return;
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audioRef.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      sourceRef.current = source;
      analyserRef.current = analyser;
    } catch { /* already connected */ }
  }, []);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const barCount = 24;
    const barWidth = (w - (barCount - 1) * 1.5) / barCount;

    for (let i = 0; i < barCount; i++) {
      const idx = Math.floor((i / barCount) * bufferLength);
      const val = dataArray[idx] / 255;
      const barHeight = Math.max(3, val * h * 0.9);

      ctx.fillStyle = `rgba(245, 158, 11, ${0.4 + val * 0.6})`;
      ctx.beginPath();
      const x = i * (barWidth + 1.5);
      const radius = Math.min(barWidth / 2, 1.5);
      ctx.roundRect(x, (h - barHeight) / 2, barWidth, barHeight, radius);
      ctx.fill();
    }

    rafRef.current = requestAnimationFrame(drawWaveform);
  }, []);

  const drawStatic = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const barCount = 24;
    const barWidth = (w - (barCount - 1) * 1.5) / barCount;
    for (let i = 0; i < barCount; i++) {
      const barHeight = Math.max(3, Math.abs(Math.sin(i * 0.7 + 0.5)) * h * 0.5 + 3);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.beginPath();
      const x = i * (barWidth + 1.5);
      const radius = Math.min(barWidth / 2, 1.5);
      ctx.roundRect(x, (h - barHeight) / 2, barWidth, barHeight, radius);
      ctx.fill();
    }
  }, []);

  useEffect(() => {
    if (url) drawStatic();
  }, [url, drawStatic]);

  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    setupAnalyser();
    if (isPlaying) {
      audioRef.current.pause();
      cancelAnimationFrame(rafRef.current);
      setIsPlaying(false);
      drawStatic();
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
      drawWaveform();
    }
  }, [isPlaying, setupAnalyser, drawWaveform, drawStatic]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    cancelAnimationFrame(rafRef.current);
    drawStatic();
  }, [drawStatic]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  }, []);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!audioRef.current || !duration || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * duration;
    setCurrentTime(pct * duration);
  }, [duration]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

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
        <div className="mt-2 space-y-1.5">
          {/* Real waveform canvas */}
          <canvas ref={canvasRef} width={220} height={28} className="w-full h-7" />

          {/* Seekable progress bar */}
          <div
            ref={progressRef}
            className="relative h-2 bg-amber-500/20 rounded-full cursor-pointer group"
            onClick={handleSeek}
          >
            <div
              className="absolute inset-y-0 left-0 bg-amber-500 rounded-full transition-[width] duration-100"
              style={{ width: `${pct}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-amber-500 rounded-full shadow-sm border-2 border-white dark:border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${pct}% - 6px)` }}
            />
          </div>

          {/* Time display */}
          {duration > 0 && (
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          )}

          <audio
            ref={audioRef}
            src={url}
            onEnded={handleEnded}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            preload="metadata"
          />
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-amber-400 !w-3 !h-3 !border-2 !border-amber-500/50" />
    </div>
  );
});

AudioNode.displayName = 'AudioNode';
