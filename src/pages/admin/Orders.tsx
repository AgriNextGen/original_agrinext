import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, DollarSign, Inbox } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { useAllMarketOrders, useUpdateOrderStatus } from '@/hooks/useAdminDashboard';
import { useLanguage } from '@/hooks/useLanguage';
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
  const { t } = useLanguage();
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

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      placed: t('admin.orders.placed'),
      confirmed: t('admin.orders.confirmed'),
      packed: t('admin.orders.packed'),
      ready_for_pickup: t('admin.orders.readyForPickup'),
      delivered: t('admin.orders.delivered'),
      cancelled: t('admin.orders.cancelled'),
      rejected: t('admin.orders.rejected'),
    };
    return labels[status] || status;
  };

  const handleStatusChange = (id: string, status: string) => {
    updateStatus.mutate({ id, status });
  };

  return (
    <DashboardLayout title={t('admin.orders.title')}>
      <PageShell title={t('admin.orders.title')} subtitle={t('admin.orders.subtitle')}>
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.orders.allOrders')} ({orders?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (!orders || orders.length === 0) ? (
                <EmptyState icon={Inbox} title={t('admin.orders.noOrders')} />
            ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.orders.buyer')}</TableHead>
                        <TableHead>{t('admin.orders.crop')}</TableHead>
                        <TableHead>{t('admin.orders.farmer')}</TableHead>
                        <TableHead>{t('admin.orders.quantity')}</TableHead>
                        <TableHead>{t('admin.orders.price')}</TableHead>
                        <TableHead>{t('admin.orders.deliveryDate')}</TableHead>
                        <TableHead>{t('admin.orders.status')}</TableHead>
                        <TableHead>{t('admin.orders.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            <div>
                              {order.buyer?.name || t('admin.farmers.unknown')}
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
                            {order.farmer?.full_name || t('admin.farmers.unknown')}
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
                              {statusLabel(order.status)}
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
                                <SelectItem value="placed">{t('admin.orders.placed')}</SelectItem>
                                <SelectItem value="confirmed">{t('admin.orders.confirmed')}</SelectItem>
                                <SelectItem value="packed">{t('admin.orders.packed')}</SelectItem>
                                <SelectItem value="ready_for_pickup">{t('admin.orders.readyForPickup')}</SelectItem>
                                <SelectItem value="delivered">{t('admin.orders.delivered')}</SelectItem>
                                <SelectItem value="cancelled">{t('admin.orders.cancelled')}</SelectItem>
                                <SelectItem value="rejected">{t('admin.orders.rejected')}</SelectItem>
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
