"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import useEmblaCarousel from "embla-carousel-react";
import {
  ChevronLeft,
  ChevronRight,
  ImageIcon
} from "lucide-react";

interface Keyframe {
  id: string;
  timestamp: number;
  blobUrl: string;
  description?: string;
  confidence?: number;
  category?: string;
}

interface KeyMomentsSlideshowProps {
  keyframes: Keyframe[];
}

const formatTimestamp = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const KeyMomentsSlideshow = ({ keyframes }: KeyMomentsSlideshowProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    loop: false,
    skipSnaps: false,
    dragFree: false,
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);

    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        scrollNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [scrollPrev, scrollNext]);

  if (!keyframes || keyframes.length === 0) return null;

  const currentKeyframe = keyframes[currentIndex];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h3 className="font-semibold flex items-center justify-center gap-2 text-lg">
          <ImageIcon className="h-5 w-5" />
          Key Moments
        </h3>
        <p className="text-sm text-muted-foreground">
          {keyframes.length} moments • Use ← → keys to navigate
        </p>
      </div>

      <div className="relative">
        {/* Embla Carousel Container */}
        <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
          <div className="flex">
            {keyframes.map((keyframe, index) => (
              <div
                key={keyframe.id}
                className="flex-[0_0_100%] min-w-0 relative"
              >
                <div className="relative aspect-video bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl overflow-hidden">
                  <Image
                    src={keyframe.blobUrl}
                    alt={keyframe.description || `Keyframe at ${formatTimestamp(keyframe.timestamp)}`}
                    className="w-full h-full object-contain"
                    fill
                    sizes="(max-width: 768px) 100vw, 800px"
                    priority={index === currentIndex}
                  />

                  {/* Gradient Overlay for Better Text Readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                  {/* Navigation Buttons */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white border-0 h-12 w-12 p-0 backdrop-blur-sm transition-all duration-200 hover:scale-110"
                    onClick={scrollPrev}
                    disabled={!canScrollPrev}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white border-0 h-12 w-12 p-0 backdrop-blur-sm transition-all duration-200 hover:scale-110"
                    onClick={scrollNext}
                    disabled={!canScrollNext}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>

                  {/* Slide Counter */}
                  <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white text-sm px-3 py-1.5 rounded-full border border-white/10">
                    {currentIndex + 1} of {keyframes.length}
                  </div>

                  {/* Timestamp and Metadata */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-3">
                    <span className="bg-black/50 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full border border-white/10">
                      {formatTimestamp(keyframe.timestamp)}
                    </span>
                    {keyframe.confidence && (
                      <Badge variant="outline" className="text-xs bg-black/50 backdrop-blur-sm text-white border-white/20">
                        {Math.round(keyframe.confidence * 100)}% confidence
                      </Badge>
                    )}
                    {keyframe.category && (
                      <Badge variant="secondary" className="text-xs bg-white/10 backdrop-blur-sm text-white border-white/20">
                        {keyframe.category}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mt-6">
          {keyframes.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-primary scale-125'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
              onClick={() => emblaApi?.scrollTo(index)}
            />
          ))}
        </div>
      </div>

      {/* Description - Centered and Spaced */}
      {currentKeyframe.description && (
        <div className="text-center space-y-2 max-w-3xl mx-auto">
          <p className="text-base text-muted-foreground leading-relaxed">
            {currentKeyframe.description}
          </p>
        </div>
      )}
    </div>
  );
};