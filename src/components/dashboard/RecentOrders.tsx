import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Order {
  id: string;
  buyer: string;
  product: string;
  quantity: string;
  total: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  date: string;
}

const mockOrders: Order[] = [
  { id: 'ORD-001', buyer: 'Rajesh Kumar', product: 'Organic Tomatoes', quantity: '50 kg', total: '₹2,500', status: 'pending', date: '2 hours ago' },
  { id: 'ORD-002', buyer: 'Priya Sharma', product: 'Fresh Onions', quantity: '100 kg', total: '₹4,000', status: 'confirmed', date: '5 hours ago' },
  { id: 'ORD-003', buyer: 'Amit Patel', product: 'Green Chilies', quantity: '20 kg', total: '₹1,200', status: 'shipped', date: '1 day ago' },
  { id: 'ORD-004', buyer: 'Sunita Devi', product: 'Potatoes', quantity: '200 kg', total: '₹6,000', status: 'delivered', date: '2 days ago' },
  { id: 'ORD-005', buyer: 'Vikram Singh', product: 'Carrots', quantity: '30 kg', total: '₹1,800', status: 'cancelled', date: '3 days ago' },
];

const statusStyles = {
  pending: 'bg-accent/20 text-accent-foreground border-accent/30',
  confirmed: 'bg-primary/20 text-primary border-primary/30',
  shipped: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  delivered: 'bg-primary/20 text-primary border-primary/30',
  cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
};

const RecentOrders = () => {
  return (
    <div className="bg-card rounded-xl border border-border shadow-soft">
      <div className="flex items-center justify-between p-6 border-b border-border">
        <h3 className="font-display font-semibold text-lg text-foreground">Recent Orders</h3>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
          View All
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Order ID</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Buyer</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Product</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Quantity</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Total</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {mockOrders.map((order) => (
              <tr key={order.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-foreground">{order.id}</td>
                <td className="px-6 py-4 text-sm text-foreground">{order.buyer}</td>
                <td className="px-6 py-4 text-sm text-foreground">{order.product}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{order.quantity}</td>
                <td className="px-6 py-4 text-sm font-medium text-foreground">{order.total}</td>
                <td className="px-6 py-4">
                  <Badge variant="outline" className={cn('capitalize', statusStyles[order.status])}>
                    {order.status}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Eye className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentOrders;
