import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, X, Upload, Loader2 } from "lucide-react";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface AudioRecorderInlineProps {
  onUploaded: (url: string) => void;
}

export function AudioRecorderInline({ onUploaded }: AudioRecorderInlineProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const {
    isRecording,
    duration,
    base64,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
    clearRecording,
    formatDuration,
  } = useAudioRecorder();

  const orgId = profile?.organization_id;

  const handleStart = async () => {
    try {
      await startRecording();
    } catch {
      toast.error("Microfone não disponível");
    }
  };

  const handleUpload = async () => {
    if (!audioBlob || !orgId) return;

    setIsUploading(true);
    try {
      const fileName = `${Date.now()}-voice-${Math.random().toString(36).slice(2, 6)}.ogg`;
      const filePath = `${orgId}/audios/${fileName}`;

      const { error } = await supabase.storage
        .from("automation-media")
        .upload(filePath, audioBlob, {
          cacheControl: "3600",
          upsert: false,
          contentType: "audio/ogg; codecs=opus",
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from("automation-media")
        .getPublicUrl(filePath);

      queryClient.invalidateQueries({ queryKey: ["automation-media", orgId, "audio"] });
      onUploaded(data.publicUrl);
      clearRecording();
      toast.success("Áudio gravado e salvo!");
    } catch (err: any) {
      toast.error("Erro ao salvar áudio: " + (err.message || ""));
    } finally {
      setIsUploading(false);
    }
  };

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 bg-destructive/10 rounded-lg px-3 py-2">
        <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
        <span className="text-xs font-medium text-destructive min-w-[36px]">
          {formatDuration(duration)}
        </span>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelRecording}>
          <X className="h-3.5 w-3.5" />
        </Button>
        <Button variant="default" size="icon" className="h-7 w-7" onClick={stopRecording}>
          <Square className="h-3 w-3 fill-current" />
        </Button>
      </div>
    );
  }

  if (base64) {
    return (
      <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-2">
        <span className="text-xs font-medium text-primary">Áudio gravado</span>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearRecording}>
          <X className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="default"
          size="icon"
          className="h-7 w-7"
          onClick={handleUpload}
          disabled={isUploading}
        >
          {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 text-xs w-full"
      onClick={handleStart}
    >
      <Mic className="h-3.5 w-3.5 mr-1.5" />
      Gravar áudio
    </Button>
  );
}
