import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { ROUTES } from '@/lib/routes';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { useLanguage } from '@/hooks/useLanguage';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFarmerOrders, useFarmerUpdateOrderStatus } from '@/hooks/useFarmerDashboard';
import { format } from 'date-fns';

type OrderStatus = 'placed' | 'confirmed' | 'packed' | 'ready_for_pickup' | 'delivered' | 'cancelled' | 'rejected';

const getStatusConfig = (t: (k: string) => string): Record<OrderStatus, { label: string; icon: typeof Clock; color: string }> => ({
  placed: { label: t('orders.newOrder'), icon: Clock, color: 'bg-accent/20 text-accent-foreground border-accent/30' },
  confirmed: { label: t('orders.confirmed'), icon: CheckCircle, color: 'bg-primary/20 text-primary border-primary/30' },
  packed: { label: t('orders.packed'), icon: Package, color: 'bg-blue-500/20 text-blue-700 border-blue-500/30' },
  ready_for_pickup: { label: t('orders.readyForPickup'), icon: Truck, color: 'bg-purple-500/20 text-purple-700 border-purple-500/30' },
  delivered: { label: t('orders.delivered'), icon: Package, color: 'bg-primary/20 text-primary border-primary/30' },
  cancelled: { label: t('orders.cancelled'), icon: XCircle, color: 'bg-destructive/20 text-destructive border-destructive/30' },
  rejected: { label: t('orders.rejected'), icon: XCircle, color: 'bg-destructive/20 text-destructive border-destructive/30' },
});

