import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Images, Play } from 'lucide-react';

interface PropertyGalleryProps {
  images: string[];
  title: string;
  primaryColor?: string;
  videoUrl?: string | null;
}

export default function PropertyGallery({ 
  images, 
  title, 
  primaryColor = '#F97316',
  videoUrl 
}: PropertyGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const allMedia = images.filter(Boolean);
  const hasMultiple = allMedia.length > 1;

  const nextImage = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % allMedia.length);
  }, [allMedia.length]);

  const prevImage = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length);
  }, [allMedia.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'Escape') setLightboxOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, nextImage, prevImage]);

  if (allMedia.length === 0) {
    return (
      <div className="relative w-full h-[300px] md:h-[400px] lg:h-[500px] bg-gray-200 rounded-2xl flex items-center justify-center">
        <Images className="w-16 h-16 text-gray-400" />
      </div>
    );
  }

  // Extract YouTube video ID
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    return match ? match[1] : null;
  };

  const youtubeId = videoUrl ? getYouTubeId(videoUrl) : null;

  return (
    <>
      {/* Main Gallery */}
      <div className="relative">
        {/* Main Image */}
        <div className="relative w-full h-[300px] md:h-[400px] lg:h-[500px] bg-gray-900 rounded-2xl overflow-hidden">
          {showVideo && youtubeId ? (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
              title="Video do imóvel"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <button 
              onClick={() => setLightboxOpen(true)}
              className="w-full h-full cursor-zoom-in"
            >
              <img
                src={allMedia[currentIndex]}
                alt={`${title} - Foto ${currentIndex + 1}`}
                className="w-full h-full object-contain"
              />
            </button>
          )}

          {/* Navigation Arrows */}
          {hasMultiple && !showVideo && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all backdrop-blur-sm"
                aria-label="Foto anterior"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all backdrop-blur-sm"
                aria-label="Próxima foto"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Counter Badge */}
          {hasMultiple && !showVideo && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm font-medium">
              {currentIndex + 1} / {allMedia.length}
            </div>
          )}

          {/* View All Button */}
          <button
            onClick={() => setLightboxOpen(true)}
            className="absolute bottom-4 right-4 bg-white/95 hover:bg-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg transition-all"
          >
            <Images className="w-4 h-4" />
            Ver todas ({allMedia.length})
          </button>

          {/* Video Button */}
          {youtubeId && !showVideo && (
            <button
              onClick={() => setShowVideo(true)}
              className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg transition-all"
            >
              <Play className="w-4 h-4" />
              Ver Vídeo
            </button>
          )}

          {/* Close Video Button */}
          {showVideo && (
            <button
              onClick={() => setShowVideo(false)}
              className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full shadow-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Thumbnails */}
        {hasMultiple && (
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {allMedia.map((img, index) => (
              <button
                key={index}
                onClick={() => { setCurrentIndex(index); setShowVideo(false); }}
                className={`flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden transition-all ${
                  index === currentIndex && !showVideo
                    ? 'ring-2 ring-offset-2 opacity-100'
                    : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  ['--tw-ring-color' as any]: primaryColor,
                }}
              >
                <img 
                  src={img}
                  alt={`Miniatura ${index + 1}`} 
                  className="w-full h-full object-cover" 
                />
              </button>
            ))}
            {/* Video Thumbnail */}
            {youtubeId && (
              <button
                onClick={() => setShowVideo(true)}
                className={`flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden transition-all relative ${
                  showVideo
                    ? 'ring-2 ring-offset-2 opacity-100'
                    : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  ['--tw-ring-color' as any]: primaryColor,
                }}
              >
                <img 
                  src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`} 
                  alt="Vídeo" 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Play className="w-6 h-6 text-white" />
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            aria-label="Fechar"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative w-full h-[90vh] flex items-center justify-center">
            <img
              src={allMedia[currentIndex]}
              alt={`${title} - Foto ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />

            {hasMultiple && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}

            {/* Thumbnail strip in lightbox */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 p-2 rounded-xl backdrop-blur-sm max-w-[90vw] overflow-x-auto">
              {allMedia.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden transition-all ${
                    index === currentIndex ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
