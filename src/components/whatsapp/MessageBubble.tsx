import { useState, useRef, useEffect, SyntheticEvent } from "react";
import { Check, CheckCheck, Clock, Mic, Play, Pause, FileText, Download, AlertCircle, RefreshCw, Loader2, Image as ImageIcon, Video, Volume2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MediaViewer } from "./MediaViewer";

interface MessageBubbleProps {
  content: string | null;
  messageType: string;
  mediaUrl?: string | null;
  mediaMimeType?: string | null;
  mediaStatus?: 'pending' | 'ready' | 'failed' | null;
  mediaError?: string | null;
  mediaSize?: number | null;
  fromMe: boolean;
  status?: string;
  sentAt: string;
  senderName?: string | null;
  isGroup?: boolean;
  onRetryMedia?: () => void;
}

// Generate pseudo-random waveform bars based on a seed
const generateWaveform = (seed: string, count: number = 40): number[] => {
  const bars: number[] = [];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  
  for (let i = 0; i < count; i++) {
    const val = Math.abs(Math.sin(hash * (i + 1) * 0.1) * Math.cos(hash * (i + 1) * 0.05));
    bars.push(0.2 + val * 0.8); // Min 20%, max 100%
  }
  return bars;
};

// Check browser support for audio/ogg with opus codec
const checkOggOpusSupport = (): boolean => {
  try {
    const audio = document.createElement('audio');
    return !!(audio.canPlayType && audio.canPlayType('audio/ogg; codecs=opus').replace(/no/, ''));
  } catch {
    return false;
  }
};

