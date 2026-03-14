import { Package } from 'lucide-react';
import type { ShipmentItem } from '@/services/logistics/types';

interface ShipmentItemsListProps {
  items: ShipmentItem[];
}

export function ShipmentItemsList({ items }: ShipmentItemsListProps) {
  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">No items attached</p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between p-3 rounded-lg border bg-card"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{item.product_name}</p>
              {item.category && (
                <p className="text-xs text-muted-foreground">{item.category}</p>
              )}
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium">
              {item.quantity} {item.unit}
            </p>
            {item.weight_kg != null && (
              <p className="text-xs text-muted-foreground">{item.weight_kg} kg</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
