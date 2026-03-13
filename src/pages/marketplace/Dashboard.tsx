import { useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingCart,
  Leaf,
  Package,
  Sparkles,
  ArrowRight,
  MapPin,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { rpcJson } from '@/lib/readApi';
import {
  useBuyerProfile,
  useCreateBuyerProfile,
  useMarketProducts,
  useMarketplaceDashboardStats,
  useBuyerOrders,
} from '@/hooks/useMarketplaceDashboard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { ROUTES } from '@/lib/routes';
import PageHeader from '@/components/shared/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/shared/EmptyState';
import KpiCard from '@/components/dashboard/KpiCard';
import ActionPanel from '@/components/dashboard/ActionPanel';

const MarketplaceDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: profile, isLoading: profileLoading } = useBuyerProfile();
  const createProfile = useCreateBuyerProfile();
  const { data: products } = useMarketProducts();
  const { data: orders } = useBuyerOrders();
  const { data: rpcStats, isLoading: rpcLoading } = useQuery({
    queryKey: ['buyer-dashboard'],
    queryFn: async () => {
      return await rpcJson('buyer_dashboard_v1');
    }
  });
  const stats = {
    totalProducts: products?.length || 0,
    freshHarvest: rpcStats?.recent_orders_top10 ? rpcStats.recent_orders_top10.length : 0,
    oneWeekAway: 0,
    activeOrders: rpcStats?.recent_orders_top10 ? rpcStats.recent_orders_top10.length : 0,
  };

  const [aiLoading, setAiLoading] = useState(false);
  const [stockAdvice, setStockAdvice] = useState<string | null>(null);

  const handleCreateProfile = () => {
    createProfile.mutate({
      name: user?.email?.split('@')[0] || 'Buyer',
      buyer_type: 'retail',
    });
  };

  const handleStockRecommendation = async () => {
    if (!profile) return;

    setAiLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-gateway/marketplace-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          type: 'stock_recommendation',
          buyerProfile: profile,
          marketData: { available_crops: products?.slice(0, 10) },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Function error');
      setStockAdvice(data.result);
      toast.success(t('toast.aiRecommendationsReady'));
    } catch (error) {
      if (import.meta.env.DEV) console.error('AI error:', error);
      toast.error(t('errors.ai.recommendationsFailed'));
    } finally {
      setAiLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout title={t('nav.dashboard')}>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full rounded-lg" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout title={t('nav.dashboard')}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <ShoppingCart className="mx-auto mb-4 h-16 w-16 text-primary" />
              <CardTitle>{t('marketplace.welcomeMarketplace')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                {t('marketplace.setupBuyerProfile')}
              </p>
              <Button className="w-full" onClick={handleCreateProfile} disabled={createProfile.isPending}>
                {createProfile.isPending ? t('marketplace.creatingProfile') : t('marketplace.createBuyerProfile')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const freshProducts = products?.filter((p) => p.is_active && p.available_qty > 0).slice(0, 4) || [];
  const activeOrders = orders?.filter((o) => !['delivered', 'cancelled'].includes(o.status)).slice(0, 3) || [];
  const subtitleParts = [
    profile.name ? `${t('common.welcome')}, ${profile.name}` : t('common.welcome'),
    profile.company_name || profile.buyer_type || '',
  ].filter(Boolean);

  return (
    <DashboardLayout title={t('nav.dashboard')}>
      <PageHeader
        title={t('marketplace.browseMarketplace')}
        subtitle={subtitleParts.join(' - ')}
        actions={
          <Button aria-label="Browse marketplace" onClick={() => navigate(ROUTES.MARKETPLACE.BROWSE)}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            {t('marketplace.browseProducts')}
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard label={t('marketplace.available')} value={stats.totalProducts} icon={Package} priority="primary" onClick={() => navigate(ROUTES.MARKETPLACE.BROWSE)} />
          <KpiCard label={t('marketplace.freshHarvest')} value={stats.freshHarvest} icon={Leaf} priority="success" />
          <KpiCard label={t('marketplace.activeOrdersLabel')} value={stats.activeOrders} icon={ShoppingCart} priority="info" onClick={() => navigate(ROUTES.MARKETPLACE.ORDERS)} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Leaf className="h-5 w-5 text-success" />
                  {t('marketplace.freshHarvestAvailable')}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.MARKETPLACE.BROWSE)}>
                  {t('common.viewAll')} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {freshProducts.length === 0 ? (
                <EmptyState icon={Leaf} title={t('marketplace.noProductsFound')} description={t('marketplace.tryDifferentFilters')} />
              ) : (
                <div className="space-y-3">
                  {freshProducts.map((product) => (
                    <div key={product.id} className="cursor-pointer rounded-lg border p-3 transition-colors hover:bg-accent/50" onClick={() => navigate(ROUTES.MARKETPLACE.PRODUCT_DETAIL(product.id))}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium">{product.title}</span>
                        <span className="text-sm font-semibold text-success">₹{product.unit_price}/{product.unit}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{product.available_qty} {product.unit}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{product.location || product.farmer?.village || t('common.unknown')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  {t('marketplace.yourActiveOrders')}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.MARKETPLACE.ORDERS)}>
                  {t('common.viewAll')} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activeOrders.length === 0 ? (
                <EmptyState icon={ShoppingCart} title={t('orders.noOrdersYet')} description={t('marketplace.browseProducts')} actionLabel={t('marketplace.browseProducts')} onAction={() => navigate(ROUTES.MARKETPLACE.BROWSE)} />
              ) : (
                <div className="space-y-3">
                  {activeOrders.map((order) => (
                    <div key={order.id} className="cursor-pointer rounded-lg border p-3 transition-colors hover:bg-accent/50" onClick={() => navigate(ROUTES.MARKETPLACE.ORDERS)}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium">{order.crop?.crop_name || 'Order'}</span>
                        <Badge variant="outline">{order.status}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{order.total_amount != null ? `₹${Number(order.total_amount).toLocaleString()}` : '-'}</span>
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />{order.farmer?.full_name || 'Farmer'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <ActionPanel
          title={t('marketplace.aiStockAdvisor')}
          context={t('marketplace.stockAdvisorContext')}
          primaryAction={<Button onClick={handleStockRecommendation} disabled={aiLoading}><Sparkles className="mr-2 h-4 w-4" />{aiLoading ? t('marketplace.stockAdvisorAnalyzing') : t('marketplace.stockAdvisorCta')}</Button>}
        >
          {stockAdvice ? (
            <div className="rounded-lg bg-background p-4 text-sm whitespace-pre-wrap">{stockAdvice}</div>
          ) : (
            <p className="text-muted-foreground">{t('marketplace.stockAdvisorFallback')}</p>
          )}
        </ActionPanel>
      </PageHeader>
    </DashboardLayout>
  );
};

export default MarketplaceDashboard;
