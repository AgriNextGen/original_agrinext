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
import { ShoppingCart, Package, Truck, CheckCircle2, XCircle, Clock, type LucideIcon } from 'lucide-react';
import { useBuyerOrders } from '@/hooks/useMarketplaceDashboard';
import { useOrdersInfinite } from '@/hooks/useOrders';
import { createPaymentOrder } from '@/lib/marketplaceApi';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const statusConfig: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  requested: { label: 'Requested', color: 'bg-amber-100 text-amber-800', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: CheckCircle2 },
  in_transport: { label: 'In Transport', color: 'bg-purple-100 text-purple-800', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
};

const Orders = () => {
  const navigate = useNavigate();
  const { data: ordersList, isLoading: ordersLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useOrdersInfinite();
  const orders = ordersList ? ordersList.pages.flatMap((p: any) => p.items || []) : [];
  const isLoading = ordersLoading;

  if (isLoading) {
    return <DashboardLayout title="My Orders"><DataState loading><></></DataState></DashboardLayout>;
  }

  const activeOrders = orders?.filter(o => !['delivered', 'cancelled'].includes(o.status)) || [];
  const pastOrders = orders?.filter(o => ['delivered', 'cancelled'].includes(o.status)) || [];

  return (
    <DashboardLayout title="My Orders">
      <PageShell
        title="My Orders"
        subtitle={`${orders?.length || 0} total orders`}
        actions={(
          <Button variant="default" onClick={() => navigate('/marketplace/browse')}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Shop More
          </Button>
        )}
      >

      {/* Active Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Active Orders ({activeOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No active orders</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeOrders.map(order => {
                const status = statusConfig[order.status] || statusConfig.requested;
                const StatusIcon = status.icon;
                
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
                          {order.payout_hold && (
                            <Badge className="bg-yellow-100 text-yellow-800 ml-2">
                              Payout hold
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                          <div>
                            <span className="block text-xs">Quantity</span>
                            <span className="font-medium text-foreground">{order.quantity} {order.quantity_unit}</span>
                          </div>
                          <div>
                            <span className="block text-xs">Farmer</span>
                            <span className="font-medium text-foreground">{order.farmer?.full_name || 'Unknown'}</span>
                          </div>
                          <div>
                            <span className="block text-xs">Order Date</span>
                            <span className="font-medium text-foreground">
                              {format(parseISO(order.created_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                          {order.price_offered && (
                            <div>
                              <span className="block text-xs">Price Offered</span>
                              <span className="font-medium text-foreground">₹{order.price_offered}/q</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Order Progress */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {['requested', 'confirmed', 'in_transport', 'delivered'].map((step, idx) => (
                            <div key={step} className="flex items-center">
                              <div className={`w-3 h-3 rounded-full ${
                                ['requested', 'confirmed', 'in_transport', 'delivered'].indexOf(order.status) >= idx
                                  ? 'bg-primary'
                                  : 'bg-muted'
                              }`} />
                              {idx < 3 && (
                                <div className={`w-6 h-0.5 ${
                                  ['requested', 'confirmed', 'in_transport', 'delivered'].indexOf(order.status) > idx
                                    ? 'bg-primary'
                                    : 'bg-muted'
                                }`} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Payment actions */}
                      <div className="mt-3 flex items-center gap-2">
                        {(['unpaid','failed'].includes(order.payment_status) || !order.payment_status) && ['confirmed','requested','placed'].includes(order.status) && (
                          <button
                            className="px-3 py-1 rounded bg-primary text-white text-sm"
                            onClick={async () => {
                              try {
                                // Create payment order on server (Edge)
                                const res: any = await createPaymentOrder(order.id);
                                if (!res || res.error) {
                                  alert('Payment initiation failed: ' + (res?.error || 'unknown'));
                                  return;
                                }
                                const { key_id, payment_order_id, amount, currency } = res;
                                // Launch Razorpay Checkout if available
                                const options: any = {
                                  key: key_id,
                                  order_id: payment_order_id,
                                  amount,
                                  currency,
                                  name: 'AgriNext',
                                  description: 'Order payment',
                                  notes: { order_id: order.id },
                                  handler: function (response: any) {
                                    // After checkout, UI will poll for payment_status change — do not mark paid from client
                                    alert('Payment complete. Processing, please wait a few seconds and refresh the order.');
                                  },
                                  prefill: {}
                                };
                                if ((window as any).Razorpay) {
                                  const rzp = new (window as any).Razorpay(options);
                                  rzp.open();
                                } else {
                                  // Fallback: open provider checkout page if available (not implemented)
                                  alert('Razorpay checkout not loaded. Please ensure checkout script is included on page.');
                                }
                              } catch (err) {
                                console.error('pay now error', err);
                                alert('Payment initiation failed');
                              }
                            }}
                          >
                            Pay Now
                          </button>
                        )}
                        <div className="text-sm text-muted-foreground">
                          Payment: {order.payment_status || 'pending'}
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
        {hasNextPage ? <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>{isFetchingNextPage ? 'Loading...' : 'Load more'}</Button> : <div className="text-sm text-muted-foreground">No more orders</div>}
      </div>

      {/* Past Orders */}
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
                    <TableHead>Quantity</TableHead>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastOrders.map(order => {
                    const status = statusConfig[order.status] || statusConfig.requested;
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.crop?.crop_name || 'Order'}</TableCell>
                        <TableCell>{order.quantity} {order.quantity_unit}</TableCell>
                        <TableCell>{order.farmer?.full_name || 'Unknown'}</TableCell>
                        <TableCell>{format(parseISO(order.created_at), 'MMM d, yyyy')}</TableCell>
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
