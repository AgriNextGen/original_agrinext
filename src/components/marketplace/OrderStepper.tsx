import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';
import { Check } from 'lucide-react';

const STEPS = [
  { key: 'placed', labelKey: 'marketplace.placed' },
  { key: 'confirmed', labelKey: 'marketplace.confirmed' },
  { key: 'packed', labelKey: 'marketplace.packed' },
  { key: 'ready_for_pickup', labelKey: 'marketplace.readyForPickup' },
  { key: 'delivered', labelKey: 'marketplace.delivered' },
] as const;

function getStepIndex(status: string): number {
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

interface OrderStepperProps {
  status: string;
  updatedAt?: string | null;
  className?: string;
}

const OrderStepper = ({ status, updatedAt, className }: OrderStepperProps) => {
  const { t } = useLanguage();
  const currentIdx = getStepIndex(status);

  return (
    <div className={cn('flex items-center gap-1 w-full', className)}>
      {STEPS.map((step, idx) => {
        const done = currentIdx >= idx;
        const isCurrent = Math.floor(currentIdx) === idx;
        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0 last:flex-none">
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors shrink-0',
                  done
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {done && !isCurrent ? <Check className="h-3.5 w-3.5" /> : idx + 1}
              </div>
              <span
                className={cn(
                  'text-[9px] leading-tight text-center max-w-[56px] truncate',
                  done ? 'font-semibold text-foreground' : 'text-muted-foreground'
                )}
              >
                {t(step.labelKey)}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-1 rounded-full',
                  currentIdx > idx ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OrderStepper;
