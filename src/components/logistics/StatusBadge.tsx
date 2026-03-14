import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TRANSPORT_STATUS_COLORS } from '@/lib/constants';
import { useLanguage } from '@/hooks/useLanguage';
import type { UnifiedTripStatus, BookingStatus, ReverseCandidateStatus } from '@/services/logistics/types';

const UNIFIED_STATUS_COLORS: Record<string, string> = {
  ...TRANSPORT_STATUS_COLORS,
  planned: 'bg-slate-100 text-slate-800',
  assigned: 'bg-purple-100 text-purple-800',
  accepted: 'bg-indigo-100 text-indigo-800',
  en_route: 'bg-cyan-100 text-cyan-800',
  pickup_done: 'bg-indigo-100 text-indigo-800',
  in_transit: 'bg-cyan-100 text-cyan-800',
  delivered: 'bg-green-100 text-green-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-destructive/10 text-destructive',
  tentative: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  identified: 'bg-amber-100 text-amber-800',
  offered: 'bg-orange-100 text-orange-800',
  expired: 'bg-gray-100 text-gray-500',
};

interface StatusBadgeProps {
  status: UnifiedTripStatus | BookingStatus | ReverseCandidateStatus | string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useLanguage();
  const safeStatus = status ?? '';
  const colorClass = UNIFIED_STATUS_COLORS[safeStatus] ?? 'bg-gray-100 text-gray-800';
  const label = t(`logisticsComponents.statusLabels.${safeStatus}`) || safeStatus.replace(/_/g, ' ');

  return (
    <Badge className={cn(colorClass, 'capitalize', className)}>
      {label}
    </Badge>
  );
}
