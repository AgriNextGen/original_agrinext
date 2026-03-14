import { cn } from '@/lib/utils';
import type { ShipmentStatus } from '@/services/logistics/types';

const STATUS_CONFIG: Record<ShipmentStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800' },
  pooled: { label: 'Pooled', className: 'bg-blue-100 text-blue-800' },
  booked: { label: 'Booked', className: 'bg-indigo-100 text-indigo-800' },
  in_transit: { label: 'In Transit', className: 'bg-cyan-100 text-cyan-800' },
  delivered: { label: 'Delivered', className: 'bg-green-100 text-green-800' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
};

interface ShipmentStatusBadgeProps {
  status: ShipmentStatus;
  className?: string;
}

export function ShipmentStatusBadge({ status, className }: ShipmentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
