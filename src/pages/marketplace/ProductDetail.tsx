import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
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
  Phone
} from 'lucide-react';
import { useProductDetail, useCreateOrder, useBuyerProfile } from '@/hooks/useMarketplaceDashboard';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  ready: 'bg-green-100 text-green-800',
  one_week: 'bg-amber-100 text-amber-800',
  growing: 'bg-blue-100 text-blue-800',
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading } = useProductDetail(id!);
  const { data: buyerProfile } = useBuyerProfile();
  const createOrder = useCreateOrder();
  
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [orderQuantity, setOrderQuantity] = useState('');
  const [orderPrice, setOrderPrice] = useState('');
  const [orderAddress, setOrderAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceForecast, setPriceForecast] = useState<string | null>(null);
  const [altLoading, setAltLoading] = useState(false);
  const [alternatives, setAlternatives] = useState<string | null>(null);

  const handlePriceForecast = async () => {
    if (!product) return;
    
    setPriceLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('marketplace-ai', {
        body: { type: 'price_forecast', product }
      });
      
      if (error) throw error;
      setPriceForecast(data.result);
    } catch (error) {
      console.error('AI error:', error);
      toast.error('Failed to get price forecast');
    } finally {
      setPriceLoading(false);
    }
  };

  const handleAlternatives = async () => {
    if (!product) return;
    
    setAltLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('marketplace-ai', {
        body: { type: 'alternatives', product }
      });
      
      if (error) throw error;
      setAlternatives(data.result);
    } catch (error) {
      console.error('AI error:', error);
      toast.error('Failed to get alternatives');
    } finally {
      setAltLoading(false);
    }
  };

  const handlePlaceOrder = () => {
    if (!product || !orderQuantity) {
      toast.error('Please enter quantity');
      return;
    }
    
    createOrder.mutate({
      crop_id: product.id,
      farmer_id: product.farmer_id,
      quantity: parseFloat(orderQuantity),
      quantity_unit: product.quantity_unit,
      price_offered: orderPrice ? parseFloat(orderPrice) : undefined,
      delivery_address: orderAddress,
      notes: orderNotes,
    }, {
      onSuccess: () => {
        setIsOrderOpen(false);
        toast.success('Order placed! The farmer will review your request.');
        navigate('/marketplace/orders');
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
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Card className="mt-6">
          <CardContent className="py-12 text-center">
            <Leaf className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg text-muted-foreground">Product not found</p>
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

  return (
    <DashboardLayout title={product.crop_name}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{product.crop_name}</h1>
          {product.variety && <p className="text-muted-foreground">{product.variety}</p>}
        </div>
        <Badge className={statusColors[product.status] || 'bg-gray-100'}>
          {product.status === 'ready' ? 'Ready Now' : product.status === 'one_week' ? '1 Week' : product.status}
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Product Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-green-600" />
                Product Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-48 bg-gradient-to-br from-green-100 to-green-50 rounded-lg flex items-center justify-center">
                <Leaf className="h-20 w-20 text-green-300" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Quantity Available</p>
                  <p className="font-semibold text-lg">{product.estimated_quantity} {product.quantity_unit}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Harvest Date</p>
                  <p className="font-semibold">
                    {product.harvest_estimate 
                      ? format(parseISO(product.harvest_estimate), 'MMM d, yyyy')
                      : 'TBD'}
                  </p>
                </div>
                {product.sowing_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Sowing Date</p>
                    <p className="font-semibold">{format(parseISO(product.sowing_date), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>

              {/* Market Price */}
              {product.market_price && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Market Price</p>
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
                Farmer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{product.farmer?.full_name || 'Farmer'}</p>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  {product.land?.village || product.farmer?.village || 'Unknown'}
                  {product.farmer?.district && `, ${product.farmer.district}`}
                </span>
              </div>
              {product.farmer?.phone && (
                <Button variant="outline" className="w-full" onClick={() => window.open(`tel:${product.farmer?.phone}`)}>
                  <Phone className="h-4 w-4 mr-2" />
                  Contact Farmer
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
                Place Order
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Request to purchase this crop directly from the farmer.
              </p>
              <Button className="w-full" size="lg" onClick={() => setIsOrderOpen(true)}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Request Purchase
              </Button>
            </CardContent>
          </Card>

          {/* AI Tools */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Insights
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
                  {priceLoading ? 'Analyzing...' : 'Should I Buy Now?'}
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
                  {altLoading ? 'Finding...' : 'Suggest Alternatives'}
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
              <DialogTitle>Request Purchase</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{product.crop_name}</p>
                <p className="text-sm text-muted-foreground">
                  Available: {product.estimated_quantity} {product.quantity_unit}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity Needed *</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder={`Max: ${product.estimated_quantity} ${product.quantity_unit}`}
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="price">Your Offer Price (₹/quintal)</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="Optional"
                  value={orderPrice}
                  onChange={(e) => setOrderPrice(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Delivery Address</Label>
                <Textarea
                  id="address"
                  placeholder="Where should it be delivered?"
                  value={orderAddress}
                  onChange={(e) => setOrderAddress(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special requirements?"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOrderOpen(false)}>Cancel</Button>
              <Button onClick={handlePlaceOrder} disabled={createOrder.isPending}>
                {createOrder.isPending ? 'Placing...' : 'Place Order'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ProductDetail;
