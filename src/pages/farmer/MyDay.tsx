import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import KpiCard from '@/components/dashboard/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Package, ShoppingBag, Truck, HelpCircle, Info, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { rpcJson } from '@/lib/readApi';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useCreateSupportTicket } from '@/hooks/useSupportTicket';
import { useToast } from '@/hooks/use-toast';

export default function FarmerMyDay() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const STATUS_EXPLANATIONS: Record<string, Record<string, string>> = {
    order: {
      pending: t('farmer.myDay.statusExplanation.order.pending'),
      confirmed: t('farmer.myDay.statusExplanation.order.confirmed'),
      ready_for_pickup: t('farmer.myDay.statusExplanation.order.ready_for_pickup'),
      in_transit: t('farmer.myDay.statusExplanation.order.in_transit'),
      delivered: t('farmer.myDay.statusExplanation.order.delivered'),
      cancelled: t('farmer.myDay.statusExplanation.order.cancelled'),
    },
    transport: {
      requested: t('farmer.myDay.statusExplanation.transport.requested'),
      open: t('farmer.myDay.statusExplanation.transport.open'),
      accepted: t('farmer.myDay.statusExplanation.transport.accepted'),
      in_progress: t('farmer.myDay.statusExplanation.transport.in_progress'),
      completed: t('farmer.myDay.statusExplanation.transport.completed'),
      cancelled: t('farmer.myDay.statusExplanation.transport.cancelled'),
    },
    listing: {
      draft: t('farmer.myDay.statusExplanation.listing.draft'),
      pending: t('farmer.myDay.statusExplanation.listing.pending'),
      approved: t('farmer.myDay.statusExplanation.listing.approved'),
      sold: t('farmer.myDay.statusExplanation.listing.sold'),
      expired: t('farmer.myDay.statusExplanation.listing.expired'),
    },
  };
  const navigate = useNavigate();
  const { toast } = useToast();
  const createTicket = useCreateSupportTicket();

  const [helpDialog, setHelpDialog] = useState<{ entityType: string; entityId: string } | null>(null);
  const [helpMessage, setHelpMessage] = useState('');
  const [helpCategory, setHelpCategory] = useState('other');
  const [statusExplain, setStatusExplain] = useState<{ type: string; status: string } | null>(null);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['farmer-dashboard', user?.id],
    queryFn: () => rpcJson('farmer_dashboard_v1'),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const recentOrders = (dashboard?.recent_orders || []) as any[];
  const cropsbyStatus = (dashboard?.crops_by_status || {}) as Record<string, number>;
  const listingsByStatus = (dashboard?.listings_by_status || {}) as Record<string, number>;
  const openTransport = dashboard?.open_transport_requests_count ?? 0;
  const activeOrders = dashboard?.active_orders_count ?? 0;

  const pendingActions = [];

  if (activeOrders > 0) {
    pendingActions.push({ icon: Package, label: t('farmer.myDay.pendingAction.activeOrders'), count: activeOrders, link: '/farmer/orders', type: 'order' });
  }
  if (openTransport > 0) {
    pendingActions.push({ icon: Truck, label: t('farmer.myDay.pendingAction.openTransport'), count: openTransport, link: '/farmer/transport', type: 'transport' });
  }
  const draftListings = listingsByStatus['draft'] || 0;
  if (draftListings > 0) {
    pendingActions.push({ icon: ShoppingBag, label: t('farmer.myDay.pendingAction.draftListings'), count: draftListings, link: '/farmer/listings', type: 'listing' });
  }
  const harvestReady = cropsbyStatus['harvest_ready'] || cropsbyStatus['ready'] || 0;
  if (harvestReady > 0) {
    pendingActions.push({ icon: ShoppingBag, label: t('farmer.myDay.pendingAction.harvestReady'), count: harvestReady, link: '/farmer/crops', type: 'listing' });
  }

  const handleCreateTicket = () => {
    if (!helpDialog || !helpMessage.trim()) return;
    createTicket.mutate({
      category: helpCategory,
      entityType: helpDialog.entityType,
      entityId: helpDialog.entityId,
      message: helpMessage,
    }, {
      onSuccess: () => {
        toast({ title: t('farmer.myDay.toast.helpRequestSent'), description: t('farmer.myDay.toast.teamWillHelp') });
        setHelpDialog(null);
        setHelpMessage('');
      },
    });
  };

  return (
    <DashboardLayout>
      <PageShell
        title={t('farmer.myDay.title')}
        subtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
      >
        {/* Quick stats */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Skeleton className="h-[88px]" />
            <Skeleton className="h-[88px]" />
            <Skeleton className="h-[88px]" />
            <Skeleton className="h-[88px]" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label={t('farmer.myDay.stat.activeOrders')} value={activeOrders} icon={Package} priority="primary" />
            <KpiCard label={t('farmer.myDay.stat.transportRequests')} value={openTransport} icon={Truck} priority="info" />
            <KpiCard label={t('farmer.myDay.stat.listings')} value={Object.values(listingsByStatus).reduce((a: number, b: number) => a + b, 0)} icon={ShoppingBag} priority="success" />
            <KpiCard label={t('farmer.myDay.stat.crops')} value={Object.values(cropsbyStatus).reduce((a: number, b: number) => a + b, 0)} icon={CalendarDays} priority="neutral" />
          </div>
        )}

        {/* Pending Actions */}
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-base">{t('farmer.myDay.pendingActions')}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pendingActions.length === 0 && !isLoading && (
              <p className="text-sm text-muted-foreground text-center py-4">{t('farmer.myDay.noPendingActions')}</p>
            )}
            {pendingActions.map((action, i) => (
              <button key={i} className="flex w-full items-center justify-between p-2 rounded border hover:bg-muted/30 transition-colors cursor-pointer text-left" onClick={() => navigate(action.link)}>
                <div className="flex items-center gap-3">
                  <action.icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{action.label}</p>
                    <Badge variant="secondary" className="text-xs">{action.count}</Badge>
                  </div>
                </div>
                <span className="inline-flex items-center justify-center rounded-md border px-3 min-h-[44px] text-sm font-medium">{t('farmer.myDay.go')}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Recent Orders with status explanation */}
        {recentOrders.length > 0 && (
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">{t('farmer.myDay.recentOrders')}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {recentOrders.slice(0, 5).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-2 rounded border">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-sm">{order.status}</Badge>
                      <span className="text-sm font-medium">Rs. {order.total_amount}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" className="min-h-[44px] min-w-[44px]" aria-label="Explain status" title="Explain status"
                      onClick={() => setStatusExplain({ type: 'order', status: order.status })}>
                      <Info className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" className="min-h-[44px] min-w-[44px]" aria-label="Need help?" title="Need help?"
                      onClick={() => setHelpDialog({ entityType: 'order', entityId: order.id })}>
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Status Explanation Dialog */}
        <Dialog open={!!statusExplain} onOpenChange={(o) => !o && setStatusExplain(null)}>
          {statusExplain && (
            <DialogContent className="sm:max-w-sm">
              <DialogHeader><DialogTitle>Status: {statusExplain.status}</DialogTitle></DialogHeader>
              <p className="text-sm">
                {STATUS_EXPLANATIONS[statusExplain.type]?.[statusExplain.status] || t('farmer.myDay.noExplanation')}
              </p>
              <DialogFooter>
                <Button onClick={() => setStatusExplain(null)}>{t('farmer.myDay.gotIt')}</Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>

        {/* Help Request Dialog */}
        <Dialog open={!!helpDialog} onOpenChange={(o) => !o && setHelpDialog(null)}>
          {helpDialog && (
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>{t('farmer.myDay.needHelp')}</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">
                {t('farmer.myDay.describeIssue')}
                <br />Entity: {helpDialog.entityType}/{helpDialog.entityId.slice(0, 8)}
              </p>
              <Select value={helpCategory} onValueChange={setHelpCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="order">{t('farmer.myDay.category.order')}</SelectItem>
                  <SelectItem value="trip">{t('farmer.myDay.category.transport')}</SelectItem>
                  <SelectItem value="listing">{t('farmer.myDay.category.listing')}</SelectItem>
                  <SelectItem value="payment">{t('farmer.myDay.category.payment')}</SelectItem>
                  <SelectItem value="account">{t('farmer.myDay.category.account')}</SelectItem>
                  <SelectItem value="other">{t('farmer.myDay.category.other')}</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                value={helpMessage}
                onChange={(e) => setHelpMessage(e.target.value)}
                placeholder={t('farmer.myDay.helpPlaceholder')}
                rows={3}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setHelpDialog(null)}>{t('farmer.myDay.cancel')}</Button>
                <Button onClick={handleCreateTicket} disabled={!helpMessage.trim() || createTicket.isPending}>
                  {createTicket.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  {t('farmer.myDay.send')}
                </Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </PageShell>
    </DashboardLayout>
  );
}
