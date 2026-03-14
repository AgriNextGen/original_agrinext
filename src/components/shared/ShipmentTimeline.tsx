import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ShipmentStatus } from '@/services/logistics/types';

const TIMELINE_STEPS: { status: ShipmentStatus; label: string }[] = [
  { status: 'draft', label: 'Draft' },
  { status: 'pending', label: 'Pending' },
  { status: 'pooled', label: 'Pooled' },
  { status: 'booked', label: 'Booked' },
  { status: 'in_transit', label: 'In Transit' },
  { status: 'delivered', label: 'Delivered' },
  { status: 'completed', label: 'Completed' },
];

const STATUS_ORDER: Record<ShipmentStatus, number> = {
  draft: 0,
  pending: 1,
  pooled: 2,
  booked: 3,
  in_transit: 4,
  delivered: 5,
  completed: 6,
  cancelled: -1,
};

interface ShipmentTimelineProps {
  currentStatus: ShipmentStatus;
  className?: string;
}

export function ShipmentTimeline({ currentStatus, className }: ShipmentTimelineProps) {
  if (currentStatus === 'cancelled') {
    return (
      <div className={cn('flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200', className)}>
        <Circle className="h-4 w-4 text-red-500" />
        <span className="text-sm font-medium text-red-700">Cancelled</span>
      </div>
    );
  }

  const currentOrder = STATUS_ORDER[currentStatus] ?? 0;

  return (
    <div className={cn('space-y-0', className)}>
      {TIMELINE_STEPS.map((step, i) => {
        const stepOrder = STATUS_ORDER[step.status];
        const isCompleted = stepOrder < currentOrder;
        const isCurrent = step.status === currentStatus;

        return (
          <div key={step.status} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center border-2',
                  isCompleted
                    ? 'bg-green-500 border-green-500'
                    : isCurrent
                    ? 'bg-primary border-primary'
                    : 'bg-background border-muted-foreground/30'
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5 text-white" />
                ) : isCurrent ? (
                  <Circle className="h-2.5 w-2.5 fill-primary-foreground text-primary-foreground" />
                ) : null}
              </div>
              {i < TIMELINE_STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-0.5 h-6',
                    isCompleted ? 'bg-green-500' : 'bg-muted-foreground/20'
                  )}
                />
              )}
            </div>
            <div className="pb-3">
              <p
                className={cn(
                  'text-sm font-medium',
                  isCompleted
                    ? 'text-green-700'
                    : isCurrent
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                {step.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
