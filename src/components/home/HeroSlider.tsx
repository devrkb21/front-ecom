'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getImageUrl } from '@/utils';
import { SmartImage } from '@/components/ui';

export interface HeroSlide {
  title?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  button_text?: string;
  button_link?: string;
  enabled?: boolean;
}

interface HeroSliderProps {
  slides: HeroSlide[];
}

export function HeroSlider({ slides }: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const nextSlide = useCallback(() => {
    if (slides.length <= 1) return;
    setIsTransitioning(true);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = () => {
    if (slides.length <= 1) return;
    setIsTransitioning(true);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + slides.length) % slides.length);
  };

  const goToSlide = (slideIndex: number) => {
    if (slideIndex === currentIndex) return;
    setIsTransitioning(true);
    setCurrentIndex(slideIndex);
  };

  // Auto-play timer
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(nextSlide, 5000); // 5 seconds
    return () => clearInterval(interval);
  }, [nextSlide, slides.length]);

  // Transition reset
  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => setIsTransitioning(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  if (!slides || slides.length === 0) return null;

  return (
    <section className="relative w-full overflow-hidden group">
      {/* Slides Viewport */}
      <div className="relative h-[320px] sm:h-[380px] md:h-[450px] lg:h-[520px] w-full bg-slate-900">
        {slides.map((slide, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={index}
              className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
                isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {/* Background Image / Gradient */}
              {slide.image ? (
                <>
                  <div className="absolute inset-0">
                    <SmartImage
                      src={getImageUrl(slide.image)}
                      alt={slide.title || 'Promo Banner'}
                      fill
                      className="object-cover transition-transform duration-[5000ms] ease-out scale-100 group-hover:scale-105"
                      sizes="100vw"
                      priority={index === 0}
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/45 md:bg-black/30" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-accent-700 via-accent-600 to-accent-500" />
              )}

              {/* Text content card overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`text-center text-white px-4 max-w-4xl mx-auto transform transition-all duration-700 ${
                  isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-4 text-balance drop-shadow-md">
                    {slide.title}
                  </h1>
                  
                  {slide.subtitle && (
                    <p className="text-sm sm:text-base md:text-lg text-white/95 mb-5 md:mb-6 max-w-2xl mx-auto text-balance font-medium drop-shadow-sm">
                      {slide.subtitle}
                    </p>
                  )}
                  
                  {slide.description && (
                    <p className="hidden md:block text-xs md:text-sm text-white/80 mb-6 max-w-xl mx-auto text-balance">
                      {slide.description}
                    </p>
                  )}
                  
                  {slide.button_text && (
                    <Link
                      href={slide.button_link || '/products'}
                      className="inline-flex items-center px-6 py-2.5 sm:px-8 sm:py-3 bg-white text-gray-900 font-semibold text-xs sm:text-sm rounded-lg hover:bg-gray-100 hover:scale-105 shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      {slide.button_text}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows (Show only if more than 1 slide) */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-black/25 hover:bg-black/45 text-white hover:scale-105 transition-all duration-200 backdrop-blur-xs opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          
          <button
            type="button"
            onClick={nextSlide}
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-black/25 hover:bg-black/45 text-white hover:scale-105 transition-all duration-200 backdrop-blur-xs opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </>
      )}

      {/* Slide dots indicators (Show only if more than 1 slide) */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToSlide(index)}
              className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 ${
                index === currentIndex ? 'w-6 sm:w-8 bg-white' : 'w-2 sm:w-2.5 bg-white/40 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
