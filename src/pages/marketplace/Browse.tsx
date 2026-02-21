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
import { useInfiniteQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';

const statusColors: Record<string, string> = {
  ready: 'bg-green-100 text-green-800',
  one_week: 'bg-amber-100 text-amber-800',
  growing: 'bg-blue-100 text-blue-800',
};

const statusLabels: Record<string, string> = {
  ready: 'Ready Now',
  one_week: '1 Week Away',
  growing: 'Growing',
};

const BrowseMarketplace = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useMarketProductsInfinite({
    cropName: searchQuery || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });
  const products = data ? data.pages.flatMap((p: any) => p.items || []) : [];
  const { t } = useLanguage();

  // Sort products
  const sortedProducts = [...(products || [])].sort((a, b) => {
    switch (sortBy) {
      case 'quantity_high':
        return (b.estimated_quantity || 0) - (a.estimated_quantity || 0);
      case 'quantity_low':
        return (a.estimated_quantity || 0) - (b.estimated_quantity || 0);
      case 'harvest_date':
        if (!a.harvest_estimate) return 1;
        if (!b.harvest_estimate) return -1;
        return new Date(a.harvest_estimate).getTime() - new Date(b.harvest_estimate).getTime();
      default:
        return 0;
    }
  });

  if (isLoading) {
    return (
      <DashboardLayout title="Browse Marketplace">
        <DataState loading>
          <></>
        </DataState>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Browse Marketplace">
      <PageShell
        title="Browse Marketplace"
        subtitle={`${sortedProducts.length} products available`}
      >

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search crops..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ready">Ready Now</SelectItem>
                <SelectItem value="one_week">1 Week Away</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-44">
                <SortAsc className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="harvest_date">Harvest Date</SelectItem>
                <SelectItem value="quantity_high">Quantity: High</SelectItem>
                <SelectItem value="quantity_low">Quantity: Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <DataState
        empty={sortedProducts.length === 0}
        emptyTitle="No products found"
        emptyMessage="Try adjusting your search or filters."
      >
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedProducts.map(product => (
            <Card 
              key={product.id}
              className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
              onClick={() => navigate(`/marketplace/product/${product.id}`)}
            >
              <CardContent className="p-0">
                {/* Product Image Placeholder */}
                <div className="h-32 bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center">
                  <Leaf className="h-12 w-12 text-green-300" />
                </div>
                
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{product.crop_name}</h3>
                      {product.variety && (
                        <p className="text-sm text-muted-foreground">{product.variety}</p>
                      )}
                    </div>
                    <Badge className={statusColors[product.status]}>
                      {statusLabels[product.status]}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Available:</span>
                      <span className="font-medium">{product.estimated_quantity} {product.quantity_unit}</span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>
                        {product.land?.village || product.farmer?.village || 'Unknown'}
                        {product.farmer?.district && `, ${product.farmer.district}`}
                      </span>
                    </div>
                    
                    {product.harvest_estimate && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Harvest: {format(parseISO(product.harvest_estimate), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </div>
                  
                  <Button className="w-full mt-4" variant="outline">
                    View Details
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