const FarmerOrders = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<ReturnType<typeof useFarmerOrders>['data'] extends (infer T)[] | undefined ? T : never | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: orders, isLoading } = useFarmerOrders();
  const updateStatus = useFarmerUpdateOrderStatus();
  const statusConfig = getStatusConfig(t);

  const filteredOrders = (orders || []).filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.buyer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.crop?.crop_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'active' ? ['packed', 'ready_for_pickup'].includes(order.status) : order.status === statusFilter);
    return matchesSearch && matchesStatus;
  });

  const orderCounts = {
    all: orders?.length || 0,
    placed: orders?.filter(o => o.status === 'placed').length || 0,
    confirmed: orders?.filter(o => o.status === 'confirmed').length || 0,
    active: orders?.filter(o => ['packed', 'ready_for_pickup'].includes(o.status)).length || 0,
    delivered: orders?.filter(o => o.status === 'delivered').length || 0,
    cancelled: orders?.filter(o => o.status === 'cancelled' || o.status === 'rejected').length || 0,
  };

  const handleViewOrder = (order: typeof selectedOrder) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const { data: timeline = [] } = useQuery({
    queryKey: ['order-timeline', selectedOrder?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_order_timeline_v1', {
        p_order_id: selectedOrder!.id,
      } as any);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!selectedOrder?.id,
  });
 
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
      if (import.meta.env.DEV) console.error('viewProof error', err);
      toast({ title: t('common.error'), description: t('orders.unableToOpenProof'), variant: 'destructive' });
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
        <PageHeader title={t('orders.title')}>
          <div className="space-y-6">
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-12 w-full" />
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </div>
        </PageHeader>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('orders.title')}>
      <PageHeader title={t('orders.title')} subtitle={t('orders.subtitle')}>
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
                <SelectValue placeholder={t('orders.statusPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('orders.allStatus')}</SelectItem>
                <SelectItem value="placed">{t('orders.new')}</SelectItem>
                <SelectItem value="confirmed">{t('orders.confirmed')}</SelectItem>
                <SelectItem value="active">{t('orders.inProgress')}</SelectItem>
                <SelectItem value="delivered">{t('orders.delivered')}</SelectItem>
                <SelectItem value="cancelled">{t('orders.cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status Tabs */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
          <TabsList className="w-full justify-start bg-muted/50 p-1 h-auto flex-wrap">
            <TabsTrigger value="all" className="data-[state=active]:bg-background">
              {t('common.all')} <Badge variant="secondary" className="ml-2">{orderCounts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="placed" className="data-[state=active]:bg-background">
              {t('orders.new')} <Badge variant="secondary" className="ml-2">{orderCounts.placed}</Badge>
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="data-[state=active]:bg-background">
              {t('orders.confirmed')} <Badge variant="secondary" className="ml-2">{orderCounts.confirmed}</Badge>
            </TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-background">
              {t('orders.inProgress')} <Badge variant="secondary" className="ml-2">{orderCounts.active}</Badge>
            </TabsTrigger>
            <TabsTrigger value="delivered" className="data-[state=active]:bg-background">
              {t('orders.delivered')} <Badge variant="secondary" className="ml-2">{orderCounts.delivered}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Orders Table */}
        {filteredOrders.length === 0 ? (
          <EmptyState
            icon={Package}
            title={orders?.length === 0 ? t('orders.noOrdersYet') : t('common.noResultsFound')}
            description={orders?.length === 0 ? t('orders.noOrdersYet') : t('common.tryAgain')}
            actionLabel={orders?.length === 0 ? t('listings.addListing') : undefined}
            onAction={orders?.length === 0 ? () => navigate(ROUTES.FARMER.LISTINGS) : undefined}
          />
        ) : (
          <div className="rounded-xl border border-border shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('orders.orderId')}</TableHead>
                    <TableHead>{t('orders.buyer')}</TableHead>
                    <TableHead>{t('orders.product')}</TableHead>
                    <TableHead>{t('common.quantity')}</TableHead>
                    <TableHead>{t('orders.total')}</TableHead>
                    <TableHead>{t('orders.status')}</TableHead>
                    <TableHead>{t('orders.date')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const status = order.status as OrderStatus;
                    const config = statusConfig[status] || statusConfig.placed;
                    const StatusIcon = config.icon;
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.id.slice(0, 8).toUpperCase()}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-foreground">{order.buyer?.name || 'Unknown Buyer'}</p>
                            <p className="text-xs text-muted-foreground">{order.buyer?.district || '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {order.crop?.crop_name || 'N/A'}
                          {order.crop?.variety && <span className="text-muted-foreground ml-1">({order.crop.variety})</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {order.quantity} {order.quantity_unit || t('common.quintals')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {order.price_offered ? `₹${order.price_offered.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn('gap-1', config.color)}>
                              <StatusIcon className="h-3 w-3" />
                              {config.label}
                            </Badge>
                            {order.payout_hold && (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                {t('orders.payoutHold')}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(order.created_at), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => handleViewOrder(order)}
                          >
                            <Eye className="h-4 w-4" />
                            {t('orders.viewDetails')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Order Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t('orders.orderDetails')} - {selectedOrder?.id.slice(0, 8).toUpperCase()}</DialogTitle>
              <DialogDescription>
                {t('orders.orderDetailsDescription')}
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('orders.buyer')}</p>
                    <p className="text-sm font-medium">{selectedOrder.buyer?.name || t('common.unknown')}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('common.phone')}</p>
                    <p className="text-sm font-medium">{selectedOrder.buyer?.phone || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('orders.company')}</p>
                    <p className="text-sm font-medium">{selectedOrder.buyer?.company_name || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('orders.orderDate')}</p>
                    <p className="text-sm font-medium">{format(new Date(selectedOrder.created_at), 'dd MMM yyyy')}</p>
                  </div>
                </div>
                <div className="border-t border-border pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm">{selectedOrder.crop?.crop_name || t('orders.product')}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedOrder.quantity} {selectedOrder.quantity_unit || t('common.quintals')}
                    </p>
                  </div>
                  {selectedOrder.delivery_address && (
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm text-muted-foreground">{t('orders.deliveryAddress')}</p>
                      <p className="text-sm">{selectedOrder.delivery_address}</p>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <p className="font-medium">{t('orders.totalAmount')}</p>
                    <p className="font-semibold text-lg">
                      {selectedOrder.price_offered ? `₹${selectedOrder.price_offered.toLocaleString()}` : '-'}
                    </p>
                  </div>
                </div>
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('orders.currentStatus')}</p>
                    <Badge 
                      variant="outline" 
                      className={cn('mt-1', statusConfig[selectedOrder.status as OrderStatus]?.color || '')}
                    >
                      {statusConfig[selectedOrder.status as OrderStatus]?.label || selectedOrder.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('orders.paymentStatus')}</p>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={selectedOrder.payment_status === 'paid' ? 'default' : 'secondary'} 
                          className="mt-1"
                        >
                          {selectedOrder.payment_status || t('common.pending')}
                        </Badge>
                        {selectedOrder.payout_hold && (
                          <Badge className="bg-yellow-100 text-yellow-800 mt-1">
                            {t('orders.payoutHold')}
                          </Badge>
                        )}
                      </div>
                  </div>
                </div>
                {selectedOrder.notes && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1">{t('common.notes')}</p>
                    <p className="text-sm">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
            )}
            {/* Timeline */}
            <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium mb-3">{t('orders.timeline')}</h4>
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('orders.noEventsYet')}</p>
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
                      {e.payload && (() => {
                        const p = e.payload as Record<string, unknown>;
                        const parts: string[] = [];
                        if (p.status) parts.push(`Status: ${p.status}`);
                        if (p.quantity) parts.push(`Qty: ${p.quantity}`);
                        if (p.note) parts.push(String(p.note));
                        if (p.reason) parts.push(String(p.reason));
                        if (p.message) parts.push(String(p.message));
                        return parts.length > 0 ? (
                          <p className="text-xs text-muted-foreground">{parts.join(' · ')}</p>
                        ) : null;
                      })()}
                      {e.payload && (e.payload.proof_file_id || e.payload.file_id || e.payload.proof) && (
                        <div className="mt-2">
                          <Button size="sm" variant="outline" onClick={() => viewProof(e.payload.proof_file_id || e.payload.file_id || e.payload.proof)}>
                            {t('orders.viewProof')}
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
              {selectedOrder?.status === 'placed' && (
                <>
                  <Button 
                    variant="outline" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleStatusUpdate('rejected')}
                    disabled={updateStatus.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {t('orders.rejectOrder')}
                  </Button>
                  <Button 
                    className="gap-2"
                    onClick={() => handleStatusUpdate('confirmed')}
                    disabled={updateStatus.isPending}
                  >
                    <CheckCircle className="h-4 w-4" />
                    {t('orders.confirmOrder')}
                  </Button>
                </>
              )}
              {selectedOrder?.status === 'confirmed' && (
                <Button 
                  className="gap-2"
                  onClick={() => handleStatusUpdate('packed')}
                  disabled={updateStatus.isPending}
                >
                  <Package className="h-4 w-4" />
                  {t('orders.markPacked')}
                </Button>
              )}
              {selectedOrder?.status === 'packed' && (
                <Button 
                  className="gap-2"
                  onClick={() => handleStatusUpdate('ready_for_pickup')}
                  disabled={updateStatus.isPending}
                >
                  <Truck className="h-4 w-4" />
                  {t('orders.readyForPickup')}
                </Button>
              )}
              {selectedOrder?.status === 'ready_for_pickup' && (
                <Button 
                  className="gap-2"
                  onClick={() => handleStatusUpdate('delivered')}
                  disabled={updateStatus.isPending}
                >
                  <CheckCircle className="h-4 w-4" />
                  {t('orders.markDelivered')}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>
    </DashboardLayout>
  );
};

export default FarmerOrders;
