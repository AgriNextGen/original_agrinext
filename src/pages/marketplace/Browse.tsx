import { useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import PageShell from '@/components/layout/PageShell';
import DataState from '@/components/ui/DataState';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Leaf, MapPin, Calendar, Filter, SortAsc } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { useMarketProductsInfinite } from '@/hooks/useMarketplaceDashboard';
import { ROUTES } from '@/lib/routes';
import { format, parseISO } from 'date-fns';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  draft: 'bg-gray-100 text-gray-800',
  sold_out: 'bg-red-100 text-red-800',
  ready: 'bg-green-100 text-green-800',
  one_week: 'bg-amber-100 text-amber-800',
  growing: 'bg-blue-100 text-blue-800',
};

const BrowseMarketplace = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useMarketProductsInfinite({
    cropName: searchQuery || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });
  const products = data ? data.pages.flatMap((p: any) => p.items || []) : [];

  const statusLabelKeys: Record<string, string> = {
    active: t('enum.listing_status.active'),
    draft: t('enum.listing_status.draft'),
    sold_out: t('enum.listing_status.sold_out'),
    ready: t('enum.listing_status.ready'),
    one_week: t('enum.listing_status.one_week'),
    growing: t('enum.listing_status.growing'),
  };

  const sortedProducts = [...(products || [])].sort((a, b) => {
    switch (sortBy) {
      case 'quantity_high':
        return (b.available_qty ?? 0) - (a.available_qty ?? 0);
      case 'quantity_low':
        return (a.available_qty ?? 0) - (b.available_qty ?? 0);
      case 'price_low':
        return (a.unit_price ?? 0) - (b.unit_price ?? 0);
      case 'price_high':
        return (b.unit_price ?? 0) - (a.unit_price ?? 0);
      default:
        return 0;
    }
  });

  if (isLoading) {
    return (
      <DashboardLayout title={t('marketplace.browseMarketplace')}>
        <DataState loading>
          <></>
        </DataState>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('marketplace.browseMarketplace')}>
      <PageShell
        title={t('marketplace.browseMarketplace')}
        subtitle={`${sortedProducts.length} ${t('marketplace.productsAvailable')}`}
      >

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('marketplace.searchCrops')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40" aria-label={t('marketplace.allStatus')}>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t('common.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('marketplace.allStatus')}</SelectItem>
                <SelectItem value="active">{t('marketplace.available')}</SelectItem>
                <SelectItem value="sold_out">{t('enum.listing_status.sold_out')}</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-44" aria-label={t('marketplace.sortBy')}>
                <SortAsc className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t('marketplace.sortBy')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t('marketplace.newestFirst')}</SelectItem>
                <SelectItem value="price_low">{t('marketplace.priceLowToHigh')}</SelectItem>
                <SelectItem value="price_high">{t('marketplace.priceHighToLow')}</SelectItem>
                <SelectItem value="quantity_high">{t('marketplace.quantityHigh')}</SelectItem>
                <SelectItem value="quantity_low">{t('marketplace.quantityLow')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <DataState
        empty={sortedProducts.length === 0}
        emptyTitle={t('marketplace.noProductsFound')}
        emptyMessage={t('marketplace.tryDifferentFilters')}
      >
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedProducts.map(product => (
            <Card
              key={product.id}
              className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
              role="link"
              aria-label={product.title}
              onClick={() => navigate(ROUTES.MARKETPLACE.PRODUCT_DETAIL(product.id))}
            >
              <CardContent className="p-0">
                {product.image_url ? (
                  <div className="h-32 overflow-hidden">
                    <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-32 bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center">
                    <Leaf className="h-12 w-12 text-green-300" />
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{product.title}</h3>
                      {product.variety && (
                        <p className="text-sm text-muted-foreground">{product.variety}</p>
                      )}
                    </div>
                    <Badge className={statusColors[product.status ?? 'active'] ?? 'bg-gray-100'}>
                      {statusLabelKeys[product.status ?? 'active'] ?? product.status}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('marketplace.price')}:</span>
                      <span className="font-semibold text-green-700">₹{product.unit_price}/{product.unit}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('marketplace.available')}:</span>
                      <span className="font-medium">{product.available_qty} {product.unit}</span>
                    </div>

                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>
                        {product.location || product.farmer?.village || t('common.unknown')}
                        {product.farmer?.district && `, ${product.farmer.district}`}
                      </span>
                    </div>

                    {product.crop?.harvest_estimate && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{t('marketplace.harvest')}: {format(parseISO(product.crop.harvest_estimate), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </div>

                  <Button className="w-full mt-4" variant="outline" onClick={(e) => { e.stopPropagation(); navigate(ROUTES.MARKETPLACE.PRODUCT_DETAIL(product.id)); }}>
                    {t('marketplace.viewDetails')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Load more */}
        <div className="mt-6 text-center">
          {hasNextPage ? (
            <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>{isFetchingNextPage ? t('common.loading') : t('common.loadMore')}</Button>
          ) : (
            <div className="text-sm text-muted-foreground">{t('common.noMoreItems')}</div>
          )}
        </div>
      </DataState>
      </PageShell>
    </DashboardLayout>
  );
};

export default BrowseMarketplace;
