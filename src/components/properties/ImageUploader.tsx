import { useState, useCallback } from "react";
import { Upload, X, Star, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface ImageUploaderProps {
  mainImage: string | null;
  galleryImages: string[];
  onMainImageChange: (url: string | null) => void;
  onGalleryChange: (urls: string[]) => void;
  propertyId?: string;
  className?: string;
}

export function ImageUploader({
  mainImage,
  galleryImages,
  onMainImageChange,
  onGalleryChange,
  propertyId,
  className,
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { organization } = useAuth();

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!organization?.id) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Organização não encontrada",
      });
      return null;
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${organization.id}/${propertyId || "temp"}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("properties")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      toast({
        variant: "destructive",
        title: "Erro no upload",
        description: uploadError.message,
      });
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("properties")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleMainImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
        const url = await uploadImage(file);
        if (url) {
          onMainImageChange(url);
        }
      } finally {
        setIsUploading(false);
      }
    },
    [onMainImageChange, organization?.id, propertyId]
  );

  const handleGalleryUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;

      setIsUploading(true);
      try {
        const uploadPromises = files.map((file) => uploadImage(file));
        const urls = await Promise.all(uploadPromises);
        const validUrls = urls.filter((url): url is string => url !== null);

        if (validUrls.length > 0) {
          onGalleryChange([...galleryImages, ...validUrls]);
        }
      } finally {
        setIsUploading(false);
      }
    },
    [galleryImages, onGalleryChange, organization?.id, propertyId]
  );

  const handleRemoveMain = () => {
    onMainImageChange(null);
  };

  const handleRemoveGallery = (index: number) => {
    onGalleryChange(galleryImages.filter((_, i) => i !== index));
  };

  const promoteToMain = (index: number) => {
    const newMain = galleryImages[index];
    const newGallery = [...galleryImages];
    newGallery.splice(index, 1);

    if (mainImage) {
      newGallery.unshift(mainImage);
    }

    onMainImageChange(newMain);
    onGalleryChange(newGallery);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Image */}
      <div>
        <label className="text-sm font-medium mb-2 block">Imagem Principal</label>
        <div className="relative">
          {mainImage ? (
            <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
              <img
                src={mainImage}
                alt="Imagem principal"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={handleRemoveMain}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 cursor-pointer hover:border-muted-foreground/50 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleMainImageUpload}
                className="hidden"
                disabled={isUploading}
              />
              {isUploading ? (
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Clique para enviar a imagem principal
                  </span>
                </>
              )}
            </label>
          )}
        </div>
      </div>

      {/* Gallery */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Galeria de Imagens ({galleryImages.length})
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {galleryImages.map((url, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-lg overflow-hidden border bg-muted group"
            >
              <img
                src={url}
                alt={`Imagem ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => promoteToMain(index)}
                  title="Definir como principal"
                >
                  <Star className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleRemoveGallery(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}

          {/* Upload button */}
          <label className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 cursor-pointer hover:border-muted-foreground/50 transition-colors">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleGalleryUpload}
              className="hidden"
              disabled={isUploading}
            />
            {isUploading ? (
              <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
            ) : (
              <>
                <ImageIcon className="h-6 w-6 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground text-center px-2">
                  Adicionar
                </span>
              </>
            )}
          </label>
        </div>
      </div>
    </div>
  );
}
