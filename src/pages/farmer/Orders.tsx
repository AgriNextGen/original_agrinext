import { useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { useLanguage } from '@/hooks/useLanguage';
import { 
  Search, 
  Filter,
  Eye,
  CheckCircle,
  Truck,
  XCircle,
  Clock,
  Package
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFarmerOrders, useFarmerUpdateOrderStatus } from '@/hooks/useFarmerDashboard';
import { format } from 'date-fns';

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'rejected';

const statusConfig: Record<OrderStatus, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-accent/20 text-accent-foreground border-accent/30' },
  confirmed: { label: 'Confirmed', icon: CheckCircle, color: 'bg-primary/20 text-primary border-primary/30' },
  shipped: { label: 'Shipped', icon: Truck, color: 'bg-blue-500/20 text-blue-700 border-blue-500/30' },
  delivered: { label: 'Delivered', icon: Package, color: 'bg-primary/20 text-primary border-primary/30' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-destructive/20 text-destructive border-destructive/30' },
  rejected: { label: 'Rejected', icon: XCircle, color: 'bg-destructive/20 text-destructive border-destructive/30' },
};

const FarmerOrders = () => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<ReturnType<typeof useFarmerOrders>['data'] extends (infer T)[] | undefined ? T : never | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: orders, isLoading } = useFarmerOrders();
  const updateStatus = useFarmerUpdateOrderStatus();

  const filteredOrders = (orders || []).filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.buyer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.crop?.crop_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const orderCounts = {
    all: orders?.length || 0,
    pending: orders?.filter(o => o.status === 'pending').length || 0,
    confirmed: orders?.filter(o => o.status === 'confirmed').length || 0,
    shipped: orders?.filter(o => o.status === 'shipped').length || 0,
    delivered: orders?.filter(o => o.status === 'delivered').length || 0,
    cancelled: orders?.filter(o => o.status === 'cancelled' || o.status === 'rejected').length || 0,
  };

  const handleViewOrder = (order: typeof selectedOrder) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  // timeline state
  const [timeline, setTimeline] = useState<any[]>([]);
  const fetchTimeline = async (orderId: string) => {
    try {
      const { data, error } = await (await import('@/integrations/supabase/client')).supabase.rpc('get_order_timeline_v1', { p_order_id: orderId });
      if (error) throw error;
      setTimeline(data || []);
    } catch (err) {
      console.error('Failed to load timeline', err);
      setTimeline([]);
    }
  };
 
  const viewProof = async (fileId: string | null) => {
    if (!fileId) return;
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/storage-sign-read-v1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ file_id: fileId }),
      });
      const json = await res.json();
      if (!res.ok || !json?.signed_url) throw new Error(json?.error || 'Failed to sign read url');
      window.open(json.signed_url, '_blank');
    } catch (err) {
      console.error('viewProof error', err);
      toast.error('Unable to open proof file');
    }
  };

  const handleStatusUpdate = (newStatus: string) => {
    if (!selectedOrder) return;
    updateStatus.mutate(
      { orderId: selectedOrder.id, newStatus },
      { onSuccess: () => setIsDetailOpen(false) }
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout title={t('orders.title')}>
        <div className="space-y-6">
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-12 w-full" />
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('orders.title')}>
      <PageHeader title={t('orders.title')} subtitle={t('orders.subtitle') || 'View and manage incoming buyer orders'}>
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status Tabs */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
          <TabsList className="w-full justify-start bg-muted/50 p-1 h-auto flex-wrap">
            <TabsTrigger value="all" className="data-[state=active]:bg-background">
              All <Badge variant="secondary" className="ml-2">{orderCounts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-background">
              Pending <Badge variant="secondary" className="ml-2">{orderCounts.pending}</Badge>
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="data-[state=active]:bg-background">
              Confirmed <Badge variant="secondary" className="ml-2">{orderCounts.confirmed}</Badge>
            </TabsTrigger>
            <TabsTrigger value="shipped" className="data-[state=active]:bg-background">
              Shipped <Badge variant="secondary" className="ml-2">{orderCounts.shipped}</Badge>
            </TabsTrigger>
            <TabsTrigger value="delivered" className="data-[state=active]:bg-background">
              Delivered <Badge variant="secondary" className="ml-2">{orderCounts.delivered}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Orders Table */}
        <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Order ID</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Buyer</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Product</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Quantity</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Total</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Date</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.map((order) => {
                  const status = order.status as OrderStatus;
                  const config = statusConfig[status] || statusConfig.pending;
                  const StatusIcon = config.icon;
                  return (
                    <tr key={order.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {order.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">{order.buyer?.name || 'Unknown Buyer'}</p>
                          <p className="text-xs text-muted-foreground">{order.buyer?.district || '-'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {order.crop?.crop_name || 'N/A'}
                        {order.crop?.variety && <span className="text-muted-foreground ml-1">({order.crop.variety})</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {order.quantity} {order.quantity_unit || 'quintals'}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {order.price_offered ? `₹${order.price_offered.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn('gap-1', config.color)}>
                            <StatusIcon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                          {order.payout_hold && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              Payout hold
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {format(new Date(order.created_at), 'dd MMM yyyy')}
                      </td>
                      <td className="px-6 py-4">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-2"
                          onClick={() => handleViewOrder(order)}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredOrders.length === 0 && (
            <EmptyState
              icon={Package}
              title={orders?.length === 0 ? t('orders.noOrdersYet') : t('common.noResultsFound')}
              description={orders?.length === 0 ? t('orders.noOrdersYet') : t('common.tryAgain')}
            />
          )}
        </div>

        {/* Order Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Order Details - {selectedOrder?.id.slice(0, 8).toUpperCase()}</DialogTitle>
              <DialogDescription>
                View and manage order information
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Buyer</p>
                    <p className="text-sm font-medium">{selectedOrder.buyer?.name || 'Unknown'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{selectedOrder.buyer?.phone || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Company</p>
                    <p className="text-sm font-medium">{selectedOrder.buyer?.company_name || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Order Date</p>
                    <p className="text-sm font-medium">{format(new Date(selectedOrder.created_at), 'dd MMM yyyy')}</p>
                  </div>
                </div>
                <div className="border-t border-border pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm">{selectedOrder.crop?.crop_name || 'Product'}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedOrder.quantity} {selectedOrder.quantity_unit || 'quintals'}
                    </p>
                  </div>
                  {selectedOrder.delivery_address && (
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm text-muted-foreground">Delivery Address</p>
                      <p className="text-sm">{selectedOrder.delivery_address}</p>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <p className="font-medium">Total Amount</p>
                    <p className="font-semibold text-lg">
                      {selectedOrder.price_offered ? `₹${selectedOrder.price_offered.toLocaleString()}` : '-'}
                    </p>
                  </div>
                </div>
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Current Status</p>
                    <Badge 
                      variant="outline" 
                      className={cn('mt-1', statusConfig[selectedOrder.status as OrderStatus]?.color || '')}
                    >
                      {statusConfig[selectedOrder.status as OrderStatus]?.label || selectedOrder.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment</p>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={selectedOrder.payment_status === 'paid' ? 'default' : 'secondary'} 
                          className="mt-1"
                        >
                          {selectedOrder.payment_status || 'pending'}
                        </Badge>
                        {selectedOrder.payout_hold && (
                          <Badge className="bg-yellow-100 text-yellow-800 mt-1">
                            Payout hold
                          </Badge>
                        )}
                      </div>
                  </div>
                </div>
                {selectedOrder.notes && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
            )}
            {/* Timeline */}
            <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium mb-3">Timeline</h4>
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet</p>
            ) : (
              <ol className="relative border-l border-muted/50 ml-2">
                {timeline.map((e: any) => (
                  <li key={e.event_id} className="mb-6 ml-6">
                    <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-white ring-2 ring-primary">
                      <svg className="h-3 w-3 text-primary" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" /></svg>
                    </span>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div>{new Date(e.created_at).toLocaleString()}</div>
                      <div className="ml-2">{e.event_type}</div>
                    </div>
                    <div className="mt-1 text-sm">
                      <div className="text-xs text-muted-foreground mb-1">{JSON.stringify(e.payload)}</div>
                      {/* If payload contains proof_file_id show view button */}
                      {((e.payload && (e.payload.proof_file_id || e.payload.proof || e.payload.file_id)) || (e.payload && e.payload.file_id)) && (
                        <div className="mt-2">
                          <Button size="sm" variant="outline" onClick={() => viewProof(e.payload.proof_file_id || e.payload.file_id || e.payload.proof)}>
                            View proof
                          </Button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              {selectedOrder?.status === 'pending' && (
                <>
                  <Button 
                    variant="outline" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleStatusUpdate('rejected')}
                    disabled={updateStatus.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button 
                    className="gap-2"
                    onClick={() => handleStatusUpdate('confirmed')}
                    disabled={updateStatus.isPending}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Confirm Order
                  </Button>
                </>
              )}
              {selectedOrder?.status === 'confirmed' && (
                <Button 
                  className="gap-2"
                  onClick={() => handleStatusUpdate('shipped')}
                  disabled={updateStatus.isPending}
                >
                  <Truck className="h-4 w-4" />
                  Mark as Shipped
                </Button>
              )}
              {selectedOrder?.status === 'shipped' && (
                <Button 
                  className="gap-2"
                  onClick={() => handleStatusUpdate('delivered')}
                  disabled={updateStatus.isPending}
                >
                  <Package className="h-4 w-4" />
                  Mark as Delivered
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageShell>
    </DashboardLayout>
  );
};

export default FarmerOrders;
