import { Link } from 'react-router-dom';
import { MapPin, Package, ArrowRight, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ShipmentStatusBadge } from './ShipmentStatusBadge';
import { cn } from '@/lib/utils';
import type { ShipmentRequest } from '@/services/logistics/types';

interface ShipmentCardProps {
  shipment: ShipmentRequest;
  detailPath: string;
  className?: string;
}

export function ShipmentCard({ shipment, detailPath, className }: ShipmentCardProps) {
  return (
    <Link to={detailPath}>
      <Card className={cn('hover:shadow-md transition-shadow cursor-pointer', className)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {shipment.id.slice(0, 8)}
              </span>
            </div>
            <ShipmentStatusBadge status={shipment.status} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-3.5 w-3.5 text-green-600 shrink-0" />
              <span className="truncate">{shipment.pickup_location ?? 'Not set'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{shipment.drop_location ?? 'Not set'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              <span>{shipment.weight_estimate_kg ?? 0} kg</span>
            </div>
            {shipment.pickup_time_window_start && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{new Date(shipment.pickup_time_window_start).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
