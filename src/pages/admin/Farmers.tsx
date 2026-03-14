import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MapPin, Sprout, LandPlot, Inbox } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { useAllFarmers } from '@/hooks/useAdminDashboard';
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

const AdminFarmers = () => {
  const { t } = useLanguage();
  const { data: farmers, isLoading } = useAllFarmers();
  const [search, setSearch] = useState('');

  const filteredFarmers = farmers?.filter(f => 
    f.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    f.village?.toLowerCase().includes(search.toLowerCase()) ||
    f.district?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <DashboardLayout title={t('admin.farmers.title')}>
      <PageShell
        title={t('admin.farmers.title')}
        subtitle={t('admin.farmers.subtitle')}
        actions={
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('admin.farmers.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.farmers.allFarmers')} ({filteredFarmers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredFarmers.length === 0 ? (
                <EmptyState icon={Inbox} title={t('admin.farmers.noFarmers')} />
            ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.farmers.name')}</TableHead>
                        <TableHead>{t('admin.farmers.phone')}</TableHead>
                        <TableHead>{t('admin.farmers.location')}</TableHead>
                        <TableHead>{t('admin.farmers.land')}</TableHead>
                        <TableHead>{t('admin.farmers.activeCrops')}</TableHead>
                        <TableHead>{t('admin.farmers.registered')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFarmers.map((farmer) => (
                        <TableRow key={farmer.id}>
                          <TableCell className="font-medium">
                            {farmer.full_name || t('admin.farmers.unnamed')}
                          </TableCell>
                          <TableCell>{farmer.phone || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="w-3 h-3" />
                              {farmer.village || farmer.district || t('admin.farmers.unknown')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <LandPlot className="w-3 h-3" />
                              {farmer.totalLand?.toFixed(1) || '0'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                              <Sprout className="w-3 h-3" />
                              {farmer.cropCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(farmer.created_at).toLocaleDateString()}
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

export default AdminFarmers;
