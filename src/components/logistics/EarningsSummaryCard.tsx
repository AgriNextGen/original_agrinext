import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Truck, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';

interface EarningsSummaryCardProps {
  forwardEarnings: number;
  reverseEarnings: number;
  combinedEarnings: number;
  tripCount: number;
  className?: string;
}

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function EarningsSummaryCard({
  forwardEarnings,
  reverseEarnings,
  combinedEarnings,
  tripCount,
  className,
}: EarningsSummaryCardProps) {
  const { t } = useLanguage();

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5 text-green-600" />
          {t('logistics.earningsSummary')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-green-700 mb-4">
          {formatINR(combinedEarnings)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-blue-50 p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Truck className="h-4 w-4" />
              {t('logistics.forwardEarnings')}
            </div>
            <p className="text-lg font-semibold">{formatINR(forwardEarnings)}</p>
          </div>
          <div className="rounded-lg bg-orange-50 p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <RotateCcw className="h-4 w-4" />
              {t('logistics.reverseEarnings')}
            </div>
            <p className="text-lg font-semibold">{formatINR(reverseEarnings)}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          {t('logistics.fromTrips').replace('{count}', String(tripCount))}
        </p>
      </CardContent>
    </Card>
  );
}
