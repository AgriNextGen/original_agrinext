import { useLanguage } from '@/hooks/useLanguage';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import OrderStepper from '@/components/marketplace/OrderStepper';
import { useOrdersInfinite } from '@/hooks/useOrders';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/routes';

const statusConfig: Record<string, { labelKey: string; color: string; icon: LucideIcon }> = {
  placed: { labelKey: 'marketplace.placed', color: 'bg-amber-100 text-amber-800', icon: Clock },
  confirmed: { labelKey: 'marketplace.confirmed', color: 'bg-blue-100 text-blue-800', icon: CheckCircle2 },
  packed: { labelKey: 'marketplace.packed', color: 'bg-indigo-100 text-indigo-800', icon: BoxIcon },
  ready_for_pickup: { labelKey: 'marketplace.readyForPickup', color: 'bg-purple-100 text-purple-800', icon: Package },
  delivered: { labelKey: 'marketplace.delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  cancelled: { labelKey: 'marketplace.cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
  rejected: { labelKey: 'marketplace.rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
};

const PROGRESS_STEPS = ['placed', 'confirmed', 'packed', 'delivered'];

const Orders = () => {
  const navigate = useNavigate();
  const { data: ordersList, isLoading: ordersLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useOrdersInfinite();
  const { t } = useLanguage();
  const orders = ordersList ? ordersList.pages.flatMap((p: any) => p.items || []) : [];

  if (ordersLoading) {
    return (
      <DashboardLayout title={t('marketplace.myOrders')}>
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <Skeleton className="h-8 w-36 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-44" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <Skeleton className="h-6 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const activeOrders = orders?.filter(o => !['delivered', 'cancelled', 'rejected'].includes(o.status)) || [];
  const pastOrders = orders?.filter(o => ['delivered', 'cancelled', 'rejected'].includes(o.status)) || [];

  

  return (
    <DashboardLayout title={t('marketplace.myOrders')}>
      <PageShell
        title={t('marketplace.myOrders')}
        subtitle={`${orders?.length || 0} ${t('marketplace.totalOrders')}`}
        actions={(
          <Button variant="default" onClick={() => navigate(ROUTES.MARKETPLACE.BROWSE)}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            {t('marketplace.shopMore')}
          </Button>
        )}
      >

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {t('marketplace.activeOrdersTitle')} ({activeOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeOrders.length === 0 ? (
            <EmptyState icon={ShoppingCart} title={t('marketplace.noActiveOrders')} description={t('marketplace.noActiveOrdersDesc')} />
          ) : (
            <div className="space-y-4">
              {activeOrders.map(order => {
                const status = statusConfig[order.status] || statusConfig.placed;
                const StatusIcon = status.icon;

                return (
                  <div
                    key={order.id}
                    className="p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-semibold text-lg">{order.crop?.crop_name || t('marketplace.placeOrder')}</h3>
                      <Badge className={status.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {t(status.labelKey)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-muted-foreground mb-4">
                      {order.total_amount != null && Number(order.total_amount) > 0 && (
                        <div>
                          <span className="block text-xs">{t('marketplace.orderAmount')}</span>
                          <span className="font-medium text-foreground">₹{Number(order.total_amount).toLocaleString()}</span>
                        </div>
                      )}
                      <div>
                        <span className="block text-xs">{t('marketplace.orderFarmer')}</span>
                        <span className="font-medium text-foreground">{order.farmer?.full_name || t('common.unknown')}</span>
                      </div>
                      <div>
                        <span className="block text-xs">{t('marketplace.orderUpdated')}</span>
                        <span className="font-medium text-foreground">
                          {order.updated_at ? format(parseISO(order.updated_at), 'MMM d, yyyy') : '-'}
                        </span>
                      </div>
                    </div>
                    <OrderStepper status={order.status} updatedAt={order.updated_at} />
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
              {t('marketplace.pastOrdersTitle')} ({pastOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('marketplace.orderProduct')}</TableHead>
                    <TableHead>{t('marketplace.orderAmount')}</TableHead>
                    <TableHead>{t('marketplace.orderFarmer')}</TableHead>
                    <TableHead>{t('marketplace.orderDate')}</TableHead>
                    <TableHead>{t('marketplace.orderStatus')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastOrders.map(order => {
                    const status = statusConfig[order.status] || statusConfig.placed;
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.crop?.crop_name || t('marketplace.placeOrder')}</TableCell>
                        <TableCell>{order.total_amount != null ? `₹${Number(order.total_amount).toLocaleString()}` : '-'}</TableCell>
                        <TableCell>{order.farmer?.full_name || t('common.unknown')}</TableCell>
                        <TableCell>{order.updated_at ? format(parseISO(order.updated_at), 'MMM d, yyyy') : '-'}</TableCell>
                        <TableCell>
                          <Badge className={status.color}>{t(status.labelKey)}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {pastOrders.map(order => {
                const status = statusConfig[order.status] || statusConfig.placed;
                return (
                  <div key={order.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{order.crop?.crop_name || t('marketplace.placeOrder')}</span>
                      <Badge className={status.color}>{t(status.labelKey)}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-sm text-muted-foreground">
                      <span>{t('marketplace.orderAmount')}: {order.total_amount != null ? `₹${Number(order.total_amount).toLocaleString()}` : '-'}</span>
                      <span>{order.farmer?.full_name || t('common.unknown')}</span>
                      <span>{order.updated_at ? format(parseISO(order.updated_at), 'MMM d, yyyy') : '-'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      </PageShell>
    </DashboardLayout>
  );
};

export default Orders;
