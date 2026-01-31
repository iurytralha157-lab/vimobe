import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, X, Images, Play, Download } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { downloadWithWatermark, getPositionClasses, WatermarkPosition } from '@/lib/watermark-utils';

interface PropertyGalleryProps {
  images: string[];
  title: string;
  primaryColor?: string;
  videoUrl?: string | null;
  watermarkEnabled?: boolean;
  watermarkOpacity?: number;
  watermarkUrl?: string | null;
  watermarkSize?: number;
  watermarkPosition?: WatermarkPosition;
}

export default function PropertyGallery({ 
  images, 
  title, 
  primaryColor = '#F97316',
  videoUrl,
  watermarkEnabled = false,
  watermarkOpacity = 20,
  watermarkUrl,
  watermarkSize = 80,
  watermarkPosition = 'bottom-right',
}: PropertyGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  // Embla carousel com transição suave e drag
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    dragFree: false,
    containScroll: 'trimSnaps',
    slidesToScroll: 1,
    duration: 25, // Transição mais suave (maior = mais lento)
  });

  const [lightboxEmblaRef, lightboxEmblaApi] = useEmblaCarousel({ 
    loop: true,
    startIndex: currentIndex,
    duration: 20,
  });

  const allMedia = images.filter(Boolean);
  const hasMultiple = allMedia.length > 1;

  // Sync embla with currentIndex
  useEffect(() => {
    if (emblaApi) {
      emblaApi.on('select', () => {
        setCurrentIndex(emblaApi.selectedScrollSnap());
      });
    }
  }, [emblaApi]);

  // Sync lightbox embla
  useEffect(() => {
    if (lightboxEmblaApi) {
      lightboxEmblaApi.on('select', () => {
        setCurrentIndex(lightboxEmblaApi.selectedScrollSnap());
      });
    }
  }, [lightboxEmblaApi]);

  // Scroll to index when lightbox opens
  useEffect(() => {
    if (lightboxOpen && lightboxEmblaApi) {
      lightboxEmblaApi.scrollTo(currentIndex, true);
    }
  }, [lightboxOpen, lightboxEmblaApi, currentIndex]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const lightboxScrollPrev = useCallback(() => {
    if (lightboxEmblaApi) lightboxEmblaApi.scrollPrev();
  }, [lightboxEmblaApi]);

  const lightboxScrollNext = useCallback(() => {
    if (lightboxEmblaApi) lightboxEmblaApi.scrollNext();
  }, [lightboxEmblaApi]);

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') lightboxScrollPrev();
      if (e.key === 'ArrowRight') lightboxScrollNext();
      if (e.key === 'Escape') setLightboxOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, lightboxScrollPrev, lightboxScrollNext]);

  // Extract YouTube video ID
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    return match ? match[1] : null;
  };

  const youtubeId = videoUrl ? getYouTubeId(videoUrl) : null;

  const handleDownload = async (imageUrl: string, index: number) => {
    const filename = `${title.replace(/[^a-zA-Z0-9]/g, '-')}-${index + 1}.jpg`;
    if (watermarkEnabled && watermarkUrl) {
      await downloadWithWatermark(imageUrl, watermarkUrl, watermarkOpacity, filename, watermarkSize);
    } else {
      // Direct download without watermark
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };
  if (allMedia.length === 0) {
    return (
      <div className="w-full h-[300px] md:h-[400px] bg-gray-200 flex items-center justify-center">
        <Images className="w-16 h-16 text-gray-400" />
      </div>
    );
  }

  return (
    <>
      {/* Fullwidth Gallery Carousel with Embla */}
      <div className="relative w-full">
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
              {/* Embla Carousel */}
              <div className="overflow-hidden h-full cursor-grab active:cursor-grabbing" ref={emblaRef}>
                <div className="flex h-full">
                  {allMedia.map((img, index) => (
                    <div
                      key={index}
                      className="flex-[0_0_50%] md:flex-[0_0_25%] min-w-0 h-full px-px"
                    >
                      <button
                        onClick={() => {
                          setCurrentIndex(index);
                          setLightboxOpen(true);
                        }}
                        className="w-full h-full cursor-zoom-in overflow-hidden relative group"
                      >
                        <img
                          src={img}
                          alt={`${title} - Foto ${index + 1}`}
                          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                        
                        {/* Watermark Overlay */}
                        {watermarkEnabled && watermarkUrl && (
                          <div 
                            className={`absolute pointer-events-none select-none ${getPositionClasses(watermarkPosition)}`}
                            style={{ opacity: watermarkOpacity / 100 }}
                          >
                            <img 
                              src={watermarkUrl} 
                              alt=""
                              style={{ 
                                maxHeight: `${Math.max(20, watermarkSize * 0.3)}px`,
                                maxWidth: `${Math.max(40, watermarkSize * 0.8)}px`
                              }}
                              className="object-contain drop-shadow-lg"
                              draggable={false}
                            />
                          </div>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Arrows */}
              {hasMultiple && (
                <>
                  <button
                    onClick={scrollPrev}
                    className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-3 md:p-4 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all duration-200 z-10 hover:scale-105 active:scale-95"
                    aria-label="Fotos anteriores"
                  >
                    <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-800" />
                  </button>
                  <button
                    onClick={scrollNext}
                    className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-3 md:p-4 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all duration-200 z-10 hover:scale-105 active:scale-95"
                    aria-label="Próximas fotos"
                  >
                    <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-gray-800" />
                  </button>
                </>
              )}

              {/* Counter Badge */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm font-medium flex items-center gap-2">
                <Images className="w-4 h-4" />
                {currentIndex + 1} / {allMedia.length}
              </div>

              {/* View All Button */}
              <button
                onClick={() => setLightboxOpen(true)}
                className="absolute bottom-4 right-4 bg-white/95 hover:bg-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg transition-all duration-200 hover:scale-105"
              >
                <Images className="w-4 h-4" />
                Ver todas
              </button>

              {/* Video Button */}
              {youtubeId && (
                <button
                  onClick={() => setShowVideo(true)}
                  className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg transition-all duration-200"
                >
                  <Play className="w-4 h-4" />
                  Ver Vídeo
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lightbox Dialog with Embla */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            aria-label="Fechar"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative w-full h-[90vh] flex flex-col items-center justify-center">
            {/* Lightbox Embla Carousel */}
            <div className="overflow-hidden w-full h-full cursor-grab active:cursor-grabbing" ref={lightboxEmblaRef}>
              <div className="flex h-full items-center">
                {allMedia.map((img, index) => (
                  <div key={index} className="flex-[0_0_100%] min-w-0 h-full flex items-center justify-center p-4 relative">
                    <img
                      src={img}
                      alt={`${title} - Foto ${index + 1}`}
                      className="max-w-full max-h-full object-contain"
                    />
                    
                    {/* Watermark Overlay in Lightbox */}
                    {watermarkEnabled && watermarkUrl && (
                      <div 
                        className={`absolute pointer-events-none select-none ${getPositionClasses(watermarkPosition)}`}
                        style={{ opacity: watermarkOpacity / 100 }}
                      >
                        <img 
                          src={watermarkUrl} 
                          alt=""
                          style={{ 
                            maxHeight: `${Math.max(30, watermarkSize * 0.5)}px`,
                            maxWidth: `${Math.max(60, watermarkSize * 1.2)}px`
                          }}
                          className="object-contain drop-shadow-lg"
                          draggable={false}
                        />
                      </div>
                    )}
                    
                    {/* Download Button */}
                    <button
                      onClick={() => handleDownload(img, index)}
                      className="absolute bottom-20 left-8 p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-all duration-200 hover:scale-105"
                      aria-label="Baixar imagem"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {hasMultiple && (
              <>
                <button
                  onClick={lightboxScrollPrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all duration-200 hover:scale-105"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onClick={lightboxScrollNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all duration-200 hover:scale-105"
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
                  onClick={() => {
                    setCurrentIndex(index);
                    lightboxEmblaApi?.scrollTo(index);
                  }}
                  className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden transition-all duration-200 ${
                    index === currentIndex ? 'ring-2 ring-white scale-105' : 'opacity-50 hover:opacity-100'
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
