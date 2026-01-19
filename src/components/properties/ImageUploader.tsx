import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, X, Loader2, Image as ImageIcon, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  images: string[];
  mainImage: string;
  onImagesChange: (images: string[], mainImage: string) => void;
  organizationId?: string;
  propertyId?: string;
}

export function ImageUploader({
  images,
  mainImage,
  onImagesChange,
  organizationId,
  propertyId,
}: ImageUploaderProps) {
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const uploadFile = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    
    // Estrutura segura: /orgs/{org_id}/properties/{property_id}/...
    // Se não tiver org_id, buscar do usuário logado
    let orgId = organizationId;
    if (!orgId) {
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.user.id)
          .single();
        orgId = profile?.organization_id || undefined;
      }
    }
    
    if (!orgId) {
      console.error('Upload error: organization_id not found');
      toast.error('Erro: Organização não encontrada');
      return null;
    }
    
    const propFolder = propertyId || 'temp';
    const fileName = `orgs/${orgId}/properties/${propFolder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('properties')
      .upload(fileName, file);
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }
    
    const { data } = supabase.storage.from('properties').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleMainImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Arquivo não é uma imagem válida');
      return;
    }
    
    setUploadingMain(true);
    try {
      const url = await uploadFile(file);
      if (url) {
        onImagesChange(images, url);
        toast.success('Imagem principal enviada!');
      }
    } catch (error: any) {
      toast.error('Erro ao enviar imagem: ' + error.message);
    } finally {
      setUploadingMain(false);
      e.target.value = '';
    }
  }, [images, onImagesChange]);

  const handleGalleryUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingGallery(true);
    const newUrls: string[] = [];
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} não é uma imagem válida`);
          continue;
        }
        
        const url = await uploadFile(file);
        if (url) {
          newUrls.push(url);
        }
      }
      
      if (newUrls.length > 0) {
        const updatedImages = [...images, ...newUrls];
        onImagesChange(updatedImages, mainImage);
        toast.success(`${newUrls.length} imagem(s) adicionada(s) à galeria!`);
      }
    } catch (error: any) {
      toast.error('Erro ao enviar imagens: ' + error.message);
    } finally {
      setUploadingGallery(false);
      e.target.value = '';
    }
  }, [images, mainImage, onImagesChange]);

  const removeFromGallery = (url: string) => {
    const updatedImages = images.filter(img => img !== url);
    onImagesChange(updatedImages, mainImage);
  };

  const removeMainImage = () => {
    onImagesChange(images, '');
  };

  const promoteToMain = (url: string) => {
    const updatedImages = images.filter(img => img !== url);
    if (mainImage) {
      updatedImages.unshift(mainImage);
    }
    onImagesChange(updatedImages, url);
    toast.success('Imagem promovida para principal!');
  };

  return (
    <div className="space-y-6">
      {/* Main Image Section */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Imagem Principal</Label>
        <p className="text-sm text-muted-foreground">Esta imagem será exibida em destaque nos anúncios</p>
        
        {mainImage ? (
          <div className="relative w-full max-w-md aspect-video rounded-lg overflow-hidden border-2 border-primary group">
            <img 
              src={mainImage} 
              alt="Imagem principal" 
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded font-medium flex items-center gap-1">
              <Star className="h-3 w-3 fill-current" />
              Principal
            </div>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <label className="cursor-pointer">
                <Button type="button" variant="secondary" size="sm" asChild>
                  <span>Trocar imagem</span>
                </Button>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleMainImageUpload}
                  disabled={uploadingMain}
                />
              </label>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={removeMainImage}
              >
                Remover
              </Button>
            </div>
          </div>
        ) : (
          <label className={cn(
            "flex flex-col items-center justify-center w-full max-w-md aspect-video border-2 border-dashed rounded-lg cursor-pointer",
            "hover:bg-muted/50 transition-colors border-primary/50",
            uploadingMain && "opacity-50 cursor-not-allowed"
          )}>
            <div className="flex flex-col items-center justify-center py-6">
              {uploadingMain ? (
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              ) : (
                <>
                  <Star className="h-10 w-10 text-primary/60 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-primary">Clique para enviar</span> a imagem principal
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG até 10MB</p>
                </>
              )}
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleMainImageUpload}
              disabled={uploadingMain}
            />
          </label>
        )}
      </div>

      {/* Gallery Section */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Galeria de Fotos</Label>
        <p className="text-sm text-muted-foreground">Adicione mais fotos do imóvel para exibir na galeria</p>
        
        {/* Upload area */}
        <label className={cn(
          "flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer",
          "hover:bg-muted/50 transition-colors",
          uploadingGallery && "opacity-50 cursor-not-allowed"
        )}>
          <div className="flex flex-col items-center justify-center py-4">
            {uploadingGallery ? (
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-primary">Clique para enviar</span> ou arraste arquivos
                </p>
                <p className="text-xs text-muted-foreground mt-1">Múltiplas imagens permitidas</p>
              </>
            )}
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            multiple
            onChange={handleGalleryUpload}
            disabled={uploadingGallery}
          />
        </label>

        {/* Gallery grid */}
        {images.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((url, index) => (
              <div 
                key={url} 
                className="relative aspect-square rounded-lg overflow-hidden group border"
              >
                <img 
                  src={url} 
                  alt={`Foto ${index + 1}`} 
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay - always visible on mobile, hover on desktop */}
                <div className="absolute inset-0 bg-black/50 sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => promoteToMain(url)}
                    title="Promover para principal"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removeFromGallery(url)}
                    title="Remover"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Nenhuma foto na galeria</p>
              <p className="text-xs text-muted-foreground">Adicione mais fotos do imóvel</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
