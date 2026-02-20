import { Check, Truck, MapPin, Package, Navigation, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface TripStatusStepperProps {
  currentStatus: string;
  assignedAt?: string | null;
  enRouteAt?: string | null;
  arrivedAt?: string | null;
  pickedUpAt?: string | null;
  inTransitAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  issueCode?: string | null;
}

const steps = [
  { key: 'assigned', label: 'Assigned', icon: Check, timeKey: 'assignedAt' },
  { key: 'en_route', label: 'En Route', icon: Truck, timeKey: 'enRouteAt' },
  { key: 'arrived', label: 'Arrived', icon: MapPin, timeKey: 'arrivedAt' },
  { key: 'picked_up', label: 'Picked Up', icon: Package, timeKey: 'pickedUpAt' },
  { key: 'in_transit', label: 'In Transit', icon: Navigation, timeKey: 'inTransitAt' },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2, timeKey: 'deliveredAt' },
];

const statusOrder = steps.map(s => s.key);

export default function TripStatusStepper({
  currentStatus,
  assignedAt,
  enRouteAt,
  arrivedAt,
  pickedUpAt,
  inTransitAt,
  deliveredAt,
  cancelledAt,
  issueCode,
}: TripStatusStepperProps) {
  const timestamps: Record<string, string | null> = {
    assignedAt: assignedAt || null,
    enRouteAt: enRouteAt || null,
    arrivedAt: arrivedAt || null,
    pickedUpAt: pickedUpAt || null,
    inTransitAt: inTransitAt || null,
    deliveredAt: deliveredAt || null,
  };

  const currentIndex = statusOrder.indexOf(currentStatus);
  const isCancelled = currentStatus === 'cancelled';
  const hasIssue = currentStatus === 'issue';

  return (
    <div className="w-full">
      {/* Desktop horizontal stepper */}
      <div className="hidden md:flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = !isCancelled && !hasIssue && index < currentIndex;
          const isCurrent = !isCancelled && !hasIssue && index === currentIndex;
          const isPending = !isCancelled && !hasIssue && index > currentIndex;
          const timestamp = timestamps[step.timeKey];

          return (
            <div key={step.key} className="flex-1 flex flex-col items-center relative">
              {/* Connector line */}
              {index > 0 && (
                <div
                  className={cn(
                    "absolute top-5 right-1/2 w-full h-0.5",
                    isCompleted || isCurrent ? "bg-primary" : "bg-muted"
                  )}
                  style={{ transform: 'translateX(-50%)' }}
                />
              )}
              
              {/* Step circle */}
              <div
                className={cn(
                  "relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                  isCompleted && "bg-primary border-primary text-primary-foreground",
                  isCurrent && "bg-primary/10 border-primary text-primary",
                  isPending && "bg-muted border-muted-foreground/30 text-muted-foreground"
                )}
              >
                <step.icon className="h-5 w-5" />
              </div>
              
              {/* Label */}
              <span
                className={cn(
                  "mt-2 text-xs font-medium text-center",
                  isCurrent && "text-primary",
                  isPending && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
              
              {/* Timestamp */}
              {timestamp && (
                <span className="mt-0.5 text-[10px] text-muted-foreground">
                  {format(parseISO(timestamp), 'h:mm a')}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile vertical stepper */}
      <div className="md:hidden space-y-3">
        {steps.map((step, index) => {
          const isCompleted = !isCancelled && !hasIssue && index < currentIndex;
          const isCurrent = !isCancelled && !hasIssue && index === currentIndex;
          const isPending = !isCancelled && !hasIssue && index > currentIndex;
          const timestamp = timestamps[step.timeKey];

          return (
            <div key={step.key} className="flex items-center gap-3">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 flex-shrink-0",
                  isCompleted && "bg-primary border-primary text-primary-foreground",
                  isCurrent && "bg-primary/10 border-primary text-primary",
                  isPending && "bg-muted border-muted-foreground/30 text-muted-foreground"
                )}
              >
                <step.icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isCurrent && "text-primary",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
                {timestamp && (
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(timestamp), 'MMM d, h:mm a')}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Issue/Cancelled state */}
      {(isCancelled || hasIssue) && (
        <div className={cn(
          "mt-4 p-3 rounded-lg flex items-center gap-3",
          isCancelled ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-800"
        )}>
          {isCancelled ? (
            <>
              <XCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Trip Cancelled</p>
                {cancelledAt && (
                  <p className="text-xs">{format(parseISO(cancelledAt), 'MMM d, h:mm a')}</p>
                )}
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5" />
              <div>
                <p className="font-medium">Issue Reported</p>
                {issueCode && <p className="text-xs">Code: {issueCode}</p>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
