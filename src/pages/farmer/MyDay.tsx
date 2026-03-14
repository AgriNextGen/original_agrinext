import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import KpiCard from '@/components/dashboard/KpiCard';
import WeatherWidget from '@/components/farmer/WeatherWidget';
import MarketPricesWidget from '@/components/farmer/MarketPricesWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CalendarDays, Package, ShoppingBag, Truck, HelpCircle, Info,
  Loader2, Lightbulb, Sprout, ArrowRight, CloudSun, Plus, LandPlot,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { rpcJson } from '@/lib/readApi';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useCreateSupportTicket } from '@/hooks/useSupportTicket';
import { useToast } from '@/hooks/use-toast';
import { ROUTES } from '@/lib/routes';

function getGreeting(t: (key: string) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return t('farmer.myDay.greeting');
  if (hour < 17) return t('farmer.myDay.greetingAfternoon');
  return t('farmer.myDay.greetingEvening');
}

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
  const totalCrops = Object.values(cropsbyStatus).reduce((a: number, b: number) => a + b, 0);
  const totalListings = Object.values(listingsByStatus).reduce((a: number, b: number) => a + b, 0);

  const pendingActions = [];
  if (activeOrders > 0) {
    pendingActions.push({ icon: Package, label: t('farmer.myDay.pendingAction.activeOrders'), count: activeOrders, link: ROUTES.FARMER.ORDERS, type: 'order' });
  }
  if (openTransport > 0) {
    pendingActions.push({ icon: Truck, label: t('farmer.myDay.pendingAction.openTransport'), count: openTransport, link: ROUTES.FARMER.TRANSPORT, type: 'transport' });
  }
  const draftListings = listingsByStatus['draft'] || 0;
  if (draftListings > 0) {
    pendingActions.push({ icon: ShoppingBag, label: t('farmer.myDay.pendingAction.draftListings'), count: draftListings, link: ROUTES.FARMER.LISTINGS, type: 'listing' });
  }
  const harvestReady = cropsbyStatus['harvest_ready'] || cropsbyStatus['ready'] || 0;
  if (harvestReady > 0) {
    pendingActions.push({ icon: Sprout, label: t('farmer.myDay.pendingAction.harvestReady'), count: harvestReady, link: ROUTES.FARMER.CROPS, type: 'listing' });
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

  const dateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <DashboardLayout>
      <PageShell
        title={getGreeting(t)}
        subtitle={dateStr}
      >
        {/* Quick Stats */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[88px]" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label={t('farmer.myDay.stat.activeOrders')} value={activeOrders} icon={Package} priority="primary" />
            <KpiCard label={t('farmer.myDay.stat.transportRequests')} value={openTransport} icon={Truck} priority="info" />
            <KpiCard label={t('farmer.myDay.stat.listings')} value={totalListings} icon={ShoppingBag} priority="success" />
            <KpiCard label={t('farmer.myDay.stat.crops')} value={totalCrops} icon={CalendarDays} priority="neutral" />
          </div>
        )}

        {/* Two-column: Weather + Market */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WeatherWidget />
          <MarketPricesWidget />
        </div>

        {/* Pending Actions */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">{t('farmer.myDay.pendingActions')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingActions.length === 0 && !isLoading && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('farmer.myDay.noPendingActions')}
              </p>
            )}
            {pendingActions.map((action, i) => (
              <button
                key={i}
                className="flex w-full items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer text-left"
                onClick={() => navigate(action.link)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <action.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{action.label}</p>
                    <Badge variant="secondary" className="text-xs mt-0.5">{action.count}</Badge>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions — prominent when no pending actions */}
        {pendingActions.length === 0 && !isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Sprout, label: t('dashboard.quickAction.addCrop'), href: ROUTES.FARMER.CROPS, color: 'bg-emerald-600' },
              { icon: LandPlot, label: t('dashboard.quickAction.addFarmland'), href: ROUTES.FARMER.FARMLANDS, color: 'bg-amber-600' },
              { icon: Truck, label: t('dashboard.quickAction.requestTransport'), href: ROUTES.FARMER.TRANSPORT, color: 'bg-blue-600' },
              { icon: ShoppingBag, label: t('dashboard.quickAction.createListing'), href: ROUTES.FARMER.LISTINGS, color: 'bg-purple-600' },
            ].map((action) => (
              <button
                key={action.href}
                onClick={() => navigate(action.href)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors min-h-[80px] justify-center"
              >
                <div className={`p-2 rounded-lg ${action.color} text-white`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-center">{action.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Daily Tip */}
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200/50 dark:from-amber-950/30 dark:to-orange-950/30 dark:border-amber-800/50">
          <CardContent className="flex items-start gap-3 py-4">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
              <Lightbulb className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">{t('farmer.myDay.dailyTip')}</p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {t('farmer.myDay.dailyTipPlaceholder')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        {recentOrders.length > 0 && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">{t('farmer.myDay.recentOrders')}</CardTitle>
            </CardHeader>
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
                    <Button variant="ghost" className="min-h-[44px] min-w-[44px]" aria-label={t('farmer.myDay.gotIt')}
                      onClick={() => setStatusExplain({ type: 'order', status: order.status })}>
                      <Info className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" className="min-h-[44px] min-w-[44px]" aria-label={t('farmer.myDay.needHelp')}
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
              <DialogHeader><DialogTitle>{t('common.status')}: {statusExplain.status}</DialogTitle></DialogHeader>
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
