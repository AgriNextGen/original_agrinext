import { useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingCart,
  Leaf,
  TrendingUp,
  Package,
  Sparkles,
  ArrowRight,
  MapPin,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
import PageShell from '@/components/layout/PageShell';
import KpiCard from '@/components/dashboard/KpiCard';
import ActionPanel from '@/components/dashboard/ActionPanel';

const MarketplaceDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: profile, isLoading: profileLoading } = useBuyerProfile();
  const createProfile = useCreateBuyerProfile();
  const { data: products } = useMarketProducts();
  const stats = useMarketplaceDashboardStats();
  const { data: orders } = useBuyerOrders();

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
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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
      toast.success('AI recommendations ready!');
    } catch (error) {
      console.error('AI error:', error);
      toast.error('Failed to get recommendations');
    } finally {
      setAiLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout title={t('nav.dashboard')}>
        <div className="space-y-6">
          <div className="h-32 w-full animate-pulse rounded-lg bg-muted" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
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
              <CardTitle>Welcome to AgriNext Gen Marketplace!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                Set up your buyer profile to start purchasing fresh produce directly from farmers.
              </p>
              <Button className="w-full" onClick={handleCreateProfile} disabled={createProfile.isPending}>
                {createProfile.isPending ? 'Creating...' : 'Create Buyer Profile'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const freshProducts = products?.filter((p) => p.status === 'ready').slice(0, 4) || [];
  const activeOrders = orders?.filter((o) => !['delivered', 'cancelled'].includes(o.status)).slice(0, 3) || [];

  return (
    <DashboardLayout title={t('nav.dashboard')}>
      <PageShell
        title={t('marketplace.browseMarketplace')}
        subtitle={`Welcome, ${profile.name} - ${profile.company_name || profile.buyer_type}`}
        actions={
          <Button onClick={() => navigate('/marketplace/browse')}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            {t('marketplace.browseProducts')}
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard label={t('marketplace.available')} value={stats.totalProducts} icon={Package} priority="primary" onClick={() => navigate('/marketplace/browse')} />
          <KpiCard label="Fresh Harvest" value={stats.freshHarvest} icon={Leaf} priority="success" />
          <KpiCard label="Coming Soon" value={stats.oneWeekAway} icon={TrendingUp} priority="warning" />
          <KpiCard label="Active Orders" value={stats.activeOrders} icon={ShoppingCart} priority="info" onClick={() => navigate('/marketplace/orders')} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Leaf className="h-5 w-5 text-green-600" />
                  Fresh Harvest Available
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/marketplace/browse')}>
                  {t('common.viewAll')} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {freshProducts.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Leaf className="mx-auto mb-3 h-12 w-12 opacity-50" />
                  <p>{t('marketplace.noProductsFound')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {freshProducts.map((product) => (
                    <div key={product.id} className="cursor-pointer rounded-lg border p-3 transition-colors hover:bg-accent/50" onClick={() => navigate(`/marketplace/product/${product.id}`)}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium">{product.crop_name}</span>
                        <Badge variant="default" className="bg-green-100 text-green-800">{t('crops.readyShort')}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{product.estimated_quantity} {product.quantity_unit}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{product.farmer?.village || product.land?.village || t('common.unknown')}</span>
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
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                  Your Active Orders
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/marketplace/orders')}>
                  {t('common.viewAll')} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activeOrders.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <ShoppingCart className="mx-auto mb-3 h-12 w-12 opacity-50" />
                  <p>{t('orders.noOrdersYet')}</p>
                  <Button variant="link" onClick={() => navigate('/marketplace/browse')}>{t('marketplace.browseProducts')}</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeOrders.map((order) => (
                    <div key={order.id} className="cursor-pointer rounded-lg border p-3 transition-colors hover:bg-accent/50" onClick={() => navigate('/marketplace/orders')}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium">{order.crop?.crop_name || 'Order'}</span>
                        <Badge variant="outline">{order.status}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{order.quantity} {order.quantity_unit}</span>
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
          title="AI Stock Advisor"
          context="Get recommendations on what to stock this week from your market profile and fresh inventory."
          primaryAction={<Button onClick={handleStockRecommendation} disabled={aiLoading}><Sparkles className="mr-2 h-4 w-4" />{aiLoading ? 'Analyzing...' : 'What Should I Stock?'}</Button>}
        >
          {stockAdvice ? (
            <div className="rounded-lg bg-background p-4 text-sm whitespace-pre-wrap">{stockAdvice}</div>
          ) : (
            <p className="text-muted-foreground">Get AI-powered recommendations based on market trends and your buyer profile.</p>
          )}
        </ActionPanel>
      </PageShell>
    </DashboardLayout>
  );
};

export default MarketplaceDashboard;
