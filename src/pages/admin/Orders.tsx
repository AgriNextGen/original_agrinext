import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, DollarSign, Inbox } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { useAllMarketOrders, useUpdateOrderStatus } from '@/hooks/useAdminDashboard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const AdminOrders = () => {
  const { data: orders, isLoading } = useAllMarketOrders();
  const updateStatus = useUpdateOrderStatus();

  const statusColor = (status: string) => {
    switch (status) {
      case 'placed': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      case 'confirmed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'packed': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
      case 'ready_for_pickup': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'delivered': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      default: return '';
    }
  };

  const handleStatusChange = (id: string, status: string) => {
    updateStatus.mutate({ id, status });
  };

  return (
    <DashboardLayout title="Marketplace Orders">
      <PageShell title="Marketplace Orders" subtitle="Manage all marketplace orders">
        <Card>
          <CardHeader>
            <CardTitle>All Orders ({orders?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (!orders || orders.length === 0) ? (
                <EmptyState icon={Inbox} title="No orders found" />
            ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Buyer</TableHead>
                        <TableHead>Crop</TableHead>
                        <TableHead>Farmer</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Delivery Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            <div>
                              {order.buyer?.name || 'Unknown'}
                              {order.buyer?.company_name && (
                                <div className="text-xs text-muted-foreground">
                                  {order.buyer.company_name}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {order.crop?.crop_name || '-'}
                            {order.crop?.variety && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({order.crop.variety})
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {order.farmer?.full_name || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            {order.quantity ?? '-'} {order.quantity_unit || 'quintals'}
                          </TableCell>
                          <TableCell>
                            {order.price_offered != null ? (
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                ₹{Number(order.price_offered).toLocaleString()}
                              </div>
                            ) : order.price_agreed != null ? (
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                ₹{Number(order.price_agreed).toLocaleString()}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {order.delivery_date ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="w-3 h-3" />
                                {new Date(order.delivery_date).toLocaleDateString()}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColor(order.status)}>
                              {order.status.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={order.status}
                              onValueChange={(value) => handleStatusChange(order.id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="placed">Placed</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="packed">Packed</SelectItem>
                                <SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
            )}
          </CardContent>
        </Card>
      </PageShell>
    </DashboardLayout>
  );
};

export default AdminOrders;
