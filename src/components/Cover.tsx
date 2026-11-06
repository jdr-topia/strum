import clsx from 'clsx';
import { Music } from 'lucide-react';
import { useState } from 'react';
import { gradientFor } from '@/lib/gradient';

interface CoverProps {
  src?: string | null;
  /** Used to pick a stable fallback gradient. */
  seed: string;
  alt?: string;
  className?: string;
  rounded?: 'sm' | 'md' | 'full';
}

const radius = { sm: 'rounded', md: 'rounded-lg', full: 'rounded-full' };

export function Cover({ src, seed, alt = '', className, rounded = 'sm' }: CoverProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = !!src && failedSrc !== src;

  return (
    <div
      className={clsx(
        'relative aspect-square shrink-0 overflow-hidden',
        radius[rounded],
        className,
      )}
      style={showImage ? undefined : { backgroundImage: gradientFor(seed) }}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="size-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <Music className="absolute inset-0 m-auto size-1/3 text-white/70" aria-hidden />
      )}
    </div>
  );
}
