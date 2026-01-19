import { cn } from '@/lib/utils';

type WaveformProps = {
  className?: string;
  variant: 'speaking' | 'listening' | 'idle';
};

export function Waveform({ className, variant }: WaveformProps) {
  return (
    <div
      className={cn('flex items-center justify-center space-x-1.5', className)}
    >
      {[...Array(5)].map((_, i) => (
        <span
          key={i}
          className={cn('h-2 w-1 rounded-full bg-current transition-all', {
            'animate-wave': variant !== 'idle',
            'bg-primary': variant === 'speaking',
            'bg-accent': variant === 'listening',
            'bg-muted-foreground/50': variant === 'idle',
          })}
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}
