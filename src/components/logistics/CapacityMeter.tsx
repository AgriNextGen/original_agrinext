import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';

interface CapacityMeterProps {
  totalKg: number | null;
  usedKg: number;
  label?: string;
  showValues?: boolean;
  className?: string;
}

export default function CapacityMeter({
  totalKg,
  usedKg,
  label,
  showValues = true,
  className,
}: CapacityMeterProps) {
  const { t } = useLanguage();
  const total = totalKg ?? 0;
  const pct = total > 0 ? Math.min(Math.round((usedKg / total) * 100), 100) : 0;
  const remaining = Math.max(total - usedKg, 0);

  const barColor =
    pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-green-600';

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <p className="text-sm font-medium">{label}</p>}
      <Progress value={pct} className="h-2.5" />
      {showValues && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {t('logistics.capacityUsed')}: <span className={cn('font-medium', barColor)}>{usedKg} kg ({pct}%)</span>
          </span>
          <span>
            {t('logistics.capacityRemaining')}: <span className="font-medium">{remaining} kg</span>
          </span>
        </div>
      )}
    </div>
  );
}
