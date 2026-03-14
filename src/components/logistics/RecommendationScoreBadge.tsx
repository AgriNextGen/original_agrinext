import { cn } from '@/lib/utils';

interface RecommendationScoreBadgeProps {
  score: number;
  className?: string;
}

export function RecommendationScoreBadge({ score, className }: RecommendationScoreBadgeProps) {
  const rounded = Math.round(score);
  const color =
    rounded >= 80 ? 'bg-green-100 text-green-800'
    : rounded >= 50 ? 'bg-amber-100 text-amber-800'
    : 'bg-red-100 text-red-700';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        color,
        className,
      )}
    >
      {rounded}
    </span>
  );
}
