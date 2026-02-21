import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
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
import { useToast } from '@/components/ui/use-toast';

const STATUS_EXPLANATIONS: Record<string, Record<string, string>> = {
  order: {
    pending: 'Your order has been placed and is waiting for confirmation.',
    confirmed: 'The buyer has confirmed the order. Prepare your produce.',
    ready_for_pickup: 'Your produce is ready. A transporter will pick it up soon.',
    in_transit: 'Your produce is on its way to the buyer.',
    delivered: 'The buyer has received your produce. Payment will follow.',
    cancelled: 'This order was cancelled.',
  },
  transport: {
    requested: 'You have requested transport. Waiting for a transporter to accept.',
    open: 'Transport request is open and visible to transporters.',
    accepted: 'A transporter has accepted your request.',
    in_progress: 'Your produce is being transported.',
    completed: 'Transport has been completed.',
    cancelled: 'Transport request was cancelled.',
  },
  listing: {
    draft: 'Your listing is in draft. Publish it to make it visible to buyers.',
    pending: 'Your listing is pending review by the platform.',
    approved: 'Your listing is live and visible to buyers.',
    sold: 'Your listing has been sold out.',
    expired: 'Your listing has expired. Create a new one to sell.',
  },
};

export default function FarmerMyDay() {
  const { user } = useAuth();
  const { t } = useLanguage();
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
    pendingActions.push({ icon: Package, label: 'Active orders to manage', count: activeOrders, link: '/farmer/orders', type: 'order' });
  }
  if (openTransport > 0) {
    pendingActions.push({ icon: Truck, label: 'Open transport requests', count: openTransport, link: '/farmer/transport', type: 'transport' });
  }
  const draftListings = listingsByStatus['draft'] || 0;
  if (draftListings > 0) {
    pendingActions.push({ icon: ShoppingBag, label: 'Draft listings to publish', count: draftListings, link: '/farmer/listings', type: 'listing' });
  }
  const harvestReady = cropsbyStatus['harvest_ready'] || cropsbyStatus['ready'] || 0;
  if (harvestReady > 0) {
    pendingActions.push({ icon: ShoppingBag, label: 'Harvest-ready crops', count: harvestReady, link: '/farmer/crops', type: 'listing' });
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
        toast({ title: 'Help request sent', description: 'Our team will look into this.' });
        setHelpDialog(null);
        setHelpMessage('');
      },
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6" /> My Day
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Quick stats */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{activeOrders}</p><p className="text-xs text-muted-foreground">Active Orders</p></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{openTransport}</p><p className="text-xs text-muted-foreground">Transport Requests</p></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{Object.values(listingsByStatus).reduce((a: number, b: number) => a + b, 0)}</p><p className="text-xs text-muted-foreground">Listings</p></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{Object.values(cropsbyStatus).reduce((a: number, b: number) => a + b, 0)}</p><p className="text-xs text-muted-foreground">Crops</p></CardContent></Card>
          </div>
        )}

        {/* Pending Actions */}
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-base">Pending Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pendingActions.length === 0 && !isLoading && (
              <p className="text-sm text-muted-foreground text-center py-4">No pending actions today. You're all caught up!</p>
            )}
            {pendingActions.map((action, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(action.link)}>
                <div className="flex items-center gap-3">
                  <action.icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{action.label}</p>
                    <Badge variant="secondary" className="text-xs">{action.count}</Badge>
                  </div>
                </div>
                <Button size="sm" variant="outline">Go</Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Orders with status explanation */}
        {recentOrders.length > 0 && (
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-base">Recent Orders</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {recentOrders.slice(0, 5).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-2 rounded border">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{order.status}</Badge>
                      <span className="text-sm font-medium">Rs. {order.total_amount}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" title="Explain status"
                      onClick={() => setStatusExplain({ type: 'order', status: order.status })}>
                      <Info className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" title="Need help?"
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
                {STATUS_EXPLANATIONS[statusExplain.type]?.[statusExplain.status] || 'No explanation available for this status.'}
              </p>
              <DialogFooter>
                <Button onClick={() => setStatusExplain(null)}>Got it</Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>

        {/* Help Request Dialog */}
        <Dialog open={!!helpDialog} onOpenChange={(o) => !o && setHelpDialog(null)}>
          {helpDialog && (
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Need Help?</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">
                Describe your issue and our team will help you.
                <br />Entity: {helpDialog.entityType}/{helpDialog.entityId.slice(0, 8)}
              </p>
              <Select value={helpCategory} onValueChange={setHelpCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="order">Order issue</SelectItem>
                  <SelectItem value="trip">Transport issue</SelectItem>
                  <SelectItem value="listing">Listing issue</SelectItem>
                  <SelectItem value="payment">Payment issue</SelectItem>
                  <SelectItem value="account">Account issue</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                value={helpMessage}
                onChange={(e) => setHelpMessage(e.target.value)}
                placeholder="What do you need help with?"
                rows={3}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setHelpDialog(null)}>Cancel</Button>
                <Button onClick={handleCreateTicket} disabled={!helpMessage.trim() || createTicket.isPending}>
                  {createTicket.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Send
                </Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
