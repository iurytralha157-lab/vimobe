import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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

  // Número de imagens visíveis no carrossel (4 no desktop, 2 no mobile)
  const visibleCount = typeof window !== 'undefined' && window.innerWidth < 768 ? 2 : 4;
  const maxStartIndex = Math.max(0, allMedia.length - visibleCount);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, maxStartIndex));
  }, [maxStartIndex]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setCurrentIndex((prev) => Math.max(prev - 1, 0));
      if (e.key === 'ArrowRight') setCurrentIndex((prev) => Math.min(prev + 1, allMedia.length - 1));
      if (e.key === 'Escape') setLightboxOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, allMedia.length]);

  // Extract YouTube video ID
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    return match ? match[1] : null;
  };

  const youtubeId = videoUrl ? getYouTubeId(videoUrl) : null;

  if (allMedia.length === 0) {
    return (
      <div className="w-full h-[300px] md:h-[400px] bg-gray-200 flex items-center justify-center">
        <Images className="w-16 h-16 text-gray-400" />
      </div>
    );
  }

  // Get visible images for the carousel
  const visibleImages = allMedia.slice(currentIndex, currentIndex + visibleCount);

  return (
    <>
      {/* Fullwidth Gallery Carousel - Nexo Style */}
      <div className="relative w-full mt-16 md:mt-20">
        {/* Main Carousel Container */}
        <div className="relative h-[300px] md:h-[450px] lg:h-[550px] overflow-hidden">
          {showVideo && youtubeId ? (
            <div className="w-full h-full bg-black flex items-center justify-center">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                title="Video do imóvel"
                className="w-full h-full max-w-4xl"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              <button
                onClick={() => setShowVideo(false)}
                className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full shadow-lg transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              {/* Images Grid - Side by Side */}
              <div className="flex h-full gap-1 md:gap-2">
                {visibleImages.map((img, index) => (
                  <button
                    key={currentIndex + index}
                    onClick={() => {
                      setCurrentIndex(currentIndex + index);
                      setLightboxOpen(true);
                    }}
                    className="flex-1 h-full cursor-zoom-in overflow-hidden relative group"
                  >
                    <img
                      src={img}
                      alt={`${title} - Foto ${currentIndex + index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </button>
                ))}
              </div>

              {/* Navigation Arrows */}
              {hasMultiple && currentIndex > 0 && (
                <button
                  onClick={prevSlide}
                  className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-3 md:p-4 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all z-10"
                  aria-label="Fotos anteriores"
                >
                  <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-800" />
                </button>
              )}
              {hasMultiple && currentIndex < maxStartIndex && (
                <button
                  onClick={nextSlide}
                  className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-3 md:p-4 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all z-10"
                  aria-label="Próximas fotos"
                >
                  <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-gray-800" />
                </button>
              )}

              {/* Counter Badge */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm font-medium flex items-center gap-2">
                <Images className="w-4 h-4" />
                {currentIndex + 1} - {Math.min(currentIndex + visibleCount, allMedia.length)} / {allMedia.length}
              </div>

              {/* View All Button */}
              <button
                onClick={() => setLightboxOpen(true)}
                className="absolute bottom-4 right-4 bg-white/95 hover:bg-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg transition-all"
              >
                <Images className="w-4 h-4" />
                Ver todas
              </button>

              {/* Video Button */}
              {youtubeId && (
                <button
                  onClick={() => setShowVideo(true)}
                  className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg transition-all"
                >
                  <Play className="w-4 h-4" />
                  Ver Vídeo
                </button>
              )}
            </>
          )}
        </div>
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
                  onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                  disabled={currentIndex === 0}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors disabled:opacity-30"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, allMedia.length - 1))}
                  disabled={currentIndex === allMedia.length - 1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors disabled:opacity-30"
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
