import { useLanguage } from '@/hooks/useLanguage';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PageShell from '@/components/layout/PageShell';
import DataState from '@/components/ui/DataState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShoppingCart, Package, CheckCircle2, XCircle, Clock, BoxIcon, type LucideIcon } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { useOrdersInfinite } from '@/hooks/useOrders';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/routes';

const statusConfig: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  placed: { label: 'Placed', color: 'bg-amber-100 text-amber-800', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: CheckCircle2 },
  packed: { label: 'Packed', color: 'bg-indigo-100 text-indigo-800', icon: BoxIcon },
  ready_for_pickup: { label: 'Ready for Pickup', color: 'bg-purple-100 text-purple-800', icon: Package },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
};

const PROGRESS_STEPS = ['placed', 'confirmed', 'packed', 'delivered'];

const Orders = () => {
  const navigate = useNavigate();
  const { data: ordersList, isLoading: ordersLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useOrdersInfinite();
  const { t } = useLanguage();
  const orders = ordersList ? ordersList.pages.flatMap((p: any) => p.items || []) : [];

  if (ordersLoading) {
    return <DashboardLayout title="My Orders"><DataState loading><></></DataState></DashboardLayout>;
  }

  const activeOrders = orders?.filter(o => !['delivered', 'cancelled', 'rejected'].includes(o.status)) || [];
  const pastOrders = orders?.filter(o => ['delivered', 'cancelled', 'rejected'].includes(o.status)) || [];

  const getProgressIndex = (status: string) => {
    if (status === 'ready_for_pickup') return PROGRESS_STEPS.indexOf('packed') + 0.5;
    return PROGRESS_STEPS.indexOf(status);
  };

  return (
    <DashboardLayout title="My Orders">
      <PageShell
        title="My Orders"
        subtitle={`${orders?.length || 0} total orders`}
        actions={(
          <Button variant="default" onClick={() => navigate(ROUTES.MARKETPLACE.BROWSE)}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Shop More
          </Button>
        )}
      >

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Active Orders ({activeOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeOrders.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="No active orders" description="Browse the marketplace to place your first order." />
          ) : (
            <div className="space-y-4">
              {activeOrders.map(order => {
                const status = statusConfig[order.status] || statusConfig.placed;
                const StatusIcon = status.icon;
                const progressIdx = getProgressIndex(order.status);

                return (
                  <div
                    key={order.id}
                    className="p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{order.crop?.crop_name || 'Order'}</h3>
                          <Badge className={status.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                          {order.total_amount != null && Number(order.total_amount) > 0 && (
                            <div>
                              <span className="block text-xs">Amount</span>
                              <span className="font-medium text-foreground">₹{Number(order.total_amount).toLocaleString()}</span>
                            </div>
                          )}
                          <div>
                            <span className="block text-xs">Farmer</span>
                            <span className="font-medium text-foreground">{order.farmer?.full_name || 'Unknown'}</span>
                          </div>
                          <div>
                            <span className="block text-xs">Updated</span>
                            <span className="font-medium text-foreground">
                              {order.updated_at ? format(parseISO(order.updated_at), 'MMM d, yyyy') : '-'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {PROGRESS_STEPS.map((step, idx) => (
                            <div key={step} className="flex items-center">
                              <div className={`w-3 h-3 rounded-full ${
                                progressIdx >= idx ? 'bg-primary' : 'bg-muted'
                              }`} />
                              {idx < PROGRESS_STEPS.length - 1 && (
                                <div className={`w-6 h-0.5 ${
                                  progressIdx > idx ? 'bg-primary' : 'bg-muted'
                                }`} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="p-4 text-center">
        {hasNextPage
          ? <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
              {isFetchingNextPage ? t('common.loading') : t('common.loadMore')}
            </Button>
          : <div className="text-sm text-muted-foreground">{t('common.noMoreItems')}</div>}
      </div>

      {pastOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Past Orders ({pastOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastOrders.map(order => {
                    const status = statusConfig[order.status] || statusConfig.placed;
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.crop?.crop_name || 'Order'}</TableCell>
                        <TableCell>{order.total_amount != null ? `₹${Number(order.total_amount).toLocaleString()}` : '-'}</TableCell>
                        <TableCell>{order.farmer?.full_name || 'Unknown'}</TableCell>
                        <TableCell>{order.updated_at ? format(parseISO(order.updated_at), 'MMM d, yyyy') : '-'}</TableCell>
                        <TableCell>
                          <Badge className={status.color}>{status.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      </PageShell>
    </DashboardLayout>
  );
};

export default Orders;