export function MessageBubble({
  content,
  messageType,
  mediaUrl,
  mediaMimeType,
  mediaStatus,
  mediaError,
  mediaSize,
  fromMe,
  status,
  sentAt,
  senderName,
  isGroup,
  onRetryMedia,
}: MessageBubbleProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [mediaChecked, setMediaChecked] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Waveform bars generated from mediaUrl or sentAt as seed
  const waveformBars = generateWaveform(mediaUrl || sentAt, 40);

  // Debug: Check media URL accessibility
  useEffect(() => {
    if (mediaUrl && (messageType === 'audio' || messageType === 'image' || messageType === 'video') && !mediaChecked) {
      setMediaChecked(true);
      
      fetch(mediaUrl, { method: 'HEAD', mode: 'cors' })
        .then(res => {
          console.log('[Media Check]', {
            type: messageType,
            url: mediaUrl.substring(0, 80) + '...',
            status: res.status,
            contentType: res.headers.get('content-type'),
            acceptRanges: res.headers.get('accept-ranges'),
            contentLength: res.headers.get('content-length')
          });
        })
        .catch(err => {
          console.warn('[Media Check Failed]', {
            type: messageType,
            url: mediaUrl.substring(0, 80) + '...',
            error: err.message
          });
        });
    }
  }, [mediaUrl, messageType, mediaChecked]);

  const formatTime = (date: string) => {
    return format(new Date(date), "HH:mm");
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusIcon = () => {
    if (!fromMe) return null;
    
    switch (status) {
      case "read":
      case "played":
        return <CheckCheck className="w-[16px] h-[16px] text-blue-400" />;
      case "delivered":
        return <CheckCheck className="w-[16px] h-[16px] opacity-60" />;
      case "sent":
        return <Check className="w-[16px] h-[16px] opacity-60" />;
      case "pending":
        return <Clock className="w-[16px] h-[16px] opacity-60 animate-pulse" />;
      default:
        return <Check className="w-[16px] h-[16px] opacity-60" />;
    }
  };

  const isValidMediaUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;
    if (url.includes("mmg.whatsapp.net")) return false;
    if (url.includes("pps.whatsapp.net")) return false;
    if (url.includes(".enc")) return false;
    return url.startsWith("http://") || url.startsWith("https://");
  };

  const playbackRates = [1, 1.5, 2];
  
  const cyclePlaybackRate = () => {
    const currentIndex = playbackRates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % playbackRates.length;
    const newRate = playbackRates[nextIndex];
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  const handleAudioPlay = () => {
    if (audioRef.current && !audioError) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.playbackRate = playbackRate;
        audioRef.current.play().catch(err => {
          console.error('[Audio Play Error]', err);
          setAudioError('Erro ao reproduzir');
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setAudioProgress(progress || 0);
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleAudioLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
      setAudioReady(true);
      console.log('[Audio Ready]', {
        url: mediaUrl?.substring(0, 60) + '...',
        duration: audioRef.current.duration
      });
    }
  };

  const handleAudioError = (e: SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    const errorCode = audio.error?.code;
    const errorMsg = audio.error?.message;
    
    console.error('[Audio Error]', {
      url: mediaUrl?.substring(0, 60) + '...',
      code: errorCode,
      message: errorMsg,
      mimeType: mediaMimeType,
      networkState: audio.networkState,
      readyState: audio.readyState
    });
    
    // Check if it's a format issue
    if (mediaMimeType?.includes('ogg') && !checkOggOpusSupport()) {
      setAudioError('Formato não suportado neste navegador');
    } else if (errorCode === 4) {
      setAudioError('Formato não suportado');
    } else if (errorCode === 2) {
      setAudioError('Erro de rede');
    } else {
      setAudioError('Não foi possível reproduzir');
    }
  };

  const handleImageError = (e: SyntheticEvent<HTMLImageElement>) => {
    console.error('[Image Error]', {
      url: mediaUrl?.substring(0, 60) + '...',
      naturalWidth: e.currentTarget.naturalWidth,
      naturalHeight: e.currentTarget.naturalHeight
    });
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    console.log('[Image Loaded]', { url: mediaUrl?.substring(0, 60) + '...' });
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current && audioReady) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      audioRef.current.currentTime = percentage * audioRef.current.duration;
    }
  };

  const handleDownloadMedia = () => {
    if (mediaUrl) {
      window.open(mediaUrl, '_blank');
    }
  };

  const renderMediaPending = () => (
    <div className={cn(
      "flex items-center gap-3 p-4 rounded-md animate-pulse min-w-[200px]",
      fromMe ? "bg-primary-foreground/10" : "bg-muted/50"
    )}>
      <Loader2 className="w-5 h-5 animate-spin opacity-70" />
      <div className="flex flex-col">
        <span className="text-sm opacity-80">Carregando mídia...</span>
        <span className="text-xs opacity-50">Aguarde um momento</span>
      </div>
    </div>
  );

  const renderMediaFailed = () => (
    <div className={cn(
      "flex flex-col items-center gap-2 p-4 rounded-md min-w-[200px]",
      fromMe ? "bg-destructive/10" : "bg-destructive/10"
    )}>
      <AlertCircle className="w-6 h-6 text-destructive" />
      <span className="text-sm text-muted-foreground">Mídia não disponível</span>
      {mediaError && (
        <span className="text-xs text-muted-foreground/70 text-center max-w-[180px] truncate">
          {mediaError}
        </span>
      )}
      {onRetryMedia && (
        <Button
          size="sm"
          variant="outline"
          className="mt-1"
          onClick={onRetryMedia}
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Tentar novamente
        </Button>
      )}
    </div>
  );

  const renderMediaTimestamp = () => (
    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/50 flex items-center gap-1">
      <span className="text-[11px] text-white/90 leading-none">{formatTime(sentAt)}</span>
      {fromMe && <span className="text-white/90">{getStatusIcon()}</span>}
    </div>
  );

  const renderAudioPlayer = () => {
    const hasValidMedia = isValidMediaUrl(mediaUrl);
    
    if (hasValidMedia) {
      const progressPercent = audioProgress || 0;
      const playedBars = Math.floor((progressPercent / 100) * waveformBars.length);
      
      // If there's an error, show fallback with download button
      if (audioError) {
        return (
          <div className={cn(
            "flex flex-col gap-2 py-2 px-2 min-w-[260px]",
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                fromMe ? "bg-primary-foreground/20" : "bg-muted-foreground/20"
              )}>
                <AlertCircle className="w-5 h-5 opacity-70" />
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-xs opacity-80">{audioError}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 mt-1 w-fit"
                  onClick={handleDownloadMedia}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Baixar áudio
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-1">
              <span className={cn(
                "text-[11px]",
                fromMe ? "text-primary-foreground/60" : "text-chatBubble-foreground/60"
              )}>
                {formatTime(sentAt)}
              </span>
              {getStatusIcon()}
            </div>
          </div>
        );
      }
      
      return (
        <div className={cn(
          "flex items-center gap-2 py-1.5 px-2 min-w-[280px]",
        )}>
          {/* Speed Control Button - only show when playing or has progress */}
          <button
            onClick={cyclePlaybackRate}
            className={cn(
              "h-7 px-2 rounded-full text-xs font-medium shrink-0 transition-colors",
              fromMe 
                ? "bg-primary-foreground/20 hover:bg-primary-foreground/30" 
                : "bg-muted-foreground/15 hover:bg-muted-foreground/25"
            )}
          >
            {playbackRate}x
          </button>
          
          {/* Play/Pause Button */}  
          <button
            onClick={handleAudioPlay}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors",
              fromMe 
                ? "bg-primary-foreground/20 hover:bg-primary-foreground/30" 
                : "bg-primary/15 hover:bg-primary/25"
            )}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </button>
          
          {/* Waveform with progress indicator */}
          <div className="flex-1 flex flex-col gap-1">
            <div className="relative h-[28px] flex items-center">
              {/* Waveform container */}
              <div 
                className="flex items-center gap-[2px] h-full w-full cursor-pointer"
                onClick={handleWaveformClick}
              >
                {waveformBars.map((height, index) => (
                  <div
                    key={index}
                    className={cn(
                      "w-[3px] rounded-full transition-colors duration-100",
                      index < playedBars
                        ? fromMe 
                          ? "bg-primary-foreground" 
                          : "bg-primary"
                        : fromMe 
                          ? "bg-primary-foreground/30" 
                          : "bg-primary/30"
                    )}
                    style={{ height: `${Math.max(height * 100, 15)}%` }}
                  />
                ))}
              </div>
              
              {/* Progress indicator dot */}
              <div 
                className={cn(
                  "absolute w-3 h-3 rounded-full shadow-sm transition-all duration-100 pointer-events-none",
                  fromMe ? "bg-primary-foreground" : "bg-primary"
                )}
                style={{ 
                  left: `calc(${progressPercent}% - 6px)`,
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}
              />
            </div>
            
            {/* Time indicators */}
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-[11px]",
                fromMe ? "text-primary-foreground/60" : "text-chatBubble-foreground/60"
              )}>
                {formatDuration(currentTime)}
              </span>
              <span className={cn(
                "text-[11px]",
                fromMe ? "text-primary-foreground/60" : "text-chatBubble-foreground/60"
              )}>
                {formatDuration(audioDuration)}
              </span>
            </div>
          </div>
          
          {/* Message timestamp and status */}
          <div className={cn(
            "flex items-center gap-1 shrink-0",
            fromMe ? "text-primary-foreground/60" : "text-chatBubble-foreground/60"
          )}>
            <span className="text-[11px]">{formatTime(sentAt)}</span>
            {getStatusIcon()}
          </div>
          
          <audio
            ref={audioRef}
            src={mediaUrl!}
            preload="metadata"
            onEnded={() => {
              setIsPlaying(false);
              // Don't reset progress - keep it at the end
              setAudioProgress(100);
              setCurrentTime(audioDuration);
            }}
            onTimeUpdate={handleAudioTimeUpdate}
            onLoadedMetadata={handleAudioLoadedMetadata}
            onCanPlay={() => setAudioReady(true)}
            onError={handleAudioError}
            className="hidden"
          />
        </div>
      );
    }
    
    return (
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-full min-w-[180px]",
        fromMe ? "bg-primary-foreground/10" : "bg-muted/50"
      )}>
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          fromMe ? "bg-primary-foreground/20" : "bg-muted-foreground/20"
        )}>
          <Mic className="w-5 h-5 opacity-50" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs">Áudio não disponível</span>
        </div>
      </div>
    );
  };

  const renderMedia = () => {
    // Check media status for proper state handling
    if (mediaStatus === 'pending') {
      return renderMediaPending();
    }
    
    if (mediaStatus === 'failed') {
      return renderMediaFailed();
    }

    // For 'ready' status or legacy messages (null status), check URL validity
    const hasValidMedia = isValidMediaUrl(mediaUrl);
    
    // If no valid URL but status is null (legacy), show as failed for retry
    if (!hasValidMedia && mediaStatus === null && messageType !== 'text' && messageType !== 'sticker') {
      // Legacy message with expired/invalid URL - treat as failed
      return renderMediaFailed();
    }

    switch (messageType) {
      case "image":
        if (hasValidMedia && !imageError) {
          return (
            <>
              <div 
                className="rounded-md overflow-hidden max-w-[280px] cursor-pointer relative"
                onClick={() => setViewerOpen(true)}
              >
                {imageLoading && (
                  <div className="absolute inset-0 bg-muted/50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin opacity-50" />
                  </div>
                )}
                <img
                  src={mediaUrl!}
                  alt={content || "Imagem"}
                  className="w-full h-auto object-cover"
                  onError={handleImageError}
                  onLoad={handleImageLoad}
                />
                {renderMediaTimestamp()}
              </div>
              <MediaViewer
                src={mediaUrl!}
                type="image"
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
              />
            </>
          );
        }
        return (
          <div className={cn(
            "flex flex-col items-center justify-center gap-2 p-6 rounded-md min-w-[200px]",
            fromMe ? "bg-primary-foreground/10" : "bg-muted/50"
          )}>
            <ImageIcon className="w-10 h-10 opacity-50" />
            <span className="text-xs opacity-70">Imagem não disponível</span>
            {hasValidMedia && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={handleDownloadMedia}
              >
                <Download className="w-3 h-3 mr-1" />
                Baixar
              </Button>
            )}
          </div>
        );

      case "video":
        if (hasValidMedia) {
          return (
            <>
              <div 
                className="rounded-md overflow-hidden max-w-[280px] cursor-pointer relative"
                onClick={() => setViewerOpen(true)}
              >
                <video
                  src={mediaUrl!}
                  className="w-full h-auto"
                  preload="metadata"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="w-6 h-6 text-black ml-1" />
                  </div>
                </div>
                {renderMediaTimestamp()}
              </div>
              <MediaViewer
                src={mediaUrl!}
                type="video"
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
              />
            </>
          );
        }
        return (
          <div className={cn(
            "flex flex-col items-center justify-center gap-2 p-6 rounded-md min-w-[200px]",
            fromMe ? "bg-primary-foreground/10" : "bg-muted/50"
          )}>
            <Video className="w-10 h-10 opacity-50" />
            <span className="text-xs opacity-70">Vídeo não disponível</span>
          </div>
        );

      case "audio":
        return renderAudioPlayer();

      case "document":
        return (
          <div 
            className={cn(
              "flex items-center gap-2 p-2 rounded-md transition-colors min-w-[220px]",
              hasValidMedia ? "cursor-pointer" : "",
              fromMe 
                ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" 
                : "bg-muted hover:bg-muted/80"
            )}
            onClick={() => hasValidMedia && window.open(mediaUrl!, "_blank")}
          >
            {/* Icon - fixed width */}
            <div className={cn(
              "w-9 h-9 rounded-md flex items-center justify-center shrink-0",
              fromMe ? "bg-primary-foreground/20" : "bg-primary/10"
            )}>
              <FileText className={cn(
                "w-5 h-5",
                fromMe ? "text-primary-foreground" : "text-primary"
              )} />
            </div>
            
            {/* Content area - 90% */}
            <div className="min-w-0 flex-[9]">
              <p className="text-sm font-medium truncate">
                {content || "Documento"}
              </p>
            </div>
            
            {/* Timestamp area - 10% */}
            <div className="flex flex-col items-end shrink-0 gap-0.5">
              <span className={cn(
                "text-[11px] leading-none whitespace-nowrap",
                fromMe ? "text-primary-foreground/60" : "text-chatBubble-foreground/60"
              )}>
                {formatTime(sentAt)}
              </span>
              {fromMe && getStatusIcon()}
            </div>
          </div>
        );

      case "sticker":
        return (
          <div className="text-4xl">🎭</div>
        );

      default:
        return null;
    }
  };

  const isMediaMessage = messageType !== "text";
  const isMediaWithOverlayTimestamp = (messageType === "image" || messageType === "video") && isValidMediaUrl(mediaUrl) && !imageError;
  const isAudioMessage = messageType === "audio";

  return (
    <div 
      className={cn(
        "flex w-full mb-1 animate-fade-in",
        fromMe ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn(
        "max-w-[75%] rounded-lg px-2 py-1.5 relative overflow-hidden",
        fromMe 
          ? "bg-primary text-primary-foreground rounded-br-[4px]" 
          : "bg-chatBubble text-chatBubble-foreground rounded-bl-[4px]"
      )}>
        {/* Sender name for groups */}
        {isGroup && !fromMe && senderName && (
          <p className="text-xs font-semibold text-primary mb-0.5">{senderName}</p>
        )}

        {/* Media content */}
        {isMediaMessage && renderMedia()}

        {/* Text content */}
        {content && messageType === "text" && (
          <p className="text-[14.2px] leading-[19px] whitespace-pre-wrap break-words">
            {content}
            {/* Invisible spacer for timestamp */}
            <span className="inline-block w-[60px]"></span>
          </p>
        )}

        {/* Inline timestamp for text messages and non-overlay media (except audio which has its own) */}
        {(!isMediaWithOverlayTimestamp && !isAudioMessage) && (
          <span className={cn(
            "float-right -mt-4 ml-2 flex items-center gap-0.5",
            fromMe ? "text-primary-foreground/60" : "text-chatBubble-foreground/60"
          )}>
            <span className="text-[11px] leading-none">{formatTime(sentAt)}</span>
            {getStatusIcon()}
          </span>
        )}
      </div>
    </div>
  );
}
