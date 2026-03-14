import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MapPin, Building, Package, Inbox } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { useAllBuyers } from '@/hooks/useAdminDashboard';
import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const AdminBuyers = () => {
  const { t } = useLanguage();
  const { data: buyers, isLoading } = useAllBuyers();
  const [search, setSearch] = useState('');

  const filteredBuyers = buyers?.filter(b => 
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.district?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const buyerTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      retail: t('admin.buyers.types.retail'),
      wholesale: t('admin.buyers.types.wholesale'),
      restaurant: t('admin.buyers.types.restaurant'),
      export: t('admin.buyers.types.export'),
      processor: t('admin.buyers.types.food_processor'),
    };
    return typeMap[type] || type;
  };

  return (
    <DashboardLayout title={t('admin.buyers.title')}>
      <PageShell
        title={t('admin.buyers.title')}
        subtitle={t('admin.buyers.subtitle')}
        actions={
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('admin.buyers.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.buyers.allBuyers')} ({filteredBuyers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredBuyers.length === 0 ? (
              <EmptyState icon={Inbox} title={t('admin.buyers.noBuyers')} />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.buyers.name')}</TableHead>
                      <TableHead>{t('admin.buyers.company')}</TableHead>
                      <TableHead>{t('admin.buyers.type')}</TableHead>
                      <TableHead>{t('admin.agents.district')}</TableHead>
                      <TableHead>{t('admin.buyers.orders')}</TableHead>
                      <TableHead>{t('admin.buyers.orders')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBuyers.map((buyer) => (
                      <TableRow key={buyer.id}>
                        <TableCell className="font-medium">
                          {buyer.name}
                        </TableCell>
                        <TableCell>
                          {buyer.company_name ? (
                            <div className="flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              {buyer.company_name}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {buyerTypeLabel(buyer.buyer_type || 'retail')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="w-3 h-3" />
                            {buyer.district || t('admin.buyers.unknown')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            <Package className="w-3 h-3 mr-1" />
                            {buyer.totalOrders}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={buyer.activeOrders > 0 ? 'default' : 'outline'}>
                            {buyer.activeOrders}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </PageShell>
    </DashboardLayout>
  );
};

export default AdminBuyers;
