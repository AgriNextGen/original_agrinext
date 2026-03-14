import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/routes';
import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Leaf, 
  MapPin, 
  Calendar, 
  User,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  ShoppingCart,
  Phone,
  Loader2
} from 'lucide-react';
import { useProductDetail, useCreateOrder, useBuyerProfile } from '@/hooks/useMarketplaceDashboard';
import { useLanguage } from '@/hooks/useLanguage';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  draft: 'bg-gray-100 text-gray-800',
  sold_out: 'bg-red-100 text-red-800',
  ready: 'bg-green-100 text-green-800',
  one_week: 'bg-amber-100 text-amber-800',
  growing: 'bg-blue-100 text-blue-800',
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: product, isLoading } = useProductDetail(id!);
  const { data: buyerProfile } = useBuyerProfile();
  const createOrder = useCreateOrder();
  
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [orderQuantity, setOrderQuantity] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [qtyError, setQtyError] = useState<string | null>(null);
  
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceForecast, setPriceForecast] = useState<string | null>(null);
  const [altLoading, setAltLoading] = useState(false);
  const [alternatives, setAlternatives] = useState<string | null>(null);

  const handlePriceForecast = async () => {
    if (!product) return;
    
    setPriceLoading(true);
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
        body: JSON.stringify({ type: 'price_forecast', product }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Function error');
      setPriceForecast(data.result);
    } catch (error) {
      if (import.meta.env.DEV) console.error('AI error:', error);
      toast.error(t('marketplace.priceForecastFailed'));
    } finally {
      setPriceLoading(false);
    }
  };

  const handleAlternatives = async () => {
    if (!product) return;
    
    setAltLoading(true);
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
        body: JSON.stringify({ type: 'alternatives', product }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Function error');
      setAlternatives(data.result);
    } catch (error) {
      if (import.meta.env.DEV) console.error('AI error:', error);
      toast.error(t('marketplace.alternativesFailed'));
    } finally {
      setAltLoading(false);
    }
  };

  const handlePlaceOrder = () => {
    if (!product || !orderQuantity) {
      toast.error(t('marketplace.enterQuantity'));
      return;
    }
    const qty = parseFloat(orderQuantity);
    if (isNaN(qty) || qty <= 0) {
      setQtyError(t('marketplace.enterQuantity'));
      return;
    }
    if (qty > product.available_qty) {
      setQtyError(`${t('marketplace.maxQuantity')}: ${product.available_qty} ${product.unit}`);
      return;
    }
    setQtyError(null);

    const notesParts = [orderNotes];
    if (deliveryAddress) notesParts.unshift(`Delivery: ${deliveryAddress}`);
    const combinedNotes = notesParts.filter(Boolean).join('\n');

    createOrder.mutate({
      listing_id: product.id,
      quantity: qty,
      notes: combinedNotes,
    }, {
      onSuccess: () => {
        setIsOrderOpen(false);
        toast.success(t('marketplace.orderPlacedSuccess'));
        navigate(ROUTES.MARKETPLACE.ORDERS);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-4 md:p-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> {t('marketplace.back')}
        </Button>
        <Card className="mt-6">
          <CardContent className="py-12 text-center">
            <Leaf className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg text-muted-foreground">{t('marketplace.productNotFound')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const trendIcon = product.market_price?.trend_direction === 'up' 
    ? TrendingUp 
    : product.market_price?.trend_direction === 'down' 
      ? TrendingDown 
      : Minus;

  const displayStatus = product.status ?? 'active';

  return (
    <DashboardLayout title={product.title}>
      <PageShell
        title={product.title}
        subtitle={product.variety ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> {t('marketplace.back')}
            </Button>
            <Badge className={statusColors[displayStatus] || 'bg-gray-100'}>
              {displayStatus === 'active' ? t('marketplace.available') : displayStatus === 'sold_out' ? t('marketplace.soldOut') : displayStatus}
            </Badge>
          </div>
        }
      >

      <div className="grid md:grid-cols-2 gap-6">
        {/* Product Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-green-600" />
                {t('marketplace.productDetailsTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.image_url ? (
                <div className="h-48 rounded-lg overflow-hidden">
                  <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-green-100 to-green-50 rounded-lg flex items-center justify-center">
                  <Leaf className="h-20 w-20 text-green-300" />
                </div>
              )}

              {product.description && (
                <p className="text-muted-foreground">{product.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('marketplace.price')}</p>
                  <p className="font-semibold text-lg text-green-700">₹{product.unit_price}/{product.unit}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('marketplace.availableQuantity')}</p>
                  <p className="font-semibold text-lg">{product.available_qty} {product.unit}</p>
                </div>
                {product.crop?.harvest_estimate && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('marketplace.harvestDate')}</p>
                    <p className="font-semibold">
                      {format(parseISO(product.crop.harvest_estimate), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
                {product.crop?.sowing_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('marketplace.sowingDate')}</p>
                    <p className="font-semibold">{format(parseISO(product.crop.sowing_date), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>

              {/* Market Price */}
              {product.market_price && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('marketplace.marketPrice')}</p>
                      <p className="font-semibold text-xl">₹{product.market_price.modal_price}/quintal</p>
                    </div>
                    <div className={`flex items-center gap-1 ${
                      product.market_price.trend_direction === 'up' ? 'text-green-600' :
                      product.market_price.trend_direction === 'down' ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {product.market_price.trend_direction === 'up' && <TrendingUp className="h-5 w-5" />}
                      {product.market_price.trend_direction === 'down' && <TrendingDown className="h-5 w-5" />}
                      {product.market_price.trend_direction === 'flat' && <Minus className="h-5 w-5" />}
                      <span className="text-sm font-medium capitalize">{product.market_price.trend_direction}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Farmer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                {t('marketplace.farmerDetails')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">{t('marketplace.farmerName')}</p>
                <p className="font-medium">{product.farmer?.full_name || t('marketplace.orderFarmer')}</p>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  {product.location || product.land?.village || product.farmer?.village || t('common.unknown')}
                  {product.farmer?.district && `, ${product.farmer.district}`}
                </span>
              </div>
              {product.farmer?.phone && (
                <Button variant="outline" className="w-full" onClick={() => window.open(`tel:${product.farmer?.phone}`)}>
                  <Phone className="h-4 w-4 mr-2" />
                  {t('marketplace.contactFarmer')}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order & AI Panel */}
        <div className="space-y-6">
          {/* Order Box */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                {t('marketplace.placeOrder')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {t('marketplace.requestPurchaseDesc')}
              </p>
              <Button className="w-full" size="lg" onClick={() => setIsOrderOpen(true)}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                {t('marketplace.requestPurchase')}
              </Button>
            </CardContent>
          </Card>

          {/* AI Tools */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {t('marketplace.aiInsights')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Button 
                  variant="outline" 
                  className="w-full mb-2"
                  onClick={handlePriceForecast}
                  disabled={priceLoading}
                >
                  {priceLoading ? t('marketplace.analyzingPrice') : t('marketplace.shouldIBuyNow')}
                </Button>
                {priceForecast && (
                  <div className="p-3 bg-background rounded-lg text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {priceForecast}
                  </div>
                )}
              </div>
              
              <div>
                <Button 
                  variant="outline" 
                  className="w-full mb-2"
                  onClick={handleAlternatives}
                  disabled={altLoading}
                >
                  {altLoading ? t('marketplace.findingAlternatives') : t('marketplace.suggestAlternatives')}
                </Button>
                {alternatives && (
                  <div className="p-3 bg-background rounded-lg text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {alternatives}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

        {/* Order Dialog */}
        <Dialog open={isOrderOpen} onOpenChange={setIsOrderOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('marketplace.requestPurchase')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{product.title}</p>
                <p className="text-sm text-muted-foreground">
                  {t('marketplace.available')}: {product.available_qty} {product.unit} &middot; ₹{product.unit_price}/{product.unit}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">{t('marketplace.quantityNeeded')} *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={product.available_qty}
                  placeholder={`${t('marketplace.maxQuantity')}: ${product.available_qty} ${product.unit}`}
                  value={orderQuantity}
                  onChange={(e) => { setOrderQuantity(e.target.value); setQtyError(null); }}
                  className={qtyError ? 'border-destructive' : ''}
                />
                {qtyError && <p className="text-xs text-destructive">{qtyError}</p>}
              </div>

              {orderQuantity && parseFloat(orderQuantity) > 0 && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('marketplace.totalAmount')}:</span>
                    <span className="text-lg font-bold text-primary">
                      ₹{(parseFloat(orderQuantity) * product.unit_price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="delivery">{t('marketplace.deliveryAddress')}</Label>
                <Input
                  id="delivery"
                  placeholder={t('marketplace.deliveryAddressPlaceholder')}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">{t('marketplace.orderNotes')}</Label>
                <Textarea
                  id="notes"
                  placeholder={t('marketplace.orderNotesPlaceholder')}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOrderOpen(false)}>{t('marketplace.cancelOrder')}</Button>
              <Button onClick={handlePlaceOrder} disabled={createOrder.isPending}>
                {createOrder.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('marketplace.placingOrder')}</> : t('marketplace.placeOrderBtn')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageShell>
    </DashboardLayout>
  );
};

export default ProductDetail;
