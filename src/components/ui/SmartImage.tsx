'use client';

/**
 * SmartImage — a thin wrapper around Next.js <Image> with two fallback layers:
 *
 * 1. If the resolved URL ends in .webp and fails to load (404/network), the
 *    component retries the same URL with the original file extension
 *    (png → webp, jpg → webp, etc.) by trying common alternatives.
 *    In practice the backend stores webp paths, so this mainly guards against
 *    older non-converted files.
 *
 * 2. If that also fails, it falls back to the placeholder SVG.
 */

import Image, { type ImageProps } from 'next/image';
import { useState, useEffect } from 'react';

const PLACEHOLDER = '/placeholder-product.svg';

/** Rewrite any raster image extension to .webp for faster load */
function getWebpUrl(url: string): string {
  if (!url) return '';
  const extRegex = /\.(png|jpe?g|gif|bmp)(\?.*)?$/i;
  return url.replace(extRegex, '.webp$2');
}

/** Generate all fallback candidates to try when initial loading fails */
function getFallbackCandidates(originalUrl: string, webpUrl: string): string[] {
  if (!originalUrl) return [];
  
  const list = new Set<string>();
  
  // 1. First fallback: try the original path from the database
  if (originalUrl !== webpUrl) {
    list.add(originalUrl);
  }
  
  // 2. Try common formats (png, jpg, jpeg) in case of format mismatches
  const extRegex = /\.(webp|png|jpe?g|gif|bmp)(\?.*)?$/i;
  const match = originalUrl.match(extRegex);
  if (match) {
    const ext = match[1].toLowerCase();
    if (ext === 'webp') {
      list.add(originalUrl.replace(extRegex, '.png$2'));
      list.add(originalUrl.replace(extRegex, '.jpg$2'));
      list.add(originalUrl.replace(extRegex, '.jpeg$2'));
    } else {
      // If original format failed, also try common alternatives
      if (ext !== 'png') list.add(originalUrl.replace(extRegex, '.png$2'));
      if (ext !== 'jpg') list.add(originalUrl.replace(extRegex, '.jpg$2'));
      if (ext !== 'jpeg') list.add(originalUrl.replace(extRegex, '.jpeg$2'));
    }
  }
  
  return Array.from(list);
}

type SmartImageProps = Omit<ImageProps, 'onError'> & {
  /** Original/source URL before any processing. Used as first fallback. */
  originalSrc?: string;
};

export function SmartImage({ src, originalSrc, alt, ...rest }: SmartImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string | typeof src>(src);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [candidateIndex, setCandidateIndex] = useState(-1);

  // Synchronize state when src prop changes
  useEffect(() => {
    if (typeof src === 'string') {
      const targetWebp = getWebpUrl(src);
      setCurrentSrc(targetWebp);
      
      const list = getFallbackCandidates(src, targetWebp);
      setCandidates(list);
      setCandidateIndex(0);
    } else {
      setCurrentSrc(src);
      setCandidates([]);
      setCandidateIndex(-1);
    }
  }, [src]);

  const handleError = () => {
    if (candidateIndex >= 0 && candidateIndex < candidates.length) {
      const nextSrc = candidates[candidateIndex];
      setCurrentSrc(nextSrc);
      setCandidateIndex(prev => prev + 1);
    } else if (currentSrc !== PLACEHOLDER) {
      setCurrentSrc(PLACEHOLDER);
    }
  };

  return (
    <Image
      {...rest}
      src={currentSrc}
      alt={alt}
      onError={handleError}
      unoptimized
    />
  );
}

export default SmartImage;
